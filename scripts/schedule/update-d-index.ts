import { PrismaClient } from "../../shared/generated/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const FT_DEFAULT = 13.46;
const CTw_DEFAULT = 1.0;
const MTw_DEFAULT = 1.0;

function datasetIndexSingle(
  Fi: number,
  Ciw: number,
  Miw: number,
  FT: number,
  CTw: number,
  MTw: number,
): number {
  const ft = FT > 0 ? FT : FT_DEFAULT;
  const ctw = CTw > 0 ? CTw : CTw_DEFAULT;
  const mtw = MTw > 0 ? MTw : MTw_DEFAULT;

  return (Fi / ft + Ciw / ctw + Miw / mtw) / 3.0;
}

function computeDIndexTimeSeries(
  Fi: number,
  citations: { year: number; weight: number }[],
  mentions: { year: number; weight: number }[],
  pubyear: number | null,
  FT: number,
  CTw: number,
  MTw: number,
): { year: number; score: number }[] {
  const events: {
    year: number;
    type: "citation" | "mention";
    weight: number;
  }[] = [];

  for (const c of citations) {
    events.push({ year: c.year, type: "citation", weight: c.weight });
  }
  for (const m of mentions) {
    events.push({ year: m.year, type: "mention", weight: m.weight });
  }
  events.sort((a, b) => a.year - b.year);

  const currentYear = new Date().getUTCFullYear();

  const evalYearSet = new Set<number>();
  if (pubyear !== null) evalYearSet.add(pubyear);
  for (const e of events) evalYearSet.add(e.year);

  let evalYears: number[];
  if (evalYearSet.size === 0) {
    evalYears = [currentYear];
  } else if (pubyear !== null) {
    const rest = [...evalYearSet]
      .filter((y) => y !== pubyear)
      .sort((a, b) => a - b);
    evalYears = [pubyear, ...rest];
  } else {
    evalYears = [...evalYearSet].sort((a, b) => a - b);
  }

  const results: { year: number; score: number }[] = [];
  let ciw = 0.0;
  let miw = 0.0;
  let eventIdx = 0;

  for (const yr of evalYears) {
    while (eventIdx < events.length && events[eventIdx].year <= yr) {
      const e = events[eventIdx];
      if (e.type === "citation") ciw += e.weight;
      else miw += e.weight;
      eventIdx++;
    }
    results.push({
      year: yr,
      score: datasetIndexSingle(Fi, ciw, miw, FT, CTw, MTw),
    });
  }

  return results;
}

async function claimNextJob(): Promise<number | null> {
  const rows = await prisma.$queryRaw<{ datasetId: number }[]>`
    DELETE FROM "DIndexJob"
    WHERE "datasetId" = (
      SELECT "datasetId" FROM "DIndexJob"
      ORDER BY "created" ASC
      LIMIT 1
      FOR UPDATE SKIP LOCKED
    )
    RETURNING "datasetId"
  `;

  return rows.length > 0 ? Number(rows[0].datasetId) : null;
}

async function processDataset(datasetId: number): Promise<void> {
  const dataset = await prisma.dataset.findUnique({
    where: { id: datasetId },
    select: {
      publishedAt: true,
      fujiScore: { select: { score: true } },
      citations: { select: { citedDate: true, citationWeight: true } },
      mentions: { select: { mentionedDate: true, mentionWeight: true } },
      normalizationFactor: { select: { ft: true, ctw: true, mtw: true } },
      automatedUserDatasets: { select: { automatedUserId: true } },
      automatedOrganizationDatasets: {
        select: { automatedOrganizationId: true },
      },
    },
  });

  if (!dataset) {
    console.warn(`Dataset ${datasetId} not found, skipping`);

    return;
  }

  const Fi = Math.max(0, Math.min(100, dataset.fujiScore?.score ?? 0));
  const pubyear = dataset.publishedAt
    ? dataset.publishedAt.getUTCFullYear()
    : null;

  const normFactor = dataset.normalizationFactor;
  const FT =
    normFactor?.ft != null && normFactor.ft > 0 ? normFactor.ft : FT_DEFAULT;
  const CTw =
    normFactor?.ctw != null && normFactor.ctw > 0
      ? normFactor.ctw
      : CTw_DEFAULT;
  const MTw =
    normFactor?.mtw != null && normFactor.mtw > 0
      ? normFactor.mtw
      : MTw_DEFAULT;

  const currentYear = new Date().getUTCFullYear();

  const citations = dataset.citations.map((c) => ({
    year: c.citedDate ? c.citedDate.getUTCFullYear() : currentYear,
    weight: c.citationWeight,
  }));

  const mentions = dataset.mentions.map((m) => ({
    year: m.mentionedDate ? m.mentionedDate.getUTCFullYear() : currentYear,
    weight: m.mentionWeight,
  }));

  const series = computeDIndexTimeSeries(
    Fi,
    citations,
    mentions,
    pubyear,
    FT,
    CTw,
    MTw,
  );

  // order by year asc, then delete existing and insert new
  series.sort((a, b) => a.year - b.year);

  const automatedUserIds = dataset.automatedUserDatasets.map(
    (r) => r.automatedUserId,
  );
  const automatedOrgIds = dataset.automatedOrganizationDatasets.map(
    (r) => r.automatedOrganizationId,
  );

  await prisma.$transaction(
    [
      prisma.dIndex.deleteMany({ where: { datasetId } }),
      prisma.dIndex.createMany({
        data: series.map(({ year, score }) => ({ datasetId, score, year })),
      }),
    ],
    { timeout: 60000 },
  );

  console.log(
    `Updated d-index for dataset ${datasetId} with ${series.length} entries`,
  );

  if (automatedUserIds.length > 0) {
    await prisma.automatedUserSIndexJob.createMany({
      data: automatedUserIds.map((id) => ({ automatedUserId: id })),
      skipDuplicates: true,
    });
  }

  if (automatedOrgIds.length > 0) {
    await prisma.automatedOrganizationSIndexJob.createMany({
      data: automatedOrgIds.map((id) => ({
        automatedOrganizationId: id,
      })),
      skipDuplicates: true,
    });
  }

  console.log(
    `Queued s-index jobs for ${automatedUserIds.length} automated users and ${automatedOrgIds.length} automated organizations`,
  );

  console.log(`Finished processing dataset ${datasetId}`);
}

async function main() {
  const total = await prisma.dIndexJob.count();
  console.log(`Starting d-index calculation... ${total.toLocaleString()} jobs`);

  if (total === 0) {
    console.log("No jobs to process.");

    return;
  }

  let processed = 0;
  let failed = 0;
  const startTime = Date.now();

  while (true) {
    const datasetId = await claimNextJob();
    if (datasetId === null) break;

    try {
      await processDataset(datasetId);
      processed++;
    } catch (error) {
      failed++;
      console.error(`Failed dataset ${datasetId}:`, error);
    }

    const done = processed + failed;
    const pct = ((done / total) * 100).toFixed(1);
    console.log(`[${pct}%] ${done.toLocaleString()}/${total.toLocaleString()}`);
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`Done. ${processed} processed, ${failed} failed in ${elapsed}s`);
}

main()
  .catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

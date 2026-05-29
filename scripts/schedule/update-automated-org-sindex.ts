import { PrismaClient } from "../../shared/generated/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

function effectiveScoreForYear(
  sortedYearScores: { year: number; score: number }[],
  targetYear: number,
): number {
  let bestScore = 0.0;
  for (const { year, score } of sortedYearScores) {
    if (year <= targetYear) {
      bestScore = score;
    } else {
      break;
    }
  }

  return bestScore;
}

function computeSIndexTimeSeries(
  datasetDIndexMap: Map<number, { year: number; score: number }[]>,
): { year: number; score: number }[] {
  const currentYear = new Date().getUTCFullYear();

  let minYear: number | null = null;
  let maxYear: number | null = null;

  for (const scores of datasetDIndexMap.values()) {
    if (scores.length === 0) continue;
    const datasetMin = scores[0].year;
    const datasetMax = scores[scores.length - 1].year;
    if (minYear === null || datasetMin < minYear) minYear = datasetMin;
    if (maxYear === null || datasetMax > maxYear) maxYear = datasetMax;
  }

  if (minYear === null || maxYear === null) return [];

  const endYear = Math.min(currentYear - 1, maxYear);
  if (minYear > endYear) return [];

  const results: { year: number; score: number }[] = [];
  for (let year = minYear; year <= endYear; year++) {
    let total = 0.0;
    for (const scores of datasetDIndexMap.values()) {
      total += effectiveScoreForYear(scores, year);
    }
    results.push({ year, score: total });
  }

  return results;
}

async function claimNextJob(): Promise<number | null> {
  const rows = await prisma.$queryRaw<{ automatedOrganizationId: number }[]>`
    DELETE FROM "AutomatedOrganizationSIndexJob"
    WHERE "automatedOrganizationId" = (
      SELECT "automatedOrganizationId" FROM "AutomatedOrganizationSIndexJob"
      ORDER BY "created" ASC
      LIMIT 1
      FOR UPDATE SKIP LOCKED
    )
    RETURNING "automatedOrganizationId"
  `;

  return rows.length > 0 ? Number(rows[0].automatedOrganizationId) : null;
}

async function processAutomatedOrg(
  automatedOrganizationId: number,
): Promise<void> {
  const orgDatasets = await prisma.automatedOrganizationDataset.findMany({
    where: { automatedOrganizationId },
    select: { datasetId: true },
  });

  if (orgDatasets.length === 0) {
    await prisma.automatedOrganizationSIndex.deleteMany({
      where: { automatedOrganizationId },
    });

    return;
  }

  const datasetIds = orgDatasets.map((r) => r.datasetId);

  const dindexRecords = await prisma.dIndex.findMany({
    where: { datasetId: { in: datasetIds } },
    select: { datasetId: true, year: true, score: true },
    orderBy: { year: "asc" },
  });

  const datasetDIndexMap = new Map<number, { year: number; score: number }[]>();
  for (const record of dindexRecords) {
    const existing = datasetDIndexMap.get(record.datasetId);
    if (existing) {
      existing.push({ year: record.year, score: record.score });
    } else {
      datasetDIndexMap.set(record.datasetId, [
        { year: record.year, score: record.score },
      ]);
    }
  }

  const series = computeSIndexTimeSeries(datasetDIndexMap);

  // sort by year just in case
  series.sort((a, b) => a.year - b.year);

  await prisma.$transaction([
    prisma.automatedOrganizationSIndex.deleteMany({
      where: { automatedOrganizationId },
    }),
    ...(series.length > 0
      ? [
          prisma.automatedOrganizationSIndex.createMany({
            data: series.map(({ year, score }) => ({
              automatedOrganizationId,
              score,
              year,
            })),
          }),
        ]
      : []),
  ]);
}

async function main() {
  const total = await prisma.automatedOrganizationSIndexJob.count();
  console.log(
    `Starting automated organization s-index calculation... ${total.toLocaleString()} jobs`,
  );

  if (total === 0) {
    console.log("No jobs to process.");

    return;
  }

  let processed = 0;
  let failed = 0;
  const startTime = Date.now();

  while (true) {
    const automatedOrganizationId = await claimNextJob();
    if (automatedOrganizationId === null) break;

    try {
      await processAutomatedOrg(automatedOrganizationId);
      processed++;
    } catch (error) {
      failed++;
      console.error(
        `Failed automated organization ${automatedOrganizationId}:`,
        error,
      );
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

import { PrismaClient } from "../../shared/generated/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";
import { notifyRunFailure, notifyRunSummary } from "./notify-discord";

const JOB_NAME = "Platform metrics update";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const FIRST_YEAR = 1950;
const FIRST_SINGLE_YEAR = 2011;
const EARLY_BUCKET = `${FIRST_YEAR}-${FIRST_SINGLE_YEAR - 1}`;

type NamedCount = { name: string; value: number };

// Keep the top N named groups and fold the rest (plus any existing
// "Other" or blank group) into a trailing "Other"
function topWithOther(rows: NamedCount[], topN: number): NamedCount[] {
  if (rows.length === 0) return [{ name: "Other", value: 0 }];

  const named: NamedCount[] = [];
  let otherSum = 0;

  for (const r of rows) {
    if (!r.name || r.name === "Other") otherSum += r.value;
    else named.push(r);
  }

  const top = named.slice(0, topN);
  otherSum += named.slice(topN).reduce((sum, r) => sum + r.value, 0);
  if (otherSum > 0) top.push({ name: "Other", value: otherSum });

  return top;
}

function toNamedCounts(rows: { name: string; value: bigint }[]): NamedCount[] {
  return rows.map((r) => ({ name: r.name, value: Number(r.value) }));
}

async function datasetsByYear() {
  const currentYear = new Date().getUTCFullYear();

  const rows = await prisma.$queryRaw<{ year: string; value: bigint }[]>`
    SELECT
      CASE
        WHEN d."pubYear" < ${FIRST_SINGLE_YEAR} THEN ${EARLY_BUCKET}
        ELSE d."pubYear"::text
      END AS year,
      COUNT(*) AS value
    FROM "Dataset" d
    WHERE d."pubYear" BETWEEN ${FIRST_YEAR} AND ${currentYear}
    GROUP BY 1
  `;

  const byYear = new Map(rows.map((r) => [r.year, Number(r.value)]));
  const buckets = [EARLY_BUCKET];
  for (let y = FIRST_SINGLE_YEAR; y <= currentYear; y++) {
    buckets.push(String(y));
  }

  return buckets.map((year) => ({ year, value: byYear.get(year) ?? 0 }));
}

async function institutions(topN: number) {
  const rows = await prisma.$queryRaw<{ name: string; value: bigint }[]>`
    SELECT o.name, COUNT(aod."datasetId") AS value
    FROM "AutomatedOrganization" o
    JOIN "AutomatedOrganizationDataset" aod ON aod."automatedOrganizationId" = o.id
    GROUP BY o.id, o.name
    ORDER BY value DESC
  `;

  return topWithOther(toNamedCounts(rows), topN);
}

async function fields(topN: number) {
  const rows = await prisma.$queryRaw<{ name: string; value: bigint }[]>`
    SELECT COALESCE(NULLIF(TRIM(dt."fieldName"), ''), 'Other') AS name, COUNT(*) AS value
    FROM "DatasetTopic" dt
    WHERE dt."fieldName" IS NOT NULL
    GROUP BY 1
    ORDER BY value DESC
  `;

  return topWithOther(toNamedCounts(rows), topN);
}

async function publishers(topN: number) {
  const rows = await prisma.$queryRaw<{ name: string; value: bigint }[]>`
    SELECT COALESCE(NULLIF(TRIM(d."publisher"), ''), 'Other') AS name, COUNT(*) AS value
    FROM "Dataset" d
    WHERE d."publisher" IS NOT NULL
    GROUP BY 1
    ORDER BY value DESC
  `;

  return topWithOther(toNamedCounts(rows), topN);
}

async function licenses(topN: number) {
  const rows = await prisma.$queryRaw<{ name: string; value: bigint }[]>`
    SELECT COALESCE(NULLIF(TRIM(dr."identifier"), ''), 'Other') AS name, COUNT(*) AS value
    FROM "DatasetRights" dr
    WHERE dr."identifier" IS NOT NULL
    GROUP BY 1
    ORDER BY value DESC
  `;

  return topWithOther(toNamedCounts(rows), topN);
}

async function counts() {
  const [
    datasets,
    citations,
    mentions,
    fairScores,
    researchFields,
    datasetIndices,
    generatedProfiles,
  ] = await Promise.all([
    prisma.dataset.count(),
    prisma.citation.count(),
    prisma.mention.count(),
    prisma.fujiScore.count(),
    prisma.datasetTopic.count({ where: { fieldName: { not: null } } }),
    prisma.dIndex.count(),
    prisma.automatedUser.count(),
  ]);

  return {
    datasets,
    citations,
    mentions,
    fairScores,
    researchFields,
    datasetIndices,
    generatedProfiles,
  };
}

async function timed<T>(label: string, fn: () => Promise<T>): Promise<T> {
  const start = Date.now();
  console.log(`Computing ${label}...`);
  const result = await fn();
  console.log(
    `Computed ${label} in ${((Date.now() - start) / 1000).toFixed(1)}s`,
  );

  return result;
}

async function main() {
  const startTime = Date.now();

  // Run sequentially so we don't hit the database with several full scans at once
  const metrics: Record<string, unknown> = {
    counts: await timed("counts", counts),
    datasetsByYear: await timed("datasets by year", datasetsByYear),
    institutions: await timed("institutions", () => institutions(12)),
    fields: await timed("fields", () => fields(10)),
    publishers: await timed("publishers", () => publishers(10)),
    licenses: await timed("licenses", () => licenses(10)),
  };

  await prisma.$transaction(
    Object.entries(metrics).map(([key, value]) =>
      prisma.platformMetric.upsert({
        where: { key },
        create: { key, value: value as object },
        update: { value: value as object },
      }),
    ),
  );

  const elapsedSeconds = (Date.now() - startTime) / 1000;
  console.log(
    `Done. Updated ${Object.keys(metrics).length} metrics in ${elapsedSeconds.toFixed(1)}s`,
  );

  await notifyRunSummary(JOB_NAME, "Platform metrics refreshed.", {
    Metrics: Object.keys(metrics).length,
    Datasets: (metrics.counts as { datasets: number }).datasets,
    Duration: `${elapsedSeconds.toFixed(1)}s`,
  });
}

main()
  .catch(async (err) => {
    console.error("Fatal error:", err);
    await notifyRunFailure(JOB_NAME, err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

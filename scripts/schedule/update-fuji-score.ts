import { PrismaClient } from "../../shared/generated/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const FUJI_BASE_URL = process.env.FUJI_URL ?? "http://localhost:1071";
const FUJI_EVALUATE_URL = `${FUJI_BASE_URL}/fuji/api/v1/evaluate`;
const FUJI_HEALTH_URL = `${FUJI_BASE_URL}/fuji/api/v1/`;
const FUJI_USERNAME = process.env.FUJI_USERNAME ?? "marvel";
const FUJI_PASSWORD = process.env.FUJI_PASSWORD ?? "wonderwoman";
const FUJI_AUTH = `Basic ${Buffer.from(`${FUJI_USERNAME}:${FUJI_PASSWORD}`).toString("base64")}`;

const HARDCODED_DOI_SCORES: Record<string, number> = {
  "10.57451/": 63.46,
};

const HEALTH_CHECK_INTERVAL_MS = 10_000;
const HEALTH_CHECK_ATTEMPTS = 10;

interface FujiEvaluateResponse {
  summary: {
    score_percent: {
      FAIR: number;
    };
  };
  end_timestamp: string;
  metric_version: string;
  software_version: string;
}

async function waitForFujiService(): Promise<void> {
  console.log(`Checking FUJI service at ${FUJI_BASE_URL}...`);

  for (let attempt = 1; attempt <= HEALTH_CHECK_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(FUJI_HEALTH_URL);
      if (res.ok || res.status < 500) {
        console.log(`FUJI service is ready (attempt ${attempt})`);

        return;
      }
      console.log(
        `Attempt ${attempt}/${HEALTH_CHECK_ATTEMPTS}: service returned ${res.status}, retrying...`,
      );
    } catch {
      console.log(
        `Attempt ${attempt}/${HEALTH_CHECK_ATTEMPTS}: service unreachable, retrying...`,
      );
    }

    if (attempt < HEALTH_CHECK_ATTEMPTS) {
      await new Promise((resolve) =>
        setTimeout(resolve, HEALTH_CHECK_INTERVAL_MS),
      );
    }
  }

  throw new Error(
    `FUJI service did not become ready after ${HEALTH_CHECK_ATTEMPTS} attempts`,
  );
}

async function claimNextJob(): Promise<number | null> {
  const rows = await prisma.$queryRaw<{ datasetId: number }[]>`
    DELETE FROM "FujiJob"
    WHERE "datasetId" = (
      SELECT "datasetId" FROM "FujiJob"
      ORDER BY "created" ASC
      LIMIT 1
      FOR UPDATE SKIP LOCKED
    )
    RETURNING "datasetId"
  `;

  return rows.length > 0 ? Number(rows[0].datasetId) : null;
}

async function evaluateDataset(datasetId: number): Promise<void> {
  const dataset = await prisma.dataset.findUnique({
    where: { id: datasetId },
    select: { identifier: true, identifierType: true },
  });

  if (!dataset) {
    console.warn(`Dataset ${datasetId} not found, skipping`);

    return;
  }

  if (dataset.identifierType !== "doi") {
    console.warn(
      `Dataset ${datasetId} has identifierType "${dataset.identifierType}", skipping (only DOI supported)`,
    );

    return;
  }

  const matchedPrefix = Object.keys(HARDCODED_DOI_SCORES).find((prefix) =>
    dataset.identifier.startsWith(prefix),
  );

  if (matchedPrefix !== undefined) {
    const evaluationDate = new Date();
    const metricVersion = "estimated";
    const softwareVersion = "extrapolated";
    const score = HARDCODED_DOI_SCORES[matchedPrefix];

    await prisma.fujiScore.upsert({
      where: { datasetId },
      create: {
        datasetId,
        score,
        evaluationDate,
        metricVersion,
        softwareVersion,
      },
      update: { score, evaluationDate, metricVersion, softwareVersion },
    });

    await prisma.dIndexJob.upsert({
      where: { datasetId },
      create: { datasetId },
      update: {},
    });

    console.log(
      `Scored dataset ${datasetId} (${dataset.identifier}): ${score.toFixed(2)} [hardcoded for ${matchedPrefix} prefix]`,
    );

    return;
  }

  const response = await fetch(FUJI_EVALUATE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: FUJI_AUTH },
    body: JSON.stringify({
      object_identifier: dataset.identifier,
      test_debug: true,
      use_datacite: true,
      use_github: false,
      metric_version: "metrics_v0.8",
    }),
    signal: AbortSignal.timeout(120_000),
  });

  if (!response.ok) {
    throw new Error(
      `FUJI returned ${response.status} for dataset ${datasetId}`,
    );
  }

  const data = (await response.json()) as FujiEvaluateResponse;

  const score = data?.summary?.score_percent?.FAIR;
  if (score === undefined || score === null) {
    throw new Error(`No FAIR score in FUJI response for dataset ${datasetId}`);
  }

  const evaluationDate = data.end_timestamp
    ? new Date(data.end_timestamp)
    : new Date();

  // const metricVersion = data.metric_version ?? "metrics_v0.8";
  // const softwareVersion = data.software_version ?? "unknown";

  const metricVersion = "extrapolation_test";
  const softwareVersion = "extrapolation_test";

  await prisma.fujiScore.upsert({
    where: { datasetId },
    create: {
      datasetId,
      score: parseFloat(String(score)),
      evaluationDate,
      metricVersion,
      softwareVersion,
    },
    update: {
      score: parseFloat(String(score)),
      evaluationDate,
      metricVersion,
      softwareVersion,
    },
  });

  await prisma.dIndexJob.upsert({
    where: { datasetId },
    create: { datasetId },
    update: {},
  });

  console.log(
    `Scored dataset ${datasetId} (${dataset.identifier}): ${score.toFixed(2)}`,
  );
}

async function main() {
  await waitForFujiService();

  const total = await prisma.fujiJob.count();
  console.log(
    `Starting FUJI score calculation... ${total.toLocaleString()} jobs`,
  );

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
      await evaluateDataset(datasetId);
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

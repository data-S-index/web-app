import * as readline from "readline";
import * as fsSync from "fs";
import { PrismaClient } from "../../shared/generated/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });

interface NdjsonRecord {
  dataset_id: string;
  score: number;
  evaluationDate: string;
  metricVersion: string;
  softwareVersion: string;
}

const NDJSON_FILE = "./fair_score_sparc.ndjson";

async function processRecords() {
  const fileStream = fsSync.createReadStream(NDJSON_FILE);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  let processed = 0;
  let skipped = 0;
  let errors = 0;

  for await (const line of rl) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    let record: NdjsonRecord;
    try {
      record = JSON.parse(trimmed);
    } catch {
      console.error(`Failed to parse line: ${trimmed}`);
      errors++;
      continue;
    }

    const {
      dataset_id,
      score,
      evaluationDate,
      metricVersion,
      softwareVersion,
    } = record;

    const dataset = await prisma.dataset.findFirst({
      where: { identifier: dataset_id },
      select: { id: true },
    });

    if (!dataset) {
      console.warn(`No dataset found for identifier: ${dataset_id}`);
      skipped++;
      continue;
    }

    const existing = await prisma.fujiScore.findUnique({
      where: { datasetId: dataset.id },
    });

    if (!existing) {
      console.error(
        `No FujiScore record found for dataset ${dataset_id} (id: ${dataset.id}) — skipping`,
      );
      skipped++;
      continue;
    }

    await prisma.fujiScore.update({
      where: { datasetId: dataset.id },
      data: {
        score,
        evaluationDate: new Date(evaluationDate),
        metricVersion,
        softwareVersion,
      },
    });

    await prisma.DIndexJob.create({
      data: {
        datasetId: dataset.id,
      },
    });

    console.log(
      `Updated FujiScore for dataset ${dataset_id} (id: ${dataset.id})`,
    );
    processed++;
  }

  console.log(
    `\nDone. processed=${processed}, skipped=${skipped}, errors=${errors}`,
  );
}

processRecords()
  .catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

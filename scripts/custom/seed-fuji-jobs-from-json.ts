import * as fs from "fs";
import * as path from "path";
import { PrismaClient } from "../../shared/generated/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });

const INPUT_FILE = path.join(__dirname, "../../fair-scores-bf-discover.json");

interface InputRecord {
  datasetId: number;
  identifier: string;
  title: string;
  fairScore: number | null;
}

const seedJobs = async () => {
  const raw = fs.readFileSync(INPUT_FILE, "utf-8");
  const records: InputRecord[] = JSON.parse(raw);
  const datasetIds = records.map((r) => r.datasetId);
  const totalCount = datasetIds.length;

  if (totalCount === 0) {
    console.log(`\n⚠️  No records found in ${INPUT_FILE}\n`);
    return;
  }

  console.log(
    `\n🌱 Seeding FujiJob rows for ${totalCount.toLocaleString()} dataset ids from ${INPUT_FILE}\n`,
  );

  const insertBatchSize = 1000;
  let totalProcessed = 0;
  const startTime = Date.now();
  const barLength = 40;

  for (let i = 0; i < datasetIds.length; i += insertBatchSize) {
    const batch = datasetIds.slice(i, i + insertBatchSize);
    const batchData = batch.map((datasetId) => ({ datasetId }));

    try {
      await prisma.fujiJob.createMany({
        data: batchData,
        skipDuplicates: true,
      });
    } catch (error) {
      console.error(
        `\n❌ Error inserting batch starting at index ${i}:`,
        error,
      );
    }

    totalProcessed += batch.length;
    const progress = (totalProcessed / totalCount) * 100;
    const filled = Math.round((progress / 100) * barLength);
    const empty = barLength - filled;
    const bar = "█".repeat(filled) + "░".repeat(empty);
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    const rate = totalProcessed / (parseFloat(elapsed) || 1);
    const remaining = totalCount - totalProcessed;
    const eta = remaining / rate;

    process.stdout.write(
      `\r${bar} ${progress.toFixed(1)}% | ${totalProcessed.toLocaleString()}/${totalCount.toLocaleString()} | ⏱️  ${elapsed}s | ETA: ${eta.toFixed(1)}s`,
    );
  }

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(
    `\n\n✅ Successfully seeded ${totalProcessed.toLocaleString()} jobs in ${totalTime}s\n`,
  );
};

seedJobs()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

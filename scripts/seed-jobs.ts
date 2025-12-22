import { PrismaClient } from "../shared/generated/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });

const seedJobs = async () => {
  // Configuration
  const fetchBatchSize = 10000; // Number of records to fetch from DB per round
  const insertBatchSize = 1000; // Number of records to insert per batch
  let lastId = 0; // Cursor for pagination
  let totalProcessed = 0;
  let roundNumber = 0;

  // First, get the total count for progress tracking
  const totalCount = await prisma.dataset.count({
    where: {
      fujiScore: null,
    },
  });

  console.log(`\n🌱 Seeding jobs from ${totalCount.toLocaleString()} datasets`);
  console.log(`   Fetch batch size: ${fetchBatchSize.toLocaleString()}`);
  console.log(`   Insert batch size: ${insertBatchSize.toLocaleString()}\n`);

  const startTime = Date.now();
  const barLength = 40;

  // Process in rounds until all records are processed
  while (true) {
    roundNumber++;

    // Fetch a batch of datasets using cursor-based pagination
    const datasets = await prisma.dataset.findMany({
      where: {
        fujiScore: null,
        id: {
          gt: lastId, // Only get records with ID greater than the last processed ID
        },
      },
      take: fetchBatchSize,
      orderBy: {
        id: "asc", // Important: order by ID for cursor pagination
      },
      select: {
        id: true, // Only select the ID field to reduce memory usage
      },
    });

    // If no more records, we're done
    if (datasets.length === 0) {
      break;
    }

    console.log(
      `\n📦 Round ${roundNumber}: Processing ${datasets.length.toLocaleString()} datasets...`,
    );

    // Process this batch in smaller insert batches
    for (let i = 0; i < datasets.length; i += insertBatchSize) {
      const batch = datasets.slice(i, i + insertBatchSize);
      const batchData = batch.map((dataset) => ({
        datasetId: dataset.id,
      }));

      try {
        await prisma.fujiJob.createMany({
          data: batchData,
          skipDuplicates: true, // Skip if job already exists
        });
      } catch (error) {
        console.error(
          `\n❌ Error inserting batch starting at index ${i}:`,
          error,
        );
        // Continue with next batch even if one fails
      }

      // Update lastId for next round
      lastId = Math.max(...batch.map((d) => d.id));

      // Update progress
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
        `\r${bar} ${progress.toFixed(1)}% | ${totalProcessed.toLocaleString()}/${totalCount.toLocaleString()} | ⏱️  ${elapsed}s | ETA: ${eta.toFixed(1)}s | Round ${roundNumber}`,
      );
    }

    // If we got fewer records than requested, we've reached the end
    if (datasets.length < fetchBatchSize) {
      break;
    }
  }

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(
    `\n\n✅ Successfully seeded ${totalProcessed.toLocaleString()} jobs in ${totalTime}s across ${roundNumber} rounds\n`,
  );
};

const main = async () => {
  // truncate the fuji_jobs table
  await prisma.$executeRaw`TRUNCATE TABLE "FujiJob" RESTART IDENTITY CASCADE`;

  await seedJobs();
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

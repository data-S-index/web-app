import { PrismaClient } from "../shared/generated/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });

const seedJobs = async () => {
  const datasets = await prisma.dataset.findMany({
    where: {
      fujiScore: null,
    },
    take: 500000,
  });

  const total = datasets.length;
  console.log(`\n🌱 Seeding ${total} jobs...\n`);

  const startTime = Date.now();
  const barLength = 40;

  for (let i = 0; i < datasets.length; i++) {
    const dataset = datasets[i];
    await prisma.fujiJob.create({
      data: {
        id: i + 1,
        datasetId: dataset.id,
      },
    });

    // Update progress
    const progress = ((i + 1) / total) * 100;
    const filled = Math.round((progress / 100) * barLength);
    const empty = barLength - filled;
    const bar = "█".repeat(filled) + "░".repeat(empty);
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    const rate = (i + 1) / (elapsed as unknown as number);
    const remaining = total - (i + 1);
    const eta = remaining / rate;

    process.stdout.write(
      `\r${bar} ${progress.toFixed(1)}% | ${i + 1}/${total} | ⏱️  ${elapsed}s | ETA: ${eta.toFixed(1)}s`,
    );
  }

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n\n✅ Successfully seeded ${total} jobs in ${totalTime}s\n`);
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

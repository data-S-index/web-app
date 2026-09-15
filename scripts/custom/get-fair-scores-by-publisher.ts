import * as fs from "fs";
import * as path from "path";
import { PrismaClient } from "../../shared/generated/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });

// Dataset.publisherId value to pull FAIR scores for
const PUBLISHER_ID = "bf.discover";

const OUTPUT_FILE = path.join(__dirname, "fair-scores-bf-discover.json");

interface ResultRecord {
  datasetId: number;
  identifier: string;
  title: string;
  fairScore: number | null;
}

const main = async () => {
  const fetchBatchSize = 5000;
  let lastId = 0;
  let totalProcessed = 0;

  const where = { publisherId: PUBLISHER_ID };

  const totalCount = await prisma.dataset.count({ where });

  console.log(
    `\n🔍 Fetching FAIR scores for ${totalCount.toLocaleString()} datasets with publisherId="${PUBLISHER_ID}"\n`,
  );

  const results: ResultRecord[] = [];
  const startTime = Date.now();
  const barLength = 40;

  while (true) {
    const datasets = await prisma.dataset.findMany({
      where: {
        ...where,
        id: { gt: lastId },
      },
      take: fetchBatchSize,
      orderBy: { id: "asc" },
      select: {
        id: true,
        identifier: true,
        title: true,
        fujiScore: {
          select: { score: true },
        },
      },
    });

    if (datasets.length === 0) {
      break;
    }

    for (const dataset of datasets) {
      results.push({
        datasetId: dataset.id,
        identifier: dataset.identifier,
        title: dataset.title,
        fairScore: dataset.fujiScore?.score ?? null,
      });
    }

    lastId = datasets[datasets.length - 1].id;
    totalProcessed += datasets.length;

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

    if (datasets.length < fetchBatchSize) {
      break;
    }
  }

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(results, null, 2));

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
  const withScore = results.filter((r) => r.fairScore !== null).length;
  console.log(
    `\n\n✅ Wrote ${results.length.toLocaleString()} records (${withScore.toLocaleString()} with a FAIR score) in ${totalTime}s to ${OUTPUT_FILE}\n`,
  );
};

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

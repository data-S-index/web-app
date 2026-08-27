import { Meilisearch } from "meilisearch";
import { PrismaClient } from "../../shared/generated/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";

const { MEILISEARCH_API_KEY, MEILISEARCH_API_URL } = process.env;

if (!MEILISEARCH_API_KEY || !MEILISEARCH_API_URL) {
  console.error(
    "Error: MEILISEARCH_API_KEY and MEILISEARCH_API_URL must be set in environment variables",
  );
  process.exit(1);
}

const client = new Meilisearch({
  host: MEILISEARCH_API_URL.replace(/\/$/, ""),
  apiKey: MEILISEARCH_API_KEY,
});

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });

const index = client.index("dataset");

// Small documents ({id, publisher}) so a large batch keeps the total task
// count manageable at 70M rows without bloating request payload size.
const DB_BATCH_SIZE = Number(process.env.BACKFILL_BATCH_SIZE) || 10_000;
// Caps concurrent in-flight HTTP calls to Meilisearch/Postgres, not the
// server-side task queue (Meilisearch processes tasks sequentially anyway).
const CONCURRENCY = Number(process.env.BACKFILL_CONCURRENCY) || 3;
// Set to resume after a crash instead of restarting from id 0.
const START_ID = Number(process.env.BACKFILL_START_ID) || 0;

type FailedBatch = { fromId: number; toId: number; error: string };

async function updateBatchWithRetry(
  documents: { id: number; publisher: string | null }[],
  fromId: number,
  toId: number,
  failedBatches: FailedBatch[],
) {
  const delays = [500, 2000, 8000];

  for (let attempt = 0; attempt <= delays.length; attempt++) {
    try {
      // updateDocuments merges fields by primary key, unlike addDocuments
      // which would overwrite the whole document and drop every other
      // field the existing (unrelated) indexing pipeline already set.
      await index.updateDocuments(documents);
      return;
    } catch (err) {
      if (attempt === delays.length) {
        failedBatches.push({
          fromId,
          toId,
          error: err instanceof Error ? err.message : String(err),
        });
        console.error(`Batch [${fromId}-${toId}] failed after retries:`, err);
        return;
      }
      await new Promise((r) => setTimeout(r, delays[attempt]));
    }
  }
}

async function main() {
  const totalDbCount = await prisma.dataset.count();
  const stats = await index.getStats();

  console.log(
    `Postgres has ${totalDbCount} datasets; Meilisearch 'dataset' index has ${stats.numberOfDocuments} documents.`,
  );
  if (Math.abs(totalDbCount - stats.numberOfDocuments) / totalDbCount > 0.01) {
    console.warn(
      "WARNING: document counts differ by more than 1%. updateDocuments() will create sparse " +
        "documents (only {id, publisher}) for any DB row not already indexed. Investigate before proceeding.",
    );
  }

  const currentSearchable = await index.getSearchableAttributes();
  const needsSettingsUpdate = !currentSearchable.includes("publisher");

  console.log(`Backfilling publisher onto 'dataset' index, starting after id ${START_ID}...`);

  let cursorId = START_ID;
  let processed = 0;
  const failedBatches: FailedBatch[] = [];
  const inFlight = new Set<Promise<void>>();
  const startTime = Date.now();
  const runStartIso = new Date(startTime).toISOString();

  while (true) {
    const rows = await prisma.dataset.findMany({
      where: { id: { gt: cursorId } },
      orderBy: { id: "asc" },
      take: DB_BATCH_SIZE,
      select: { id: true, publisher: true },
    });

    if (rows.length === 0) break;

    const fromId = rows[0]!.id;
    const toId = rows[rows.length - 1]!.id;
    cursorId = toId;
    processed += rows.length;

    const task = updateBatchWithRetry(rows, fromId, toId, failedBatches).then(() => {
      inFlight.delete(task);
    });
    inFlight.add(task);

    if (inFlight.size >= CONCURRENCY) {
      await Promise.race(inFlight);
    }

    const elapsedMin = (Date.now() - startTime) / 60_000;
    console.log(
      `Queued ids [${fromId}-${toId}] — ${processed}/${totalDbCount} (${((processed / totalDbCount) * 100).toFixed(2)}%), ${elapsedMin.toFixed(1)}min elapsed`,
    );
  }

  await Promise.all(inFlight);

  console.log("All batches submitted. Waiting for Meilisearch to finish processing...");
  while (true) {
    const queued = await client.tasks.getTasks({
      indexUids: ["dataset"],
      statuses: ["enqueued", "processing"],
      limit: 1,
    });
    if (queued.total === 0) break;
    await new Promise((r) => setTimeout(r, 5000));
  }

  // A batch can be accepted (enqueued) but still fail once Meilisearch gets
  // to processing it — the per-batch try/catch above only sees HTTP errors,
  // so check the task log for this run too before trusting the backfill.
  const asyncFailures = await client.tasks.getTasks({
    indexUids: ["dataset"],
    statuses: ["failed"],
    types: ["documentAdditionOrUpdate"],
    afterEnqueuedAt: runStartIso,
  });
  if (asyncFailures.total > 0) {
    console.error(`${asyncFailures.total} task(s) failed during processing:`);
    console.error(JSON.stringify(asyncFailures.results, null, 2));
    failedBatches.push({ fromId: -1, toId: -1, error: "see asyncFailures above" });
  }

  if (failedBatches.length > 0) {
    console.error(`${failedBatches.length} batch(es) failed permanently:`);
    console.error(JSON.stringify(failedBatches, null, 2));
    console.error(
      "Not updating searchableAttributes — rerun with BACKFILL_START_ID set to fill gaps, then re-run this script.",
    );
    process.exit(1);
  }

  if (needsSettingsUpdate) {
    console.log("Adding 'publisher' to searchableAttributes...");
    const settingsTask = await index.updateSearchableAttributes([...currentSearchable, "publisher"]);
    await client.tasks.waitForTask(settingsTask.taskUid);
    console.log("searchableAttributes updated.");
  } else {
    console.log("'publisher' is already a searchable attribute — skipping settings update.");
  }

  console.log("Done.");
}

main()
  .catch((err) => {
    console.error("Error:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

// Live job data that's cheap to read: queue tables stay small because workers
// delete rows as they go, and IngestLog has one row per source and day.
// Figures that need a full scan are precomputed into /api/metrics instead.
const CACHE_TTL_MS = 3 * 60 * 60 * 1000;

// One unauthenticated GitHub request covers every workflow, and 100 runs goes
// back about a week.
const RUNS_URL =
  "https://api.github.com/repos/data-S-index/web-app/actions/runs?per_page=100";
const RUNS_TIMEOUT_MS = 5000;

type WorkflowRun = {
  id: number;
  status: string;
  conclusion: string | null;
  event: string;
  startedAt: string;
  durationSeconds: number;
  url: string;
};

type GitHubRun = {
  id: number;
  path: string;
  status: string;
  conclusion: string | null;
  event: string;
  run_started_at: string;
  updated_at: string;
  html_url: string;
};

let cachedRuns: Record<string, WorkflowRun[]> | null = null;
let cachedRunsAt = 0;

let cached: Awaited<ReturnType<typeof loadDatabaseStatus>> | null = null;
let cachedAt = 0;

// Runs for each workflow file, newest first. Keeps the last good result if
// GitHub can't be reached, and waits for the next window before retrying.
async function loadRuns() {
  const now = Date.now();
  if (cachedRunsAt !== 0 && now - cachedRunsAt < CACHE_TTL_MS) {
    return cachedRuns;
  }
  cachedRunsAt = now;

  try {
    const { workflow_runs: runs } = await $fetch<{
      workflow_runs: GitHubRun[];
    }>(RUNS_URL, {
      timeout: RUNS_TIMEOUT_MS,
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "scholardata-job-status",
      },
    });

    const byWorkflow: Record<string, WorkflowRun[]> = {};
    for (const run of runs) {
      const workflow = run.path.split("/").pop()!;
      (byWorkflow[workflow] ??= []).push({
        id: run.id,
        status: run.status,
        conclusion: run.conclusion,
        event: run.event,
        startedAt: run.run_started_at,
        durationSeconds: Math.round(
          (Date.parse(run.updated_at) - Date.parse(run.run_started_at)) / 1000,
        ),
        url: run.html_url,
      });
    }
    cachedRuns = byWorkflow;
  } catch (error) {
    console.error("Failed to load GitHub workflow runs:", error);
  }

  return cachedRuns;
}

async function loadDatabaseStatus() {
  const pending = { _count: true, _min: { created: true } } as const;

  const [fuji, dIndex, automatedUsers, automatedOrganizations, ingest, latest] =
    await Promise.all([
      prisma.fujiJob.aggregate(pending),
      prisma.dIndexJob.aggregate(pending),
      prisma.automatedUserSIndexJob.aggregate(pending),
      prisma.automatedOrganizationSIndexJob.aggregate(pending),
      prisma.ingestLog.groupBy({
        by: ["source"],
        orderBy: { source: "asc" },
        _count: { _all: true, indexedAt: true },
        _max: { day: true, harvestedAt: true, indexedAt: true },
        _sum: { records: true, inserted: true, failed: true },
      }),
      prisma.ingestLog.findMany({
        distinct: ["source"],
        orderBy: [{ source: "asc" }, { harvestedAt: "desc" }],
        select: { source: true, runUrl: true },
      }),
    ]);

  const toQueue = (queue: typeof fuji) => ({
    pending: queue._count,
    oldest: queue._min.created?.toISOString() ?? null,
  });

  return {
    queues: {
      fuji: toQueue(fuji),
      dIndex: toQueue(dIndex),
      automatedUsers: toQueue(automatedUsers),
      automatedOrganizations: toQueue(automatedOrganizations),
    },
    ingest: ingest.map((row) => ({
      source: row.source,
      days: row._count._all,
      daysNotIndexed: row._count._all - row._count.indexedAt,
      latestDay: row._max.day?.toISOString().slice(0, 10) ?? null,
      lastHarvestedAt: row._max.harvestedAt?.toISOString() ?? null,
      lastIndexedAt: row._max.indexedAt?.toISOString() ?? null,
      records: row._sum.records ?? 0,
      inserted: row._sum.inserted ?? 0,
      failed: row._sum.failed ?? 0,
      lastRunUrl: latest.find((l) => l.source === row.source)?.runUrl ?? null,
    })),
    checkedAt: new Date().toISOString(),
  };
}

export default defineEventHandler(async () => {
  const now = Date.now();

  const [runs] = await Promise.all([
    loadRuns(),
    (async () => {
      if (cached === null || now - cachedAt > CACHE_TTL_MS) {
        cached = await loadDatabaseStatus();
        cachedAt = now;
      }
    })(),
  ]);

  return { ...cached!, runs };
});

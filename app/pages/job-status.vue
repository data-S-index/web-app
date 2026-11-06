<script setup lang="ts">
import { formatDistanceToNow } from "date-fns";

useSeoMeta({
  title: "Job Status",
  description:
    "Status and progress of the background jobs behind Scholar Data.",
});

defineOgImage("NuxtSeo.takumi", {
  title: "Job Status",
  description:
    "Status and progress of the background jobs behind Scholar Data.",
});

type WorkflowRun = {
  id: number;
  status: string;
  conclusion: string | null;
  event: string;
  startedAt: string;
  durationSeconds: number;
  url: string;
};

type Queue = { pending: number; oldest: string | null };
type QueueKey = "fuji" | "dIndex" | "automatedUsers" | "automatedOrganizations";

type JobStatusResponse = {
  checkedAt: string;
  queues: Record<QueueKey, Queue>;
  ingest: {
    source: string;
    days: number;
    daysNotIndexed: number;
    latestDay: string | null;
    lastHarvestedAt: string | null;
    lastIndexedAt: string | null;
    records: number;
    inserted: number;
    failed: number;
    lastRunUrl: string | null;
  }[];
  runs: Record<string, WorkflowRun[]> | null;
};

type JobState =
  "healthy" | "running" | "failing" | "cancelled" | "overdue" | "unknown";

const REFRESH_INTERVAL_MS = 60 * 1000;
const RUN_HISTORY_LENGTH = 10;

// Client only, as relative times would differ between the server and browser
const {
  data: jobStatus,
  status: fetchStatus,
  refresh: refreshJobStatus,
} = await useFetch<JobStatusResponse>("/api/job-status", { server: false });

// Slow totals, precomputed daily by the platform metrics job
const { data: platformMetrics } = await useFetch<{
  counts: Record<string, number>;
  jobStats: {
    datasetsWithDIndex: number;
    usersWithSIndex: number;
    organizationsWithSIndex: number;
    organizations: number;
    fairScoresLast24h: number;
  } | null;
  updated: string | null;
}>("/api/metrics", { server: false });

const counts = computed(() => platformMetrics.value?.counts ?? {});
const jobStats = computed(() => platformMetrics.value?.jobStats ?? null);

const formatCount = (value: number | undefined) =>
  value === undefined ? "N/A" : value.toLocaleString("en-US");

const formatRelative = (date: string | null) =>
  date ? formatDistanceToNow(new Date(date), { addSuffix: true }) : "Never";

const formatDuration = (seconds: number) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours >= 48) return `${Math.round(hours / 24)} days`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${Math.round(seconds % 60)}s`;

  return `${Math.round(seconds)}s`;
};

// Calendar days from the ingest log have no time, so keep them in UTC
const formatDay = (day: string | null) =>
  day
    ? Intl.DateTimeFormat("en-US", {
        dateStyle: "medium",
        timeZone: "UTC",
      }).format(new Date(day))
    : "None";

const coverage = (done: number | undefined, total: number | undefined) => {
  if (done === undefined || !total) return null;

  return {
    percent: (done / total) * 100,
    label: `${formatCount(done)} of ${formatCount(total)}`,
  };
};

const JOBS = computed(() => [
  {
    name: "FUJI scoring",
    workflow: "update-fuji-score.yml",
    description:
      "10 workers claim queued datasets and compute their FAIR scores.",
    schedule: "Every 3 hours",
    intervalHours: 3,
    queue: "fuji" as QueueKey,
    coverageLabel: "Datasets with a FAIR score",
    coverage: coverage(counts.value.fairScores, counts.value.datasets),
  },
  {
    name: "D-index",
    workflow: "update-d-index.yml",
    description:
      "Recomputes the D-index of queued datasets and queues their owners for an S-index update.",
    schedule: "Every 8 hours",
    intervalHours: 8,
    queue: "dIndex" as QueueKey,
    coverageLabel: "Datasets with a D-index",
    coverage: coverage(
      jobStats.value?.datasetsWithDIndex,
      counts.value.datasets,
    ),
  },
  {
    name: "Automated user S-index",
    workflow: "update-automated-user-sindex.yml",
    description: "Recomputes the S-index of queued generated profiles.",
    schedule: "Every 12 hours",
    intervalHours: 12,
    queue: "automatedUsers" as QueueKey,
    coverageLabel: "Generated profiles with an S-index",
    coverage: coverage(
      jobStats.value?.usersWithSIndex,
      counts.value.generatedProfiles,
    ),
  },
  {
    name: "Automated organization S-index",
    workflow: "update-automated-org-sindex.yml",
    description: "Recomputes the S-index of queued organizations.",
    schedule: "Every 12 hours",
    intervalHours: 12,
    queue: "automatedOrganizations" as QueueKey,
    coverageLabel: "Organizations with an S-index",
    coverage: coverage(
      jobStats.value?.organizationsWithSIndex,
      jobStats.value?.organizations,
    ),
  },
  {
    name: "Seed FUJI jobs",
    workflow: "seed-fuji-jobs.yml",
    description: "Queues up to 1 million unscored datasets for FUJI scoring.",
    schedule: "Daily at 01:30 UTC",
    intervalHours: 24,
  },
  {
    name: "Index users",
    workflow: "index-users.yml",
    description: "Refreshes the user search index.",
    schedule: "Daily at 00:00 UTC",
    intervalHours: 24,
  },
  {
    name: "Backup user dataset",
    workflow: "backup-user-dataset.yml",
    description: "Backs up user dataset records.",
    schedule: "Daily at 00:00 UTC",
    intervalHours: 24,
  },
  {
    name: "Platform metrics",
    workflow: "update-platform-metrics.yml",
    description: "Precomputes the totals shown on this page and on Metrics.",
    schedule: "Daily at 04:00 UTC",
    intervalHours: 24,
  },
]);

const STATE_META: Record<
  JobState,
  {
    label: string;
    color: "success" | "info" | "error" | "warning" | "neutral";
    icon: string;
  }
> = {
  healthy: {
    label: "Healthy",
    color: "success",
    icon: "i-heroicons-check-circle-solid",
  },
  running: {
    label: "Running",
    color: "info",
    icon: "i-heroicons-arrow-path",
  },
  failing: {
    label: "Failing",
    color: "error",
    icon: "i-heroicons-x-circle-solid",
  },
  cancelled: {
    label: "Cancelled",
    color: "warning",
    icon: "i-heroicons-exclamation-triangle-solid",
  },
  overdue: {
    label: "Overdue",
    color: "warning",
    icon: "i-heroicons-clock-solid",
  },
  unknown: {
    label: "No recent runs",
    color: "neutral",
    icon: "i-heroicons-question-mark-circle-solid",
  },
};

const FAILED_CONCLUSIONS = new Set(["failure", "timed_out", "startup_failure"]);

function jobState(runs: WorkflowRun[], intervalHours: number): JobState {
  const latest = runs[0];
  if (!latest) return "unknown";
  if (latest.status !== "completed") return "running";
  if (FAILED_CONCLUSIONS.has(latest.conclusion ?? "")) return "failing";

  // Allow one missed run, as GitHub can delay or drop scheduled runs
  const age = Date.now() - Date.parse(latest.startedAt);
  if (age > 2 * intervalHours * 60 * 60 * 1000) return "overdue";

  return latest.conclusion === "cancelled" ? "cancelled" : "healthy";
}

const jobs = computed(() =>
  JOBS.value.map((job) => {
    const runs = jobStatus.value?.runs?.[job.workflow] ?? [];
    const queue = job.queue ? jobStatus.value?.queues[job.queue] : undefined;
    const latest = runs[0];

    const stats = [
      {
        label: "Last run",
        value: latest ? formatRelative(latest.startedAt) : "Not in recent runs",
      },
      {
        label: "Duration",
        value: latest ? formatDuration(latest.durationSeconds) : "N/A",
      },
    ];

    if (queue) {
      stats.push(
        { label: "Pending", value: formatCount(queue.pending) },
        {
          label: "Oldest pending",
          value: queue.oldest ? formatRelative(queue.oldest) : "Queue empty",
        },
      );
    }

    return {
      ...job,
      state: jobState(runs, job.intervalHours),
      latest,
      // Oldest to newest, so the latest run sits at the end of the row
      history: runs.slice(0, RUN_HISTORY_LENGTH).reverse(),
      stats,
    };
  }),
);

const runsAvailable = computed(() => Boolean(jobStatus.value?.runs));

const summary = computed(() => {
  if (!runsAvailable.value) {
    return {
      color: "warning" as const,
      icon: "i-heroicons-exclamation-triangle-solid",
      title: "Run history is unavailable",
      description:
        "GitHub couldn't be reached, so job health is unknown. Queue and ingest figures are still available.",
    };
  }

  const failing = jobs.value.filter((job) => job.state === "failing");
  const attention = jobs.value.filter((job) =>
    ["cancelled", "overdue", "unknown"].includes(job.state),
  );
  const names = (list: typeof failing) =>
    list.map((job) => job.name).join(", ");

  if (failing.length > 0) {
    return {
      color: "error" as const,
      icon: "i-heroicons-x-circle-solid",
      title: `${failing.length} of ${jobs.value.length} jobs failing`,
      description: names(failing),
    };
  }

  if (attention.length > 0) {
    return {
      color: "warning" as const,
      icon: "i-heroicons-exclamation-triangle-solid",
      title: `${attention.length} of ${jobs.value.length} jobs need attention`,
      description: names(attention),
    };
  }

  return {
    color: "success" as const,
    icon: "i-heroicons-check-circle-solid",
    title: "All jobs healthy",
    description: undefined,
  };
});

const pendingTotal = computed(() => {
  const queues = jobStatus.value?.queues;
  if (!queues) return undefined;

  return Object.values(queues).reduce((sum, q) => sum + q.pending, 0);
});

// How long the FUJI queue would take at the last day's scoring rate
const fujiEta = computed(() => {
  const pending = jobStatus.value?.queues.fuji.pending;
  const perDay = jobStats.value?.fairScoresLast24h;
  if (!pending || !perDay) return null;

  return formatDuration((pending / perDay) * 86400);
});

const runDotClass = (run: WorkflowRun) => {
  if (run.status !== "completed") return "bg-info";
  if (run.conclusion === "success") return "bg-success";
  if (FAILED_CONCLUSIONS.has(run.conclusion ?? "")) return "bg-error";

  return "bg-warning";
};

const runLabel = (run: WorkflowRun) =>
  `${run.conclusion ?? run.status}, ${formatRelative(run.startedAt)}`;

let intervalId: ReturnType<typeof setInterval> | null = null;

onMounted(() => {
  intervalId = setInterval(() => refreshJobStatus(), REFRESH_INTERVAL_MS);
});

onUnmounted(() => {
  if (intervalId) clearInterval(intervalId);
});
</script>

<template>
  <div class="mx-auto flex w-full max-w-screen-lg flex-col gap-6 px-6 py-10">
    <UPageCTA
      title="Job Status"
      description="Status and progress of the background jobs behind Scholar Data."
      variant="naked"
      :ui="{ container: '!pb-6' }"
    />

    <UAlert
      v-if="jobStatus"
      :color="summary.color"
      variant="subtle"
      :icon="summary.icon"
      :title="summary.title"
      :description="summary.description"
    />

    <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <UCard :ui="{ body: 'text-center' }">
        <p class="text-muted text-xs uppercase">Total datasets</p>

        <p class="mt-1 text-2xl font-bold tabular-nums">
          {{ formatCount(counts.datasets) }}
        </p>

        <p class="text-muted mt-1 text-xs">Registered on the platform</p>
      </UCard>

      <UCard :ui="{ body: 'text-center' }">
        <p class="text-muted text-xs uppercase">Jobs pending</p>

        <p class="mt-1 text-2xl font-bold tabular-nums">
          {{ formatCount(pendingTotal) }}
        </p>

        <p class="text-muted mt-1 text-xs">Across all queues</p>
      </UCard>

      <UCard :ui="{ body: 'text-center' }">
        <p class="text-muted text-xs uppercase">FAIR scores, last 24 hours</p>

        <p class="mt-1 text-2xl font-bold tabular-nums">
          {{ formatCount(jobStats?.fairScoresLast24h) }}
        </p>

        <p class="text-muted mt-1 text-xs">
          {{
            fujiEta
              ? `About ${fujiEta} to clear the queue`
              : "Added or improved scores"
          }}
        </p>
      </UCard>
    </div>

    <div class="flex items-center justify-between gap-4">
      <h2 class="text-xl font-semibold">Jobs</h2>

      <UButton
        icon="i-heroicons-arrow-path"
        color="neutral"
        variant="ghost"
        size="sm"
        :loading="fetchStatus === 'pending'"
        @click="refreshJobStatus()"
      >
        Refresh
      </UButton>
    </div>

    <div v-if="jobStatus" class="flex flex-col gap-4">
      <UCard v-for="job in jobs" :key="job.workflow">
        <div class="flex flex-col gap-4">
          <div class="flex flex-wrap items-start justify-between gap-2">
            <div class="min-w-0">
              <h3 class="font-semibold">{{ job.name }}</h3>

              <p class="text-muted text-sm">{{ job.description }}</p>
            </div>

            <UBadge
              v-if="runsAvailable"
              :color="STATE_META[job.state].color"
              :icon="STATE_META[job.state].icon"
              variant="subtle"
              size="sm"
            >
              {{ STATE_META[job.state].label }}
            </UBadge>
          </div>

          <dl class="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <dt class="text-muted text-xs">Schedule</dt>

              <dd class="text-sm font-medium">{{ job.schedule }}</dd>
            </div>

            <div v-for="stat in job.stats" :key="stat.label">
              <dt class="text-muted text-xs">{{ stat.label }}</dt>

              <dd class="text-sm font-medium tabular-nums">{{ stat.value }}</dd>
            </div>
          </dl>

          <div v-if="job.coverage" class="flex flex-col gap-1">
            <div class="flex flex-wrap justify-between gap-x-4 text-xs">
              <span class="text-muted">{{ job.coverageLabel }}</span>

              <span class="tabular-nums">
                {{ job.coverage.label }} ({{
                  job.coverage.percent.toFixed(2)
                }}%)
              </span>
            </div>

            <UProgress :model-value="job.coverage.percent" size="sm" />
          </div>

          <div
            v-if="job.history.length > 0"
            class="flex flex-wrap items-center justify-between gap-2"
          >
            <div class="flex items-center gap-1">
              <span class="text-muted mr-1 text-xs">Recent runs</span>

              <a
                v-for="run in job.history"
                :key="run.id"
                :href="run.url"
                target="_blank"
                rel="noopener noreferrer"
                :title="runLabel(run)"
                :aria-label="runLabel(run)"
                class="block size-3 rounded-full"
                :class="runDotClass(run)"
              />
            </div>

            <UButton
              v-if="job.latest"
              :to="job.latest.url"
              target="_blank"
              rel="noopener noreferrer"
              color="primary"
              variant="link"
              size="sm"
              trailing-icon="i-heroicons-arrow-top-right-on-square"
              class="p-0"
            >
              View latest run
            </UButton>
          </div>
        </div>
      </UCard>
    </div>

    <div v-else class="text-muted py-10 text-center text-sm">
      {{
        fetchStatus === "error"
          ? "Couldn't load job status."
          : "Loading jobs..."
      }}
    </div>

    <template v-if="jobStatus">
      <h2 class="text-xl font-semibold">Dataset ingest</h2>

      <UCard v-if="jobStatus.ingest.length === 0">
        <p class="text-muted text-sm">Nothing has been ingested yet.</p>
      </UCard>

      <UCard v-for="source in jobStatus.ingest" :key="source.source">
        <div class="flex flex-col gap-4">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <h3 class="font-semibold capitalize">{{ source.source }}</h3>

            <UBadge
              :color="source.failed > 0 ? 'warning' : 'success'"
              variant="subtle"
              size="sm"
            >
              {{
                source.failed > 0
                  ? `${formatCount(source.failed)} records failed`
                  : "No failed records"
              }}
            </UBadge>
          </div>

          <dl class="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <dt class="text-muted text-xs">Latest dataset date</dt>

              <dd class="text-sm font-medium">
                {{ formatDay(source.latestDay) }}
              </dd>
            </div>

            <div>
              <dt class="text-muted text-xs">Last harvested</dt>

              <dd class="text-sm font-medium">
                {{ formatRelative(source.lastHarvestedAt) }}
              </dd>
            </div>

            <div>
              <dt class="text-muted text-xs">Last indexed</dt>

              <dd class="text-sm font-medium">
                {{ formatRelative(source.lastIndexedAt) }}
              </dd>
            </div>

            <div>
              <dt class="text-muted text-xs">Days waiting to be indexed</dt>

              <dd class="text-sm font-medium tabular-nums">
                {{ formatCount(source.daysNotIndexed) }}
              </dd>
            </div>

            <div>
              <dt class="text-muted text-xs">Days loaded</dt>

              <dd class="text-sm font-medium tabular-nums">
                {{ formatCount(source.days) }}
              </dd>
            </div>

            <div>
              <dt class="text-muted text-xs">Records harvested</dt>

              <dd class="text-sm font-medium tabular-nums">
                {{ formatCount(source.records) }}
              </dd>
            </div>

            <div>
              <dt class="text-muted text-xs">New datasets</dt>

              <dd class="text-sm font-medium tabular-nums">
                {{ formatCount(source.inserted) }}
              </dd>
            </div>
          </dl>

          <UButton
            v-if="source.lastRunUrl"
            :to="source.lastRunUrl"
            target="_blank"
            rel="noopener noreferrer"
            color="primary"
            variant="link"
            size="sm"
            trailing-icon="i-heroicons-arrow-top-right-on-square"
            class="self-start p-0"
          >
            View latest run
          </UButton>
        </div>
      </UCard>

      <p class="text-muted text-center text-xs">
        Queues and run history refresh every 3 hours. Last checked
        {{ new Date(jobStatus.checkedAt).toLocaleTimeString() }}. Totals and
        coverage update daily{{
          platformMetrics?.updated
            ? `, last ${formatRelative(platformMetrics.updated)}`
            : ""
        }}.
      </p>
    </template>
  </div>
</template>

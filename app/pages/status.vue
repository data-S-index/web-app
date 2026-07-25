<script setup lang="ts">
useSeoMeta({
  title: "System Status",
  description: "Live status and response times for Scholar Data services.",
});

defineOgImage("NuxtSeo.takumi", {
  title: "System Status",
  description: "Live status and response times for Scholar Data services.",
});

type ServiceStatus = "operational" | "degraded" | "down";

interface ServiceCheck {
  name: string;
  status: ServiceStatus;
  latencyMs: number;
  message?: string;
}

interface StatusResponse {
  status: ServiceStatus;
  checkedAt: string;
  services: ServiceCheck[];
}

const REFRESH_INTERVAL_MS = 15000;

const {
  data: statusData,
  status: fetchStatus,
  refresh: refreshStatus,
} = await useFetch<StatusResponse>("/api/status", {
  server: false,
});

const STATUS_META: Record<
  ServiceStatus,
  { label: string; color: "success" | "warning" | "error"; icon: string }
> = {
  operational: {
    label: "Operational",
    color: "success",
    icon: "i-heroicons-check-circle-solid",
  },
  degraded: {
    label: "Degraded",
    color: "warning",
    icon: "i-heroicons-exclamation-triangle-solid",
  },
  down: {
    label: "Down",
    color: "error",
    icon: "i-heroicons-x-circle-solid",
  },
};

const overallMeta = computed(
  () => STATUS_META[statusData.value?.status ?? "operational"],
);

const overallTitle = computed(() => {
  switch (statusData.value?.status) {
    case "down":
      return "Major Outage";
    case "degraded":
      return "Partial Degradation";
    default:
      return "All Systems Operational";
  }
});

let intervalId: ReturnType<typeof setInterval> | null = null;

onMounted(() => {
  intervalId = setInterval(() => {
    refreshStatus();
  }, REFRESH_INTERVAL_MS);
});

onUnmounted(() => {
  if (intervalId) clearInterval(intervalId);
});
</script>

<template>
  <div class="mx-auto flex w-full max-w-screen-md flex-col gap-6 px-6 py-10">
    <UPageCTA
      title="System Status"
      description="Live status and response times for Scholar Data services."
      variant="naked"
      :ui="{ container: '!pb-6' }"
    />

    <UAlert
      :color="overallMeta.color"
      variant="subtle"
      :icon="overallMeta.icon"
      :title="overallTitle"
      :description="
        statusData
          ? `Last checked ${new Date(statusData.checkedAt).toLocaleTimeString()}`
          : undefined
      "
    />

    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-semibold">Services</h3>

          <UButton
            icon="i-heroicons-arrow-path"
            color="neutral"
            variant="ghost"
            size="sm"
            :loading="fetchStatus === 'pending'"
            @click="refreshStatus()"
          >
            Refresh
          </UButton>
        </div>
      </template>

      <div v-if="statusData" class="divide-y divide-default">
        <div
          v-for="service in statusData.services"
          :key="service.name"
          class="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0"
        >
          <div class="flex items-center gap-3">
            <UIcon
              :name="STATUS_META[service.status].icon"
              :class="{
                'text-success': service.status === 'operational',
                'text-warning': service.status === 'degraded',
                'text-error': service.status === 'down',
              }"
              class="size-5 shrink-0"
            />

            <div>
              <p class="font-medium">{{ service.name }}</p>

              <p v-if="service.message" class="text-muted text-xs">
                {{ service.message }}
              </p>
            </div>
          </div>

          <div class="flex items-center gap-3">
            <span class="text-muted text-sm tabular-nums">
              {{ service.latencyMs }}ms
            </span>

            <UBadge
              :color="STATUS_META[service.status].color"
              variant="subtle"
              size="sm"
            >
              {{ STATUS_META[service.status].label }}
            </UBadge>
          </div>
        </div>
      </div>

      <div
        v-else
        class="text-muted flex items-center justify-center py-10 text-sm"
      >
        Checking services...
      </div>
    </UCard>

    <p class="text-muted text-center text-xs">
      This page automatically refreshes every 15 seconds.
    </p>
  </div>
</template>

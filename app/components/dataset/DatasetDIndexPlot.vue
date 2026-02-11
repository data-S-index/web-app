<!-- eslint-disable @typescript-eslint/no-explicit-any -->
<script setup lang="ts">
const props = defineProps<{
  dindices: Array<{ year: number; score: number }> | null | undefined;
  publishedAt?: string | Date | null;
}>();

// Process d-index data for chart (by year only); start from dataset publishedAt year
const dIndexChartData = computed(() => {
  if (!props.dindices || props.dindices.length === 0) {
    return { years: [], scores: [] };
  }

  // Sort by year ascending
  const sorted = [...props.dindices].sort((a, b) => a.year - b.year);

  // Don't plot if there's only one data point (no trend to show)
  if (sorted.length === 1) {
    return { years: [], scores: [] };
  }

  const currentYear = new Date().getFullYear();
  const startYear = props.publishedAt
    ? new Date(props.publishedAt).getFullYear()
    : sorted[0]!.year;
  const endYear = Math.max(
    currentYear,
    ...sorted.map((d) => d.year),
  );

  const years: number[] = [];
  const scores: number[] = [];
  let lastKnownScore = 0;

  for (let y = startYear; y <= endYear; y++) {
    years.push(y);
    const point = sorted.filter((d) => d.year <= y).pop();
    if (point) lastKnownScore = point.score;
    scores.push(lastKnownScore);
  }

  return { years, scores };
});

// Check if there's only one data point (not enough for a trend)
const hasOnlyOneDataPoint = computed(() => {
  return props.dindices && props.dindices.length === 1;
});

// Chart option for d-index by year (year on x-axis only)
const dIndexChartOption = computed<ECOption>(() => ({
  tooltip: {
    trigger: "axis",
    axisPointer: {
      type: "cross",
      crossStyle: {
        color: "#999",
      },
      label: {
        show: true,
        backgroundColor: "#6b7280",
        formatter: (params: unknown) => {
          const p = params as { axisDimension?: string; value?: number | string };
          if (p.axisDimension === "x") {
            return String(p.value ?? "");
          }
          return typeof p.value === "number" ? p.value.toFixed(1) : String(p.value ?? "");
        },
      },
    },
    formatter: (params: unknown) => {
      const data = params as Array<{
        name: string;
        value: number;
        marker: string;
      }>;

      if (!data || data.length === 0) return "";

      const year = data[0]?.name ?? "";
      const value = data[0]?.value;

      return `<strong>${year}</strong><br/>${data[0]?.marker} D-Index: <strong>${value?.toFixed(1)}</strong>`;
    },
  },
  grid: {
    left: "3%",
    right: "4%",
    top: "10%",
    bottom: "15%",
    containLabel: true,
  },
  xAxis: {
    type: "category",
    data: dIndexChartData.value.years,
    name: "Year",
    nameLocation: "middle",
    nameGap: 28,
    axisLabel: {
      fontSize: 10,
    },
  },
  yAxis: {
    type: "value",
    name: "D-Index",
    nameLocation: "middle",
    nameGap: 32,
    axisLabel: {
      formatter: "{value}",
    },
  },
  series: [
    {
      name: "D-Index",
      type: "line",
      data: dIndexChartData.value.scores,
      step: "end",
      lineStyle: {
        color: "#3b82f6",
        width: 2,
      },
      itemStyle: {
        color: "#3b82f6",
      },
      symbol: "circle",
      symbolSize: 6,
      areaStyle: {
        color: {
          type: "linear",
          x: 0,
          y: 0,
          x2: 0,
          y2: 1,
          colorStops: [
            {
              offset: 0,
              color: "rgba(59, 130, 246, 0.3)",
            },
            {
              offset: 1,
              color: "rgba(59, 130, 246, 0.05)",
            },
          ],
        },
      },
    },
  ],
}));
</script>

<template>
  <ClientOnly>
    <div>
      <p class="mb-2 text-sm font-medium">D-Index Over Time</p>

      <div
        v-if="hasOnlyOneDataPoint"
        class="flex h-full items-center justify-center"
      >
        <UAlert
          title="Not enough data points to show trend over time"
          color="warning"
          variant="subtle"
        />
      </div>

      <div v-else style="height: 250px" class="relative">
        <div
          v-if="
            !dindices ||
            dindices.length === 0 ||
            dIndexChartData.years.length === 0
          "
          class="flex h-full items-center justify-center"
        >
          <Icon
            name="i-lucide-loader-circle"
            class="h-14 w-14 animate-spin text-gray-500 dark:text-gray-400"
          />
        </div>

        <VChart v-else :option="dIndexChartOption" class="h-full w-full" />
      </div>
    </div>

    <template #fallback>
      <div
        style="height: 250px"
        class="flex items-center justify-center border-t border-gray-200 pt-4 dark:border-gray-700"
      >
        <Icon
          name="i-lucide-loader-circle"
          class="h-14 w-14 animate-spin text-gray-500 dark:text-gray-400"
        />
      </div>
    </template>
  </ClientOnly>
</template>

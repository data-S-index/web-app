<!-- eslint-disable @typescript-eslint/no-explicit-any -->
<script setup lang="ts">
const props = defineProps<{
  dindices: Array<{ created: string; score: number }> | null | undefined;
}>();

// Process d-index data for chart (by date)
const dIndexChartData = computed(() => {
  if (!props.dindices || props.dindices.length === 0) {
    return { dates: [], scores: [], earliestDate: null, endDate: null };
  }

  // Sort by date ascending (earliest first)
  const sorted = [...props.dindices].sort(
    (a, b) => new Date(a.created).getTime() - new Date(b.created).getTime(),
  );

  // Get earliest date and current date
  const earliestDate = new Date(sorted[0]!.created);
  const now = new Date();
  const endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Generate monthly data points from earliest to now
  const dates: string[] = [];
  const scores: number[] = [];
  let currentDate = new Date(earliestDate);
  let lastKnownScore = sorted[0]!.score;

  // Generate data points monthly
  while (currentDate <= endDate) {
    const dateStr = currentDate.toISOString().split("T")[0]!;
    dates.push(dateStr);

    // Find the most recent d-index value up to this date
    const relevantDIndex = sorted
      .filter((d) => new Date(d.created) <= currentDate)
      .pop();

    if (relevantDIndex) {
      lastKnownScore = relevantDIndex.score;
    }

    scores.push(lastKnownScore);

    // Move to next month
    currentDate = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth() + 1,
      1,
    );
  }

  return { dates, scores, earliestDate, endDate };
});

// Chart option for d-index over time
const dIndexChartOption = computed<ECOption>(() => ({
  tooltip: {
    trigger: "axis",
    formatter: (params: unknown) => {
      const data = params as Array<{
        name: string;
        value: number;
      }>;

      if (!data || data.length === 0) return "";

      const dateStr = data[0]?.name;

      if (!dateStr) return "";

      const date = new Date(dateStr);
      const formattedDate = date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });

      return `${formattedDate}<br/>D-Index: ${data[0]?.value.toFixed(2)}`;
    },
  },
  grid: {
    left: "3%",
    right: "4%",
    bottom: "3%",
    containLabel: true,
  },
  xAxis: {
    type: "time",
    min: dIndexChartData.value.earliestDate
      ? dIndexChartData.value.earliestDate.toISOString().split("T")[0]
      : undefined,
    max: dIndexChartData.value.endDate
      ? dIndexChartData.value.endDate.toISOString().split("T")[0]
      : undefined,
    axisLabel: {
      fontSize: 12,
      formatter: (value: number | string) => {
        const date = new Date(typeof value === "number" ? value : value);

        return date.getFullYear().toString();
      },
    },
  },
  yAxis: {
    type: "value",
    name: "D-Index",
    nameLocation: "middle",
    nameGap: 40,
    axisLabel: {
      formatter: "{value}",
    },
  },
  series: [
    {
      name: "D-Index",
      type: "line",
      data: dIndexChartData.value.dates.map((date, index) => [
        date,
        dIndexChartData.value.scores[index],
      ]),
      step: "end",
      lineStyle: {
        color: "#3b82f6",
        width: 2,
      },
      itemStyle: {
        color: "#3b82f6",
      },
      symbol: "circle",
      symbolSize: 2,
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
    <div class="border-t border-gray-200 pt-4 dark:border-gray-700">
      <div style="height: 200px" class="relative">
        <div
          v-if="
            !dindices ||
            dindices.length === 0 ||
            dIndexChartData.dates.length === 0
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
        style="height: 200px"
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

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

  // Don't plot if there's only one data point (no trend to show)
  if (sorted.length === 1) {
    return { dates: [], scores: [], earliestDate: null, endDate: null };
  }

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

// Check if there's only one data point (not enough for a trend)
const hasOnlyOneDataPoint = computed(() => {
  return props.dindices && props.dindices.length === 1;
});

// Chart option for d-index over time
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
        formatter: (params: { axisDimension: string; value: number }) => {
          if (params.axisDimension === "x") {
            const date = new Date(params.value);
            const month = String(date.getMonth() + 1).padStart(2, "0");
            const year = date.getFullYear();

            return `${month}/${year}`;
          }

          return params.value.toFixed(2);
        },
      },
    },
    formatter: (params: unknown) => {
      const data = params as Array<{
        name: string;
        value: [string, number];
        marker: string;
      }>;

      if (!data || data.length === 0) return "";

      const dateStr = data[0]?.value?.[0] || data[0]?.name;
      if (!dateStr) return "";

      const date = new Date(dateStr);
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const year = date.getFullYear();
      const formattedDate = `${month}/${year}`;

      const value = Array.isArray(data[0]?.value)
        ? data[0]?.value[1]
        : data[0]?.value;

      return `<strong>${formattedDate}</strong><br/>${data[0]?.marker} D-Index: <strong>${value?.toFixed(2)}</strong>`;
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
    type: "time",
    min: dIndexChartData.value.earliestDate
      ? dIndexChartData.value.earliestDate.toISOString().split("T")[0]
      : undefined,
    max: dIndexChartData.value.endDate
      ? dIndexChartData.value.endDate.toISOString().split("T")[0]
      : undefined,
    axisLabel: {
      fontSize: 8,
      formatter: (value: number | string) => {
        const date = new Date(typeof value === "number" ? value : value);
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const year = String(date.getFullYear()).slice(-2);

        return `${month}/${year}`;
      },
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

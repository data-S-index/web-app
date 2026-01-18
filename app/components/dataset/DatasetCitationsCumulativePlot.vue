<!-- eslint-disable @typescript-eslint/no-explicit-any -->
<script setup lang="ts">
const props = defineProps<{
  citations:
    | Array<{ citedDate?: string | null; citationWeight?: number | null }>
    | null
    | undefined;
  publishedAt?: string | null;
}>();

// Process citations data for cumulative chart
const citationsChartData = computed(() => {
  if (!props.citations || props.citations.length === 0) {
    return {
      dates: [],
      rawValues: [],
      weightedValues: [],
      earliestDate: null,
      endDate: null,
    };
  }

  // Filter citations with dates
  const citationsWithDates = props.citations
    .filter((c) => c.citedDate)
    .map((c) => ({
      date: new Date(c.citedDate!),
      weight: c.citationWeight ?? 1.0,
    }))
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  if (citationsWithDates.length === 0) {
    return {
      dates: [],
      rawValues: [],
      weightedValues: [],
      earliestDate: null,
      endDate: null,
    };
  }

  // Determine start date (publication date or first citation date)
  const publicationDate = props.publishedAt
    ? new Date(props.publishedAt)
    : null;
  const firstCitationDate = citationsWithDates[0]!.date;
  const startDate =
    publicationDate && publicationDate < firstCitationDate
      ? publicationDate
      : firstCitationDate;

  // Determine end date (now or last citation date)
  const now = new Date();
  const lastCitationDate =
    citationsWithDates[citationsWithDates.length - 1]!.date;
  const endDate = lastCitationDate > now ? lastCitationDate : now;

  // Generate monthly data points
  const dates: string[] = [];
  const rawValues: number[] = [];
  const weightedValues: number[] = [];

  let cumulativeRaw = 0;
  let cumulativeWeighted = 0;

  // Group citations by month
  const citationsByMonth = new Map<string, { raw: number; weighted: number }>();

  citationsWithDates.forEach((citation) => {
    const monthKey = `${citation.date.getFullYear()}-${String(citation.date.getMonth() + 1).padStart(2, "0")}`;
    const existing = citationsByMonth.get(monthKey) || { raw: 0, weighted: 0 };
    citationsByMonth.set(monthKey, {
      raw: existing.raw + 1,
      weighted: existing.weighted + citation.weight,
    });
  });

  // Generate data points for each month
  const currentDate = new Date(startDate);
  currentDate.setDate(1); // Start of month

  while (currentDate <= endDate) {
    const monthKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}`;
    dates.push(currentDate.toISOString().split("T")[0]!);

    // Add citations for this month
    const monthCitations = citationsByMonth.get(monthKey);
    if (monthCitations) {
      cumulativeRaw += monthCitations.raw;
      cumulativeWeighted += monthCitations.weighted;
    }

    rawValues.push(cumulativeRaw);
    weightedValues.push(cumulativeWeighted);

    // Move to next month
    currentDate.setMonth(currentDate.getMonth() + 1);
  }

  return { dates, rawValues, weightedValues, earliestDate: startDate, endDate };
});

// Check if there's enough data to plot
const hasEnoughData = computed(() => {
  return (
    props.citations &&
    props.citations.length > 0 &&
    citationsChartData.value.dates.length > 0
  );
});

// Chart option for cumulative citations over time
const citationsChartOption = computed<ECOption>(() => ({
  tooltip: {
    trigger: "axis",
    formatter: (params: unknown) => {
      const data = params as Array<{
        name: string;
        value: number;
        seriesName: string;
      }>;

      if (!data || data.length === 0) return "";

      const dateStr = data[0]?.name;
      if (!dateStr) return "";

      const date = new Date(dateStr);
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const year = String(date.getFullYear()).slice(-2);
      const formattedDate = `${month}/${year}`;

      let tooltip = `${formattedDate}<br/>`;
      data.forEach((item) => {
        if (item.seriesName === "Raw Citations") {
          tooltip += `Raw: ${item.value.toFixed(0)}<br/>`;
        } else if (item.seriesName === "Weighted Citations") {
          tooltip += `Weighted: ${item.value.toFixed(2)}<br/>`;
        }
      });

      return tooltip;
    },
  },
  legend: {
    data: ["Raw Citations", "Weighted Citations"],
    bottom: 0,
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
    min: citationsChartData.value.earliestDate
      ? citationsChartData.value.earliestDate.toISOString().split("T")[0]
      : undefined,
    max: citationsChartData.value.endDate
      ? citationsChartData.value.endDate.toISOString().split("T")[0]
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
    name: "Cumulative Citations",
    nameLocation: "middle",
    nameGap: 40,
    axisLabel: {
      formatter: "{value}",
    },
  },
  series: [
    {
      name: "Raw Citations",
      type: "line",
      data: citationsChartData.value.dates.map((date, index) => [
        date,
        citationsChartData.value.rawValues[index],
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
      symbolSize: 4,
    },
    {
      name: "Weighted Citations",
      type: "line",
      data: citationsChartData.value.dates.map((date, index) => [
        date,
        citationsChartData.value.weightedValues[index],
      ]),
      step: "end",
      lineStyle: {
        color: "#ec4899",
        width: 2,
      },
      itemStyle: {
        color: "#ec4899",
      },
      symbol: "circle",
      symbolSize: 4,
    },
  ],
}));
</script>

<template>
  <ClientOnly>
    <div>
      <p class="mb-2 text-sm font-medium">Cumulative Citations Over Time</p>

      <div
        v-if="!hasEnoughData"
        class="flex h-full items-center justify-center"
      >
        <UAlert
          title="No citation data available"
          description="This dataset has no citations with dates to display."
          color="warning"
          variant="subtle"
        />
      </div>

      <div v-else style="height: 250px" class="relative">
        <VChart :option="citationsChartOption" class="h-full w-full" />
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

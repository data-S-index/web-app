<!-- eslint-disable @typescript-eslint/no-explicit-any -->
<script setup lang="ts">
const props = defineProps<{
  mentions:
    | Array<{ mentionedDate?: string | null; mentionWeight?: number | null }>
    | null
    | undefined;
  publishedAt?: string | null;
}>();

// Process mentions data for cumulative chart
const mentionsChartData = computed(() => {
  if (!props.mentions || props.mentions.length === 0) {
    return {
      dates: [],
      rawValues: [],
      weightedValues: [],
      earliestDate: null,
      endDate: null,
    };
  }

  // Filter mentions with dates
  const mentionsWithDates = props.mentions
    .filter((m) => m.mentionedDate)
    .map((m) => ({
      date: new Date(m.mentionedDate!),
      weight: m.mentionWeight ?? 1.0,
    }))
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  if (mentionsWithDates.length === 0) {
    return {
      dates: [],
      rawValues: [],
      weightedValues: [],
      earliestDate: null,
      endDate: null,
    };
  }

  // Determine start date (publication date or first mention date)
  const publicationDate = props.publishedAt
    ? new Date(props.publishedAt)
    : null;
  const firstMentionDate = mentionsWithDates[0]!.date;
  const startDate =
    publicationDate && publicationDate < firstMentionDate
      ? publicationDate
      : firstMentionDate;

  // Determine end date (now or last mention date)
  const now = new Date();
  const lastMentionDate = mentionsWithDates[mentionsWithDates.length - 1]!.date;
  const endDate = lastMentionDate > now ? lastMentionDate : now;

  // Generate monthly data points
  const dates: string[] = [];
  const rawValues: number[] = [];
  const weightedValues: number[] = [];

  let cumulativeRaw = 0;
  let cumulativeWeighted = 0;

  // Group mentions by month
  const mentionsByMonth = new Map<string, { raw: number; weighted: number }>();

  mentionsWithDates.forEach((mention) => {
    const monthKey = `${mention.date.getFullYear()}-${String(mention.date.getMonth() + 1).padStart(2, "0")}`;
    const existing = mentionsByMonth.get(monthKey) || { raw: 0, weighted: 0 };
    mentionsByMonth.set(monthKey, {
      raw: existing.raw + 1,
      weighted: existing.weighted + mention.weight,
    });
  });

  // Generate data points for each month
  const currentDate = new Date(startDate);
  currentDate.setDate(1); // Start of month

  while (currentDate <= endDate) {
    const monthKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}`;
    dates.push(currentDate.toISOString().split("T")[0]!);

    // Add mentions for this month
    const monthMentions = mentionsByMonth.get(monthKey);
    if (monthMentions) {
      cumulativeRaw += monthMentions.raw;
      cumulativeWeighted += monthMentions.weighted;
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
    props.mentions &&
    props.mentions.length > 0 &&
    mentionsChartData.value.dates.length > 0
  );
});

// Chart option for cumulative mentions over time
const mentionsChartOption = computed<ECOption>(() => ({
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

          return params.value.toFixed(1);
        },
      },
    },
    formatter: (params: unknown) => {
      const data = params as Array<{
        name: string;
        value: [string, number];
        seriesName: string;
        marker: string;
      }>;

      if (!data || data.length === 0) return "";

      const dateStr = data[0]?.value?.[0] || data[0]?.name;
      if (!dateStr) return "";

      const date = new Date(dateStr);
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const year = date.getFullYear();
      const formattedDate = `${month}/${year}`;

      let tooltip = `<strong>${formattedDate}</strong><br/>`;
      data.forEach((item) => {
        const value = Array.isArray(item.value) ? item.value[1] : item.value;
        if (item.seriesName === "Raw Mentions") {
          tooltip += `${item.marker} Raw: <strong>${value.toFixed(0)}</strong><br/>`;
        } else if (item.seriesName === "Weighted Mentions") {
          tooltip += `${item.marker} Weighted: <strong>${value.toFixed(2)}</strong><br/>`;
        }
      });

      return tooltip;
    },
  },
  legend: {
    data: ["Raw Mentions", "Weighted Mentions"],
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
    min: mentionsChartData.value.earliestDate
      ? mentionsChartData.value.earliestDate.toISOString().split("T")[0]
      : undefined,
    max: mentionsChartData.value.endDate
      ? mentionsChartData.value.endDate.toISOString().split("T")[0]
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
    name: "Cumulative Mentions",
    nameLocation: "middle",
    nameGap: 40,
    axisLabel: {
      formatter: "{value}",
    },
  },
  series: [
    {
      name: "Raw Mentions",
      type: "line",
      data: mentionsChartData.value.dates.map((date, index) => [
        date,
        mentionsChartData.value.rawValues[index],
      ]),
      step: "end",
      lineStyle: {
        color: "#10b981",
        width: 2,
      },
      itemStyle: {
        color: "#10b981",
      },
      symbol: "circle",
      symbolSize: 4,
    },
    {
      name: "Weighted Mentions",
      type: "line",
      data: mentionsChartData.value.dates.map((date, index) => [
        date,
        mentionsChartData.value.weightedValues[index],
      ]),
      step: "end",
      lineStyle: {
        color: "#f59e0b",
        width: 2,
      },
      itemStyle: {
        color: "#f59e0b",
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
      <p class="mb-2 text-sm font-medium">Cumulative Mentions Over Time</p>

      <div
        v-if="!hasEnoughData"
        class="flex h-full items-center justify-center"
      >
        <UAlert
          title="No mention data available"
          description="This dataset has no mentions with dates to display."
          color="warning"
          variant="subtle"
        />
      </div>

      <div v-else style="height: 250px" class="relative">
        <VChart :option="mentionsChartOption" class="h-full w-full" />
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

<!-- eslint-disable @typescript-eslint/no-explicit-any -->
<script setup lang="ts">
const props = defineProps<{
  mentions:
    | Array<{ mentionedDate?: string | null; mentionWeight?: number | null }>
    | null
    | undefined;
  publishedAt?: string | null;
}>();

// Process mentions data for cumulative chart (per year, bar chart)
const mentionsChartData = computed(() => {
  if (!props.mentions || props.mentions.length === 0) {
    return {
      years: [] as string[],
      rawValues: [] as number[],
      weightedValues: [] as number[],
      earliestDate: null as Date | null,
      endDate: null as Date | null,
    };
  }

  const mentionsWithDates = props.mentions
    .filter((m) => m.mentionedDate)
    .map((m) => ({
      date: new Date(m.mentionedDate!),
      weight: m.mentionWeight ?? 1.0,
    }))
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  if (mentionsWithDates.length === 0) {
    return {
      years: [],
      rawValues: [],
      weightedValues: [],
      earliestDate: null,
      endDate: null,
    };
  }

  const currentYear = new Date().getFullYear();
  const publicationDate = props.publishedAt
    ? new Date(props.publishedAt)
    : null;
  const firstMentionDate = mentionsWithDates[0]!.date;
  const lastMentionDate = mentionsWithDates[mentionsWithDates.length - 1]!.date;
  const startYear = publicationDate
    ? new Date(publicationDate).getFullYear()
    : firstMentionDate.getFullYear();
  const endYear = Math.max(currentYear - 1, lastMentionDate.getFullYear());

  const mentionsByYear = new Map<number, { raw: number; weighted: number }>();
  mentionsWithDates.forEach((mention) => {
    const year = mention.date.getFullYear();
    const existing = mentionsByYear.get(year) || { raw: 0, weighted: 0 };
    mentionsByYear.set(year, {
      raw: existing.raw + 1,
      weighted: existing.weighted + mention.weight,
    });
  });

  const years: string[] = [];
  const rawValues: number[] = [];
  const weightedValues: number[] = [];
  let cumulativeRaw = 0;
  let cumulativeWeighted = 0;

  for (let year = startYear; year <= endYear; year++) {
    years.push(String(year));
    const yearMentions = mentionsByYear.get(year);
    if (yearMentions) {
      cumulativeRaw += yearMentions.raw;
      cumulativeWeighted += yearMentions.weighted;
    }
    rawValues.push(cumulativeRaw);
    weightedValues.push(cumulativeWeighted);
  }

  return {
    years,
    rawValues,
    weightedValues,
    earliestDate: new Date(startYear, 0, 1),
    endDate: new Date(endYear, 11, 31),
  };
});

// Check if there's enough data to plot
const hasEnoughData = computed(() => {
  return (
    props.mentions &&
    props.mentions.length > 0 &&
    mentionsChartData.value.years.length > 0
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
        formatter: (params: unknown) => {
          const p = params as {
            axisDimension?: string;
            value?: number | string;
          };
          if (p.axisDimension === "x") return String(p.value ?? "");

          return typeof p.value === "number"
            ? p.value.toFixed(1)
            : String(p.value ?? "");
        },
      },
    },
    formatter: (params: unknown) => {
      const data = params as Array<{
        name: string;
        value: number | [string, number];
        seriesName: string;
        marker: string;
      }>;

      if (!data || data.length === 0) return "";

      const yearStr = data[0]?.name ?? "";
      let tooltip = `<strong>${yearStr}</strong><br/>`;
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
    type: "category",
    data: mentionsChartData.value.years,
    name: "Year",
    nameLocation: "middle",
    nameGap: 28,
    axisLabel: {
      fontSize: 10,
      interval: 0,
      rotate: mentionsChartData.value.years.length > 5 ? 60 : 0,
    },
  },
  yAxis: {
    type: "value",
    axisLabel: {
      formatter: "{value}",
    },
  },
  series: [
    {
      name: "Raw Mentions",
      type: "bar",
      data: mentionsChartData.value.rawValues,
      barMaxWidth: 24,
      itemStyle: {
        color: "#10b981",
      },
    },
    {
      name: "Weighted Mentions",
      type: "bar",
      data: mentionsChartData.value.weightedValues,
      barMaxWidth: 24,
      itemStyle: {
        color: "#f59e0b",
      },
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

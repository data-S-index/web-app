<!-- eslint-disable @typescript-eslint/no-explicit-any -->
<script setup lang="ts">
const props = defineProps<{
  cumulativeCitations: {
    dates: string[];
    rawValues: number[];
    weightedValues: number[];
    earliestDate: Date | null;
    endDate: Date | null;
  };
}>();

// Chart options for cumulative citations
const citationsChartOption = computed<ECOption>(() => ({
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
          if (p.axisDimension === "x") {
            const date = new Date(p.value as number);
            const month = String(date.getMonth() + 1).padStart(2, "0");
            const year = date.getFullYear();

            return `${month}/${year}`;
          }

          return typeof p.value === "number"
            ? p.value.toFixed(1)
            : String(p.value);
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
        if (item.seriesName === "Raw Citations") {
          tooltip += `${item.marker} Raw: <strong>${value.toFixed(0)}</strong><br/>`;
        } else if (item.seriesName === "Weighted Citations") {
          tooltip += `${item.marker} Weighted: <strong>${value.toFixed(2)}</strong><br/>`;
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
    min: props.cumulativeCitations.earliestDate
      ? props.cumulativeCitations.earliestDate.toISOString().split("T")[0]
      : undefined,
    max: props.cumulativeCitations.endDate
      ? props.cumulativeCitations.endDate.toISOString().split("T")[0]
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
      data: props.cumulativeCitations.dates.map((date, index) => [
        date,
        props.cumulativeCitations.rawValues[index],
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
      data: props.cumulativeCitations.dates.map((date, index) => [
        date,
        props.cumulativeCitations.weightedValues[index],
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
  <UCard class="mb-6">
    <template #header>
      <h3 class="text-lg font-semibold">
        Cumulative Citations Over Time
      </h3>
    </template>

    <ClientOnly>
      <div
        v-if="
          cumulativeCitations.dates &&
          cumulativeCitations.dates.length > 0
        "
        style="height: 300px"
        class="relative"
      >
        <VChart :option="citationsChartOption" class="h-full w-full" />
      </div>

      <div
        v-else
        class="flex h-full items-center justify-center"
        style="height: 300px"
      >
        <UAlert
          title="No citation data available"
          description="Citation data will appear as your datasets receive citations."
          color="warning"
          variant="subtle"
        />
      </div>

      <template #fallback>
        <div
          style="height: 300px"
          class="flex items-center justify-center border-t border-gray-200 pt-4 dark:border-gray-700"
        >
          <Icon
            name="i-lucide-loader-circle"
            class="h-14 w-14 animate-spin text-gray-500 dark:text-gray-400"
          />
        </div>
      </template>
    </ClientOnly>
  </UCard>
</template>

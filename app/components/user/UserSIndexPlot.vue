<!-- eslint-disable @typescript-eslint/no-explicit-any -->
<script setup lang="ts">
const props = defineProps<{
  sindexOverTime: {
    dates: string[];
    scores: number[];
    earliestDate: Date | null;
    endDate: Date | null;
  };
}>();

// Chart options for S-index over time
const sindexChartOption = computed<ECOption>(() => ({
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
            ? p.value.toFixed(0)
            : String(p.value);
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

      return `<strong>${formattedDate}</strong><br/>${data[0]?.marker} S-Index: <strong>${value?.toFixed(0)}</strong>`;
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
    min: props.sindexOverTime.earliestDate
      ? props.sindexOverTime.earliestDate.toISOString().split("T")[0]
      : undefined,
    max: props.sindexOverTime.endDate
      ? props.sindexOverTime.endDate.toISOString().split("T")[0]
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
    name: "S-Index",
    nameLocation: "middle",
    nameGap: 32,
    axisLabel: {
      formatter: "{value}",
    },
  },
  series: [
    {
      name: "S-Index",
      type: "line",
      data: props.sindexOverTime.dates.map((date, index) => [
        date,
        props.sindexOverTime.scores[index],
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
              color: "rgba(236, 72, 153, 0.3)",
            },
            {
              offset: 1,
              color: "rgba(236, 72, 153, 0.05)",
            },
          ],
        },
      },
    },
  ],
}));
</script>

<template>
  <UCard class="mb-6">
    <template #header>
      <h3 class="text-lg font-semibold">S-Index Over Time</h3>
    </template>

    <ClientOnly>
      <div
        v-if="sindexOverTime.dates && sindexOverTime.dates.length > 0"
        style="height: 300px"
        class="relative"
      >
        <VChart :option="sindexChartOption" class="h-full w-full" />
      </div>

      <div
        v-else
        class="flex h-full items-center justify-center"
        style="height: 300px"
      >
        <UAlert
          title="No S-Index data available"
          description="S-Index data will appear as datasets are added and D-Index scores are calculated."
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

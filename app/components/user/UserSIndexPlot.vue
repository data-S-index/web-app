<!-- eslint-disable @typescript-eslint/no-explicit-any -->
<script setup lang="ts">
const props = defineProps<{
  sindexOverTime: {
    years: number[];
    scores: number[];
  };
}>();

// Chart options for S-index over time (year on x-axis only)
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
            return String(p.value);
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
        value: number;
        marker: string;
      }>;
      if (!data || data.length === 0) return "";
      const year = data[0]?.name ?? "";
      const value = data[0]?.value;

      return `<strong>${year}</strong><br/>${data[0]?.marker} S-Index: <strong>${value?.toFixed(1)}</strong>`;
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
    data: props.sindexOverTime.years,
    name: "Year",
    nameLocation: "middle",
    nameGap: 28,
    axisLabel: {
      fontSize: 10,
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
      data: props.sindexOverTime.scores,
      step: "end",
      lineStyle: {
        color: "#ec4899",
        width: 2,
      },
      itemStyle: {
        color: "#ec4899",
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
        v-if="sindexOverTime.years && sindexOverTime.years.length > 0"
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

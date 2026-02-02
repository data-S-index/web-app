<script setup lang="ts">
useSeoMeta({
  title: "Metrics",
  description: "Metrics for the Scholar Data platform",
});

defineOgImageComponent("Pergel", {
  headline: "Coming Soon...",
});

const toast = useToast();

// Fetch metrics data from API
const { data: metricsData, error, pending } = await useFetch("/api/metrics");

if (error.value) {
  toast.add({
    title: "Error fetching metrics",
    description: error.value.data?.statusMessage || "Failed to load metrics",
    icon: "material-symbols:error",
    color: "error",
  });
}

// Extract data from API response
const months = computed(
  () => metricsData.value?.monthlyPublications?.months || [],
);
const datasets = computed(
  () => metricsData.value?.monthlyPublications?.datasets || [],
);
const institutionData = computed(() => metricsData.value?.institutions || []);
const fieldData = computed(() => metricsData.value?.fields || []);
const sIndexMetrics = computed(
  () =>
    metricsData.value?.sIndexMetrics || {
      averageFairScore: 0,
      averageCitationCount: 0,
      averageSIndex: 0,
      totalDatasets: 0,
      highFairDatasets: 0,
      citedDatasets: 0,
    },
);

// Calculate trend line data using linear regression
const calculateTrendLine = (data: number[]) => {
  if (data.length === 0) return [];

  const n = data.length;
  const x = Array.from({ length: n }, (_, i) => i);

  // Calculate means
  const xMean = x.reduce((sum, val) => sum + val, 0) / n;
  const yMean = data.reduce((sum, val) => sum + val, 0) / n;

  // Calculate slope and intercept
  let numerator = 0;
  let denominator = 0;

  for (let i = 0; i < n; i++) {
    numerator += (x[i]! - xMean) * (data[i]! - yMean);
    denominator += (x[i]! - xMean) * (x[i]! - xMean);
  }

  const slope = denominator === 0 ? 0 : numerator / denominator;
  const intercept = yMean - slope * xMean;

  // Generate trend line points
  return x.map((xVal) => Math.round(slope * xVal + intercept));
};

const trendLineData = computed(() => calculateTrendLine(datasets.value));

const barChartOption = computed<ECOption>(() => ({
  title: {
    text: "Dataset Publications (Last 12 Months)",
    left: "center",
    textStyle: {
      fontSize: 18,
      fontWeight: "bold",
    },
  },
  tooltip: {
    trigger: "axis",
    axisPointer: {
      type: "shadow",
    },
    formatter: (params: unknown) => {
      const data = params as Array<{
        name: string;
        value: number;
        seriesName: string;
      }>;
      if (!data || data.length === 0) return "";

      let tooltip = `${data[0]?.name}<br/>`;

      data.forEach((item) => {
        if (item.seriesName === "Dataset Publications") {
          tooltip += `Publications: ${item.value}<br/>`;
        } else if (item.seriesName === "Trend Line") {
          tooltip += `Trend: ${item.value}<br/>`;
        }
      });

      return tooltip;
    },
  },
  grid: {
    left: "3%",
    right: "4%",
    bottom: "3%",
    containLabel: true,
  },
  xAxis: {
    type: "category",
    data: months.value,
    axisLabel: {
      rotate: 45,
      fontSize: 12,
    },
  },
  yAxis: {
    type: "value",
    name: "Number of Datasets",
    nameLocation: "middle",
    nameGap: 50,
    axisLabel: {
      formatter: "{value}",
    },
  },
  series: [
    {
      name: "Dataset Publications",
      type: "bar",
      data: datasets.value,
      itemStyle: {
        color: "#ec4899",
        borderRadius: [4, 4, 0, 0],
      },
      emphasis: {
        itemStyle: {
          color: "#be185d",
        },
      },
      animationDelay: (idx: number) => idx * 100,
    },
    {
      name: "Trend Line",
      type: "line",
      data: trendLineData.value,
      smooth: true,
      lineStyle: {
        color: "#f9a8d4",
        width: 3,
        type: "solid",
      },
      itemStyle: {
        color: "#f9a8d4",
        borderWidth: 2,
        borderColor: "#fff",
      },
      symbol: "circle",
      symbolSize: 6,
      z: 10,
    },
  ],
  animationEasing: "elasticOut",
  animationDelayUpdate: (idx: number) => idx * 5,
}));

const institutionPieChartOption = computed(() => ({
  title: {
    text: "Datasets by Institution",
    left: "center",
    textStyle: {
      fontSize: 16,
      fontWeight: "bold",
    },
  },
  backgroundColor: "transparent",
  tooltip: {
    trigger: "item",
    formatter: "{a} <br/>{b}: {c} ({d}%)",
  },
  legend: {
    top: "15%",
    left: "center",
    orient: "horizontal",
    textStyle: {
      fontSize: 10,
    },
  },
  series: [
    {
      name: "Institution",
      type: "pie",
      radius: ["30%", "70%"],
      center: ["50%", "60%"],
      avoidLabelOverlap: false,
      itemStyle: {
        borderRadius: 8,
        borderColor: "#fff",
        borderWidth: 2,
      },
      label: {
        show: false,
        position: "center",
      },
      emphasis: {
        label: {
          show: true,
          fontSize: 16,
          fontWeight: "bold",
        },
      },
      labelLine: {
        show: false,
      },
      data: institutionData.value,
    },
  ],
}));

const fieldPieChartOption = computed(() => ({
  title: {
    text: "Datasets by Research Field",
    left: "center",
    textStyle: {
      fontSize: 16,
      fontWeight: "bold",
    },
  },
  backgroundColor: "transparent",
  tooltip: {
    trigger: "item",
    formatter: "{a} <br/>{b}: {c} ({d}%)",
  },
  legend: {
    top: "15%",
    left: "center",
    orient: "horizontal",
    textStyle: {
      fontSize: 10,
    },
  },
  series: [
    {
      name: "Research Field",
      type: "pie",
      radius: ["30%", "70%"],
      center: ["50%", "60%"],
      avoidLabelOverlap: false,
      itemStyle: {
        borderRadius: 8,
        borderColor: "#fff",
        borderWidth: 2,
      },
      label: {
        show: false,
        position: "center",
      },
      emphasis: {
        label: {
          show: true,
          fontSize: 16,
          fontWeight: "bold",
        },
      },
      labelLine: {
        show: false,
      },
      data: fieldData.value,
    },
  ],
}));
</script>

<template>
  <div class="mx-auto flex w-full max-w-screen-xl flex-col gap-6 px-6">
    <UPageCTA
      title="Platform Metrics and Analytics"
      description="Analytics and insights for data sharing impact, FAIRness scores, and research dataset metrics"
      variant="naked"
    />

    <div v-if="pending" class="flex items-center justify-center py-12">
      <div class="text-center">
        <div class="mb-4 text-2xl">Loading metrics...</div>
      </div>
    </div>

    <div v-else class="mb-6 grid grid-cols-1 gap-6 md:grid-cols-3">
      <UCard>
        <template #header>
          <h3 class="text-lg font-semibold">Total Datasets</h3>
        </template>

        <div class="text-3xl font-bold text-pink-600">
          {{
            datasets
              .reduce((sum: number, count: number) => sum + count, 0)
              .toLocaleString()
          }}
        </div>

        <p class="mt-2 text-sm text-gray-600">Last 12 months</p>
      </UCard>

      <UCard>
        <template #header>
          <h3 class="text-lg font-semibold">Average Monthly</h3>
        </template>

        <div class="text-3xl font-bold text-pink-600">
          {{
            datasets.length > 0
              ? Math.round(
                  datasets.reduce(
                    (sum: number, count: number) => sum + count,
                    0,
                  ) / datasets.length,
                ).toLocaleString()
              : 0
          }}
        </div>

        <p class="mt-2 text-sm text-gray-600">Datasets per month</p>
      </UCard>

      <UCard>
        <template #header>
          <h3 class="text-lg font-semibold">Peak Month</h3>
        </template>

        <div class="text-3xl font-bold text-pink-500">
          {{ datasets.length > 0 ? Math.max(...datasets).toLocaleString() : 0 }}
        </div>

        <p class="mt-2 text-sm text-gray-600">
          {{
            datasets.length > 0
              ? months[datasets.indexOf(Math.max(...datasets))]
              : "N/A"
          }}
        </p>
      </UCard>
    </div>

    <!-- S-Index Specific Metrics -->
    <div v-if="!pending" class="mb-6 grid grid-cols-1 gap-6 md:grid-cols-3">
      <UCard>
        <template #header>
          <h3 class="text-lg font-semibold">Average S-Index</h3>
        </template>

        <div class="text-3xl font-bold text-green-600">
          {{ sIndexMetrics.averageSIndex.toFixed(1) }}
        </div>

        <p class="mt-2 text-sm text-gray-600">Research Impact Score</p>
      </UCard>

      <UCard>
        <template #header>
          <h3 class="text-lg font-semibold">High FAIR Datasets</h3>
        </template>

        <div class="text-3xl font-bold text-purple-600">
          {{ sIndexMetrics.highFairDatasets.toLocaleString() }}
        </div>

        <p class="mt-2 text-sm text-gray-600">FAIR Score > 0.7</p>
      </UCard>

      <UCard>
        <template #header>
          <h3 class="text-lg font-semibold">Cited Datasets</h3>
        </template>

        <div class="text-3xl font-bold text-orange-600">
          {{ sIndexMetrics.citedDatasets.toLocaleString() }}
        </div>

        <p class="mt-2 text-sm text-gray-600">With Citations</p>
      </UCard>
    </div>

    <ClientOnly>
      <UCard v-if="!pending">
        <template #header>
          <h3 class="text-lg font-semibold">
            Monthly Dataset Publication Trends
          </h3>
        </template>

        <div style="height: 500px">
          <VChart v-if="months.length > 0" :option="barChartOption" />

          <div
            v-else
            class="flex h-full items-center justify-center text-gray-500"
          >
            No data available
          </div>
        </div>
      </UCard>
    </ClientOnly>

    <ClientOnly>
      <div v-if="!pending" class="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <UCard>
          <div style="height: 600px">
            <VChart
              v-if="institutionData.length > 0"
              :option="institutionPieChartOption"
            />

            <div
              v-else
              class="flex h-full items-center justify-center text-gray-500"
            >
              No institution data available
            </div>
          </div>
        </UCard>

        <UCard>
          <div style="height: 600px">
            <VChart v-if="fieldData.length > 0" :option="fieldPieChartOption" />

            <div
              v-else
              class="flex h-full items-center justify-center text-gray-500"
            >
              No field data available
            </div>
          </div>
        </UCard>
      </div>
    </ClientOnly>
  </div>
</template>

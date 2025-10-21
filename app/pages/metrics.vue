<script setup lang="ts">
useSeoMeta({
  title: "Metrics",
  description: "Metrics for the NIH S-Index platform",
});

defineOgImageComponent("Pergel", {
  headline: "Coming Soon...",
});

// Generate fake dataset publication data for the last 12 months
const generateDatasetPublicationData = () => {
  const months = [];
  const datasets = [];
  const currentDate = new Date();

  // Generate data for the last 12 months
  for (let i = 11; i >= 0; i--) {
    const date = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth() - i,
      1,
    );
    const monthName = date.toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    });
    months.push(monthName);

    // Generate realistic dataset publication numbers with some variation
    // Base number around 25-75 datasets per month with seasonal variations
    const baseDatasets = 45;
    const seasonalVariation = Math.sin((i / 12) * 2 * Math.PI) * 15; // Seasonal pattern
    const randomVariation = (Math.random() - 0.5) * 20; // Random variation
    const datasetCount = Math.max(
      10,
      Math.round(baseDatasets + seasonalVariation + randomVariation),
    );

    datasets.push(datasetCount);
  }

  return { months, datasets };
};

const { months, datasets } = generateDatasetPublicationData();

// Calculate trend line data using linear regression
const calculateTrendLine = (data: number[]) => {
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

  const slope = numerator / denominator;
  const intercept = yMean - slope * xMean;

  // Generate trend line points
  return x.map((xVal) => Math.round(slope * xVal + intercept));
};

const trendLineData = calculateTrendLine(datasets);

const barChartOption = ref<ECOption>({
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
    data: months,
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
      data: datasets,
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
      data: trendLineData,
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
});

// Generate fake data for datasets by institution
const generateInstitutionData = () => {
  const institutions = [
    { name: "MIT", value: 89 },
    { name: "Stanford University", value: 76 },
    { name: "Harvard University", value: 72 },
    { name: "UC Berkeley", value: 68 },
    { name: "Carnegie Mellon", value: 54 },
    { name: "Oxford University", value: 48 },
    { name: "Cambridge University", value: 45 },
    { name: "ETH Zurich", value: 42 },
    { name: "University of Toronto", value: 38 },
    { name: "Other Institutions", value: 95 },
  ];

  return institutions;
};

// Generate fake data for datasets by research field
const generateFieldData = () => {
  const fields = [
    { name: "Machine Learning", value: 156 },
    { name: "Genomics", value: 134 },
    { name: "Climate Science", value: 98 },
    { name: "Neuroscience", value: 87 },
    { name: "Computer Vision", value: 76 },
    { name: "Natural Language Processing", value: 65 },
    { name: "Physics", value: 54 },
    { name: "Chemistry", value: 43 },
    { name: "Social Sciences", value: 38 },
    { name: "Other Fields", value: 89 },
  ];

  return fields;
};

const institutionData = generateInstitutionData();
const fieldData = generateFieldData();

// Generate fake S-Index metrics
const generateSIndexMetrics = () => {
  return {
    averageFairScore: 0.78,
    averageCitationCount: 12.4,
    averageAltMentionCount: 8.7,
    averageSIndex: 6.2,
    totalDatasets: datasets.reduce((sum, count) => sum + count, 0),
    highFairDatasets: Math.round(
      datasets.reduce((sum, count) => sum + count, 0) * 0.65,
    ), // 65% have high FAIR scores
    citedDatasets: Math.round(
      datasets.reduce((sum, count) => sum + count, 0) * 0.42,
    ), // 42% are cited
  };
};

const sIndexMetrics = generateSIndexMetrics();

const institutionPieChartOption = ref({
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
      data: institutionData,
    },
  ],
});

const fieldPieChartOption = ref({
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
      name: "Conference",
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
      data: fieldData,
    },
  ],
});
</script>

<template>
  <div class="mx-auto flex w-full max-w-screen-xl flex-col gap-6 px-6">
    <UPageCTA
      title="S-Index Metrics and Analytics"
      description="Analytics and insights for data sharing impact, FAIRness scores, and research dataset metrics"
      variant="naked"
    />

    <div class="mb-6 grid grid-cols-1 gap-6 md:grid-cols-3">
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
            Math.round(
              datasets.reduce((sum, count) => sum + count, 0) / 12,
            ).toLocaleString()
          }}
        </div>

        <p class="mt-2 text-sm text-gray-600">Datasets per month</p>
      </UCard>

      <UCard>
        <template #header>
          <h3 class="text-lg font-semibold">Peak Month</h3>
        </template>

        <div class="text-3xl font-bold text-pink-500">
          {{ Math.max(...datasets).toLocaleString() }}
        </div>

        <p class="mt-2 text-sm text-gray-600">
          {{ months[datasets.indexOf(Math.max(...datasets))] }}
        </p>
      </UCard>
    </div>

    <!-- S-Index Specific Metrics -->
    <div class="mb-6 grid grid-cols-1 gap-6 md:grid-cols-3">
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
      <UCard>
        <template #header>
          <h3 class="text-lg font-semibold">
            Monthly Dataset Publication Trends
          </h3>
        </template>

        <div style="height: 500px">
          <VChart :option="barChartOption" />
        </div>
      </UCard>
    </ClientOnly>

    <ClientOnly>
      <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <UCard>
          <div style="height: 600px">
            <VChart :option="institutionPieChartOption" />
          </div>
        </UCard>

        <UCard>
          <div style="height: 600px">
            <VChart :option="fieldPieChartOption" />
          </div>
        </UCard>
      </div>
    </ClientOnly>
  </div>
</template>

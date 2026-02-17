<script setup lang="ts">
useSeoMeta({
  title: "Metrics",
  description: "Platform statistics and metrics for Scholar Data.",
});

defineOgImageComponent("Pergel", {
  headline: "Platform Metrics",
});

const formatNumber = (number: number) => {
  return Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(number);
};

const datasetsByYear = ref([
  { year: "1950-2010", value: 1097511 },
  { year: "2011", value: 138461 },
  { year: "2012", value: 339956 },
  { year: "2013", value: 218705 },
  { year: "2014", value: 577335 },
  { year: "2015", value: 1083725 },
  { year: "2016", value: 518062 },
  { year: "2017", value: 907716 },
  { year: "2018", value: 1156156 },
  { year: "2019", value: 1118023 },
  { year: "2020", value: 1652152 },
  { year: "2021", value: 7524797 },
  { year: "2022", value: 3175931 },
  { year: "2023", value: 19863260 },
  { year: "2024", value: 3776342 },
  { year: "2025", value: 5659581 },
]);

const institutions = ref([
  { name: "National Institute for Fusion Science", value: 23388953 },
  {
    name: "Leibniz Institute DSMZ - German Collection of Microorganisms and Cell Cultures",
    value: 460822,
  },
  { name: "Pacific Northwest National Laboratory", value: 444883 },
  { name: "Environmental Molecular Sciences Laboratory", value: 406437 },
  { name: "CBS NCCB", value: 130972 },
  { name: "none", value: 111420 },
  { name: "University of Bergen", value: 107005 },
  { name: "Harvard University", value: 61389 },
  { name: "University of Texas at Austin", value: 56663 },
  { name: "UT Health McGovern Medical School", value: 56151 },
  { name: "Other", value: 4980052 },
]);

const fields = ref([
  { name: "Physics and Astronomy", value: 16165731 },
  { name: "Engineering", value: 6539684 },
  { name: "Biochemistry, Genetics and Molecular Biology", value: 5542101 },
  { name: "Computer Science", value: 3795048 },
  { name: "Agricultural and Biological Sciences", value: 3766964 },
  { name: "Medicine", value: 2923804 },
  { name: "Social Sciences", value: 1926925 },
  { name: "Environmental Science", value: 1522229 },
  { name: "Materials Science", value: 1448007 },
  { name: "Earth and Planetary Sciences", value: 1204701 },
  { name: "Other", value: 4225973 },
]);

const sIndexMetrics = [
  {
    name: "Datasets registered",
    value: 49061167,
    description: "Total number of datasets registered in the platform",
  },
  {
    name: "Total citations identified",
    value: 7669225,
    description: "Total number of citations identified in the platform",
  },
  {
    name: "Total mentions identified",
    value: 91891,
    description: "Total number of mentions identified in the platform",
  },
  {
    name: "Total citations parsed",
    value: 460000000,
    description: "Total number of citations parsed in our search pipeline",
    suffix: "+",
  },
  {
    name: "Total mentions parsed",
    value: 230000000,
    description: "Total number of mentions parsed in our search pipeline",
    suffix: "+",
  },
  {
    name: "Total number of patents scanned",
    value: 6445063,
    description: "Total number of patents scanned in our search pipeline",
    suffix: "+",
  },
];

const years = computed(() => datasetsByYear.value.map((d) => d.year));
const datasetsByYearValues = computed(() =>
  datasetsByYear.value.map((d) => d.value),
);
const institutionData = computed(() => institutions.value);
const fieldData = computed(() => fields.value);

const barChartOption = computed<ECOption>(() => ({
  title: {
    text: "Dataset Publications by Year",
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

      const yearLabel = (data[0]?.name as string) ?? "";
      let tooltip = `${yearLabel}<br/>`;

      data.forEach((item) => {
        if (item.seriesName === "Dataset Publications") {
          tooltip += `Publications: ${formatNumber(item.value)}<br/>`;
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
    data: years.value,
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
      data: datasetsByYearValues.value,
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
    top: "10%",
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
    top: "10%",
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
      description="Analytics and insights on Scholar Data"
      variant="naked"
    />

    <div class="mb-6 grid grid-cols-1 gap-6 md:grid-cols-3">
      <UCard v-for="metric in sIndexMetrics" :key="metric.name">
        <template #header>
          <h3 class="text-lg font-semibold">{{ metric.name }}</h3>
        </template>

        <div class="text-3xl font-bold text-pink-600">
          {{ formatNumber(metric.value) }}{{ metric.suffix ?? "" }}
        </div>

        <p class="mt-2 text-sm">{{ metric.description }}</p>
      </UCard>
    </div>

    <ClientOnly>
      <UCard>
        <template #header>
          <h3 class="text-lg font-semibold">Datasets by Year</h3>
        </template>

        <div style="height: 500px">
          <VChart v-if="years.length > 0" :option="barChartOption" />

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
      <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <UCard>
          <div style="height: 700px">
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
          <div style="height: 700px">
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

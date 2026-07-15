<script setup lang="ts">
useSeoMeta({
  title: "Metrics",
  description: "Platform statistics and metrics for Scholar Data.",
});

defineOgImage("NuxtSeo.takumi", {
  title: "Metrics",
  description: "Platform statistics and metrics for Scholar Data.",
});

const formatNumber = (number: number) => {
  return Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(number);
};

const { data: platformMetrics } = await useFetch<{
  userCount: number;
}>("/api/metrics");

const datasetsByYear = ref([
  { year: "1950-2010", value: 1115512 },
  { year: "2011", value: 135507 },
  { year: "2012", value: 345877 },
  { year: "2013", value: 219836 },
  { year: "2014", value: 587345 },
  { year: "2015", value: 1112311 },
  { year: "2016", value: 575156 },
  { year: "2017", value: 964989 },
  { year: "2018", value: 1183405 },
  { year: "2019", value: 1109236 },
  { year: "2020", value: 1658968 },
  { year: "2021", value: 3991695 },
  { year: "2022", value: 2205818 },
  { year: "2023", value: 2586122 },
  { year: "2024", value: 12662008 },
  { year: "2025", value: 27020968 },
  { year: "2026", value: 12861952 },
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
  { name: "California Institute of Technology", value: 47891 },
  { name: "UNIVERSITY OF STUTTGART", value: 45166 },
  { name: "Other", value: 4886995 },
]);

const fields = ref([
  { name: "Physics and Astronomy", value: 24779096 },
  { name: "Engineering", value: 12011594 },
  { name: "Biochemistry, Genetics and Molecular Biology", value: 7098129 },
  { name: "Agricultural and Biological Sciences", value: 5682791 },
  { name: "Computer Science", value: 4145863 },
  { name: "Medicine", value: 3922121 },
  { name: "Social Sciences", value: 2332859 },
  { name: "Environmental Science", value: 1971798 },
  { name: "Materials Science", value: 1584821 },
  { name: "Earth and Planetary Sciences", value: 1393010 },
  { name: "Other", value: 5414702 },
]);

const sIndexMetrics = computed(() => [
  {
    name: "Datasets registered",
    value: 70336850,
    description: "Total number of datasets registered in the platform",
    learnMoreUrl: "https://docs.scholardata.io/data-collection/datasets",
  },
  {
    name: "Total citations identified",
    value: 8610545,
    description: "Total number of citations identified in the platform",
    learnMoreUrl: "https://docs.scholardata.io/data-collection/citations",
  },
  {
    name: "Total mentions identified",
    value: 91891,
    description: "Total number of mentions identified in the platform",
    learnMoreUrl: "https://docs.scholardata.io/data-collection/mentions",
  },
  {
    name: "Total FAIR scores computed",
    value: 70336845,
    description:
      "Total number of FAIR scores computed for datasets in the platform",
    learnMoreUrl: "https://docs.scholardata.io/data-collection/fair-scores",
  },
  {
    name: "Total Research Fields assigned",
    value: 70336850,
    description:
      "Total number of research fields assigned to datasets in the platform",
    learnMoreUrl: "https://docs.scholardata.io/data-collection/research-fields",
  },
  {
    name: "Total Dataset Indices computed",
    value: 71660358,
    description: "Total number of  dataset index records in our database",
    learnMoreUrl: "https://docs.scholardata.io/data-collection/datasets",
  },
  {
    name: "Researcher Accounts",
    value: platformMetrics.value?.userCount ?? 0,
    description: "Profiles created and actively managed by researchers",
  },
  {
    name: "Generated Profiles",
    value: 4226528,
    description: "Researcher profiles automatically generated for demo purpose",
    learnMoreUrl: "https://docs.scholardata.io/data-collection/auto-profiles",
  },
]);

const sources = ref([
  {
    name: "Make Data Count corpus",
    value: 9.7,
    suffix: "M+",
    description: "Parsed citations to find citations to our datasets.",
    learnMoreUrl:
      "https://docs.scholardata.io/data-collection/citations#make-data-count-mdc-data-citation-corpus",
  },
  {
    name: "OpenAlex",
    value: 450,
    suffix: "M+",
    description: "Works analyzed for dataset citations.",
    learnMoreUrl:
      "https://docs.scholardata.io/data-collection/citations#openalex",
  },
  {
    name: "Software Heritage",
    value: 220,
    suffix: "M+",
    description: "READMEs from GitHub repos scanned for dataset mentions.",
    learnMoreUrl:
      "https://docs.scholardata.io/data-collection/mentions#software-heritage",
  },
  {
    name: "Hugging Face",
    value: 2.2,
    suffix: "M+",
    description: "Model cards scanned for dataset mentions.",
    learnMoreUrl:
      "https://docs.scholardata.io/data-collection/mentions#hugging-face",
  },
  {
    name: "USPTO",
    value: 6.4,
    suffix: "M+",
    description: "Granted patents scanned for dataset mentions.",
    learnMoreUrl:
      "https://docs.scholardata.io/data-collection/mentions#uspto-patents",
  },
]);

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
      fontSize: 12,
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
    formatter: (params: unknown) => {
      const item = params as {
        name: string;
        value: number;
        percent: number;
        seriesName: string;
      };
      if (!item) return "";

      const name = item.name ?? "";
      const value = formatNumber(item.value);
      const percent = item.percent.toFixed(1);

      return `${name}<br/>Datasets: ${value} (${percent}%)`;
    },
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
    formatter: (params: unknown) => {
      const item = params as {
        name: string;
        value: number;
        percent: number;
        seriesName: string;
      };
      if (!item) return "";

      const name = item.name ?? "";
      const value = formatNumber(item.value);
      const percent = item.percent.toFixed(1);

      return `${name}<br/>Datasets: ${value} (${percent}%)`;
    },
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
      :ui="{
        container: '!pb-10',
      }"
    />

    <div class="mb-6 grid grid-cols-1 gap-6 md:grid-cols-3">
      <UCard v-for="metric in sIndexMetrics" :key="metric.name">
        <template #header>
          <h3 class="text-lg font-semibold">{{ metric.name }}</h3>
        </template>

        <div class="text-3xl font-bold text-pink-600">
          {{ formatNumber(metric.value) }}
        </div>

        <p class="mt-2 text-sm">{{ metric.description }}</p>

        <template v-if="metric.learnMoreUrl" #footer>
          <UButton
            :to="metric.learnMoreUrl"
            target="_blank"
            rel="noopener noreferrer"
            color="primary"
            variant="link"
            size="sm"
            trailing-icon="i-heroicons-arrow-top-right-on-square"
            class="p-0"
          >
            Learn more
          </UButton>
        </template>
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

    <div class="flex flex-col gap-10 py-10">
      <div class="flex flex-col gap-2">
        <h3 class="text-center text-3xl font-bold">Sources of data</h3>

        <p class="text-center text-lg text-gray-500">
          We use the following sources to identify dataset mentions and
          citations.
        </p>
      </div>

      <Vue3Marquee
        clone
        gradient
        :gradient-color="[250, 250, 250]"
        :pause-on-hover="true"
      >
        <div class="m-1 flex flex-nowrap gap-4 p-1">
          <UCard
            v-for="source in sources"
            :key="source.name"
            class="w-[min(320px,85vw)] shrink-0"
          >
            <template #header>
              <h3 class="text-lg font-semibold">{{ source.name }}</h3>
            </template>

            <div
              v-if="source.value != null"
              class="text-3xl font-bold text-pink-600"
            >
              {{ formatNumber(source.value!) }}{{ source.suffix ?? "" }}
            </div>

            <p class="mt-2 text-sm">{{ source.description }}</p>

            <template v-if="source.learnMoreUrl" #footer>
              <UButton
                :to="source.learnMoreUrl"
                target="_blank"
                rel="noopener noreferrer"
                color="primary"
                variant="link"
                size="sm"
                trailing-icon="i-heroicons-arrow-top-right-on-square"
                class="p-0"
              >
                Learn more
              </UButton>
            </template>
          </UCard>
        </div>
      </Vue3Marquee>
    </div>
  </div>
</template>

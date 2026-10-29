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

type NamedCount = { name: string; value: number };

const { data: platformMetrics } = await useFetch<{
  userCount: number;
  counts: Record<string, number>;
  datasetsByYear: { year: string; value: number }[];
  institutions: NamedCount[];
  fields: NamedCount[];
  publishers: NamedCount[];
  licenses: NamedCount[];
  updated: string | null;
}>("/api/metrics");

const counts = computed(() => platformMetrics.value?.counts ?? {});
const datasetsByYear = computed(
  () => platformMetrics.value?.datasetsByYear ?? [],
);

const sIndexMetrics = computed(() => [
  {
    name: "Datasets registered",
    value: counts.value.datasets ?? 0,
    description: "Total number of datasets registered in the platform",
    learnMoreUrl: "https://docs.scholardata.io/data-collection/datasets",
  },
  {
    name: "Total citations identified",
    value: counts.value.citations ?? 0,
    description: "Total number of citations identified in the platform",
    learnMoreUrl: "https://docs.scholardata.io/data-collection/citations",
  },
  {
    name: "Total mentions identified",
    value: counts.value.mentions ?? 0,
    description: "Total number of mentions identified in the platform",
    learnMoreUrl: "https://docs.scholardata.io/data-collection/mentions",
  },
  {
    name: "Total FAIR scores computed",
    value: counts.value.fairScores ?? 0,
    description:
      "Total number of FAIR scores computed for datasets in the platform",
    learnMoreUrl: "https://docs.scholardata.io/data-collection/fair-scores",
  },
  {
    name: "Total Research Fields assigned",
    value: counts.value.researchFields ?? 0,
    description:
      "Total number of research fields assigned to datasets in the platform",
    learnMoreUrl: "https://docs.scholardata.io/data-collection/research-fields",
  },
  {
    name: "Total Dataset Indices computed",
    value: counts.value.datasetIndices ?? 0,
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
    value: counts.value.generatedProfiles ?? 0,
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
const institutionData = computed(
  () => platformMetrics.value?.institutions ?? [],
);
const fieldData = computed(() => platformMetrics.value?.fields ?? []);
const publisherData = computed(() => platformMetrics.value?.publishers ?? []);
const licenseData = computed(() => platformMetrics.value?.licenses ?? []);

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

const publisherPieChartOption = computed(() => ({
  title: {
    text: "Datasets by Publisher",
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
      name: "Publisher",
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
      data: publisherData.value,
    },
  ],
}));

const licensePieChartOption = computed(() => ({
  title: {
    text: "Datasets by License",
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
      name: "License",
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
      data: licenseData.value,
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

    <ClientOnly>
      <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <UCard>
          <div style="height: 700px">
            <VChart
              v-if="publisherData.length > 0"
              :option="publisherPieChartOption"
            />

            <div
              v-else
              class="flex h-full items-center justify-center text-gray-500"
            >
              No publisher data available
            </div>
          </div>
        </UCard>

        <UCard>
          <div style="height: 700px">
            <VChart
              v-if="licenseData.length > 0"
              :option="licensePieChartOption"
            />

            <div
              v-else
              class="flex h-full items-center justify-center text-gray-500"
            >
              No license data available
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

<script setup lang="ts">
import type { Author } from "#shared/types/dataset";

const route = useRoute();
const toast = useToast();

const { datasetid } = route.params as { datasetid: string };

const { data: dataset, error } = await useFetch(`/api/dataset/${datasetid}`, {
  method: "GET",
});

if (error.value) {
  toast.add({
    title: "Error fetching dataset",
    description: error.value.data?.statusMessage,
    icon: "material-symbols:error",
    color: "error",
  });
}

useSeoMeta({
  title: dataset.value?.title || "Dataset Details",
  description: dataset.value?.description || "Dataset information",
});

const getAuthorTooltipText = (author: Author): string => {
  const parts: string[] = [];
  const affiliations = author.affiliations || [];

  if (Array.isArray(affiliations) && affiliations.length > 0) {
    parts.push(`Affiliations: ${affiliations.join("; ")}`);
  }

  return parts.length > 0 ? parts.join("\n") : "No additional information";
};

const citationsCount = computed(() => dataset.value?.citations?.length || 0);
const mentionsCount = computed(() => dataset.value?.mentions?.length || 0);

// Pagination for citations
const citationsPage = ref(1);
const citationsPerPage = 10;
const paginatedCitations = computed(() => {
  if (!dataset.value?.citations || citationsCount.value <= citationsPerPage) {
    return dataset.value?.citations || [];
  }

  const start = (citationsPage.value - 1) * citationsPerPage;
  const end = start + citationsPerPage;

  return dataset.value.citations.slice(start, end);
});

// Process d-index data for chart (by date)
const dIndexChartData = computed(() => {
  if (!dataset.value?.dindices || dataset.value.dindices.length === 0) {
    return { dates: [], scores: [] };
  }

  // Sort by date ascending (earliest first)
  const sorted = [...dataset.value.dindices].sort(
    (a, b) => new Date(a.created).getTime() - new Date(b.created).getTime(),
  );

  // Get earliest date and current date
  const earliestDate = new Date(sorted[0]!.created);
  const now = new Date();
  const endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Generate monthly data points from earliest to now
  const dates: string[] = [];
  const scores: number[] = [];
  let currentDate = new Date(earliestDate);
  let lastKnownScore = sorted[0]!.score;

  // Generate data points monthly
  while (currentDate <= endDate) {
    const dateStr = currentDate.toISOString().split("T")[0]!;
    dates.push(dateStr);

    // Find the most recent d-index value up to this date
    const relevantDIndex = sorted
      .filter((d) => new Date(d.created) <= currentDate)
      .pop();

    if (relevantDIndex) {
      lastKnownScore = relevantDIndex.score;
    }

    scores.push(lastKnownScore);

    // Move to next month
    currentDate = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth() + 1,
      1,
    );
  }

  return { dates, scores, earliestDate, endDate };
});

// Chart option for d-index over time
const dIndexChartOption = computed<ECOption>(() => ({
  tooltip: {
    trigger: "axis",
    formatter: (params: unknown) => {
      const data = params as Array<{
        name: string;
        value: number;
      }>;

      if (!data || data.length === 0) return "";

      const dateStr = data[0]?.name;

      if (!dateStr) return "";

      const date = new Date(dateStr);
      const formattedDate = date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });

      return `${formattedDate}<br/>D-Index: ${data[0]?.value.toFixed(2)}`;
    },
  },
  grid: {
    left: "3%",
    right: "4%",
    bottom: "3%",
    containLabel: true,
  },
  xAxis: {
    type: "time",
    min: dIndexChartData.value.earliestDate
      ? dIndexChartData.value.earliestDate.toISOString().split("T")[0]
      : undefined,
    max: dIndexChartData.value.endDate
      ? dIndexChartData.value.endDate.toISOString().split("T")[0]
      : undefined,
    axisLabel: {
      fontSize: 12,
      formatter: (value: number | string) => {
        const date = new Date(typeof value === "number" ? value : value);

        return date.getFullYear().toString();
      },
    },
  },
  yAxis: {
    type: "value",
    name: "D-Index",
    nameLocation: "middle",
    nameGap: 40,
    axisLabel: {
      formatter: "{value}",
    },
  },
  series: [
    {
      name: "D-Index",
      type: "line",
      data: dIndexChartData.value.dates.map((date, index) => [
        date,
        dIndexChartData.value.scores[index],
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
              color: "rgba(59, 130, 246, 0.3)",
            },
            {
              offset: 1,
              color: "rgba(59, 130, 246, 0.05)",
            },
          ],
        },
      },
    },
  ],
}));
</script>

<template>
  <UContainer>
    <UPage v-if="dataset">
      <UPageHeader>
        <div class="flex flex-col space-y-2">
          <div class="flex items-center gap-2">
            <div class="flex items-center gap-1">
              <UIcon name="i-heroicons-calendar-20-solid" class="h-4 w-4" />

              <p class="text-sm font-light">
                Published on
                {{ $dayjs(dataset.publishedAt).format("DD MMMM YYYY") }}
                {{ dataset.version ? `| ` : "" }}
              </p>
            </div>

            <UBadge
              v-if="dataset.version"
              color="success"
              variant="soft"
              size="sm"
              :label="`Version ${dataset.version}`"
              icon="i-heroicons-tag-20-solid"
            />
          </div>

          <div class="flex items-center justify-between gap-2">
            <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {{ dataset.title }}
            </h1>

            <UButton
              color="primary"
              variant="solid"
              :to="`https://doi.org/${dataset.identifier}`"
              target="_blank"
              rel="noopener noreferrer"
              icon="i-heroicons-arrow-top-right-on-square-20-solid"
              label="View Dataset"
            />
          </div>

          <div
            v-if="
              dataset.datasetAuthors &&
              Array.isArray(dataset.datasetAuthors) &&
              dataset.datasetAuthors.length > 0
            "
          >
            <div class="flex flex-wrap gap-1 text-sm">
              <template
                v-for="(
                  author, index
                ) in dataset.datasetAuthors as unknown as Author[]"
                :key="index"
              >
                <UTooltip :text="getAuthorTooltipText(author)">
                  <span
                    class="hover:text-primary-600 dark:hover:text-primary-400 cursor-help font-normal underline decoration-dotted underline-offset-2 transition-colors"
                  >
                    {{ author.name || "Unknown Author"
                    }}<span v-if="index < dataset.datasetAuthors.length - 1"
                      >;</span
                    >
                  </span>
                </UTooltip>
              </template>
            </div>
          </div>
        </div>
      </UPageHeader>

      <UPageBody>
        <div v-if="dataset" class="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <!-- Main Content -->
          <div class="flex flex-col gap-4 lg:col-span-2">
            <UCard>
              <template #header>
                <div class="flex items-start justify-between gap-2">
                  <h3 class="text-lg font-semibold">Description</h3>
                </div>
              </template>

              <div class="space-y-3">
                <div v-if="dataset.description">
                  <MarkdownRenderer :content="dataset.description" />
                </div>

                <p v-else class="text-gray-500 dark:text-gray-400">
                  No description available.
                </p>
              </div>
            </UCard>

            <!-- Citations -->
            <CardCollapsibleContent
              :title="`Citations (${citationsCount})`"
              :collapse="citationsCount > 0 ? false : true"
            >
              <ul v-if="citationsCount > 0" class="list-none">
                <li
                  v-for="(citation, index) in paginatedCitations"
                  :key="index"
                >
                  <div
                    class="mb-2 flex-1 space-y-1 rounded-lg border border-gray-200 p-3 shadow-sm dark:border-gray-700"
                  >
                    <NuxtLink
                      :href="citation.citationLink"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="font-mono text-blue-600 hover:underline dark:text-blue-400"
                    >
                      {{ citation.citationLink }}
                    </NuxtLink>

                    <div class="flex items-center justify-between gap-2">
                      <p v-if="citation.citedDate" class="text-sm">
                        Cited on
                        {{ $dayjs(citation.citedDate).format("DD MMMM YYYY") }}
                      </p>

                      <div class="flex flex-wrap gap-2">
                        <UBadge
                          v-if="citation.datacite"
                          color="success"
                          variant="subtle"
                          size="sm"
                        >
                          DataCite
                        </UBadge>

                        <UTooltip
                          text="This citation was found in the Make Data Count (MDC) database."
                        >
                          <UBadge
                            v-if="citation.mdc"
                            color="success"
                            variant="subtle"
                            size="sm"
                            class="cursor-help"
                          >
                            MDC
                          </UBadge>
                        </UTooltip>

                        <UBadge
                          v-if="citation.openAlex"
                          color="success"
                          variant="subtle"
                          size="sm"
                        >
                          OpenAlex
                        </UBadge>
                      </div>
                    </div>
                  </div>
                </li>
              </ul>

              <UEmpty
                v-else
                title="No citations found"
                description="It looks like this dataset has no citations."
              />

              <div
                v-if="citationsCount > citationsPerPage"
                class="mt-4 flex justify-center"
              >
                <UPagination
                  v-model:page="citationsPage"
                  :total="citationsCount"
                  :page-size="citationsPerPage"
                />
              </div>
            </CardCollapsibleContent>

            <!-- Mentions -->
            <CardCollapsibleContent
              :title="`Mentions (${mentionsCount})`"
              :collapse="mentionsCount > 0 ? false : true"
            >
              <ul v-if="mentionsCount > 0" class="list-none">
                <li v-for="(mention, index) in dataset.mentions" :key="index">
                  <div
                    class="flex-1 space-y-1 rounded-lg border border-gray-200 p-3 shadow-sm dark:border-gray-700"
                  >
                    <p class="text-sm">{{ mention.mentionLink }}</p>
                  </div>
                </li>
              </ul>

              <UEmpty
                v-else
                title="No mentions found"
                description="It looks like this dataset has not been mentioned in any sources."
              />
            </CardCollapsibleContent>
          </div>

          <!-- Sidebar -->
          <div class="space-y-6">
            <!-- Metrics -->
            <UCard
              v-if="
                (dataset.fujiScore && dataset.fujiScore.score !== null) ||
                (dataset.dindices && dataset.dindices.length > 0)
              "
            >
              <template #header>
                <h3 class="text-lg font-semibold">Metrics</h3>
              </template>

              <div class="space-y-4">
                <div class="grid grid-cols-2 gap-6">
                  <div
                    v-if="dataset.fujiScore && dataset.fujiScore.score !== null"
                    class="flex flex-col items-center text-center"
                  >
                    <p class="mb-2 text-sm font-medium">FAIR Score</p>

                    <div class="flex items-center gap-2">
                      <div
                        class="text-primary-600 dark:text-primary-400 text-3xl font-bold"
                      >
                        {{ Math.round(dataset.fujiScore.score) }}
                      </div>

                      <div class="text-sm text-gray-500 dark:text-gray-400">
                        / 100
                      </div>
                    </div>
                  </div>

                  <div
                    v-if="
                      dataset.dindices &&
                      dataset.dindices.length > 0 &&
                      dataset.dindices[0]
                    "
                    class="flex flex-col items-center text-center"
                  >
                    <p class="mb-2 text-sm font-medium">D-Index</p>

                    <div class="flex items-center gap-2">
                      <div
                        class="text-primary-600 dark:text-primary-400 text-3xl font-bold"
                      >
                        {{ Math.round(dataset.dindices[0].score) }}
                      </div>
                    </div>
                  </div>
                </div>

                <ClientOnly>
                  <div class="border-t border-gray-200 dark:border-gray-700">
                    <div style="height: 200px" class="relative">
                      <div
                        v-if="
                          !dataset.dindices ||
                          dataset.dindices.length === 0 ||
                          dIndexChartData.dates.length === 0
                        "
                        class="flex h-full items-center justify-center"
                      >
                        <Icon
                          name="i-lucide-loader-circle"
                          class="h-14 w-14 animate-spin text-gray-500 dark:text-gray-400"
                        />
                      </div>

                      <VChart
                        v-else
                        :option="dIndexChartOption"
                        class="h-full w-full"
                      />
                    </div>
                  </div>

                  <template #fallback>
                    <div
                      style="height: 200px"
                      class="flex items-center justify-center"
                    >
                      <Icon
                        name="i-lucide-loader-circle"
                        class="h-14 w-14 animate-spin text-gray-500 dark:text-gray-400"
                      />
                    </div>
                  </template>
                </ClientOnly>
              </div>
            </UCard>

            <!-- Publisher and DOI -->
            <UCard v-if="dataset.identifier || dataset.publisher">
              <template #header>
                <h3 class="text-lg font-semibold">Publication Details</h3>
              </template>

              <div class="space-y-3">
                <div v-if="dataset.identifier">
                  <p class="mb-1 text-sm font-medium">DOI</p>

                  <a
                    :href="`https://doi.org/${dataset.identifier}`"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="inline-block"
                  >
                    <UBadge
                      color="success"
                      variant="subtle"
                      :label="dataset.identifier"
                      icon="i-heroicons-link-20-solid"
                      class="cursor-pointer"
                    />
                  </a>
                </div>

                <div v-if="dataset.publisher">
                  <p class="mb-1 text-sm font-medium">Publisher</p>

                  <p class="text-sm text-gray-700 dark:text-gray-300">
                    {{ dataset.publisher }}
                  </p>
                </div>
              </div>
            </UCard>

            <!-- Subjects -->
            <UCard v-if="dataset.subjects && dataset.subjects.length > 0">
              <template #header>
                <h3 class="text-lg font-semibold">Subjects</h3>
              </template>

              <div class="flex flex-wrap gap-2">
                <UBadge
                  v-for="(subject, index) in dataset.subjects"
                  :key="index"
                  color="info"
                  variant="subtle"
                >
                  {{ subject }}
                </UBadge>
              </div>
            </UCard>

            <!-- Additional Information Card -->
            <UCard v-if="dataset.domain">
              <template #header>
                <h3 class="text-lg font-semibold">Additional Information</h3>
              </template>

              <div class="space-y-3">
                <div v-if="dataset.domain">
                  <p class="mb-1 text-sm font-medium">Domain</p>

                  <p class="text-sm text-gray-700 dark:text-gray-300">
                    {{ dataset.domain }}
                  </p>
                </div>
              </div>
            </UCard>
          </div>
        </div>
      </UPageBody>
    </UPage>
  </UContainer>
</template>

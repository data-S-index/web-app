<script setup lang="ts">
import UserDatasetList from "~/components/user/UserDatasetList.vue";
import type { DatasetListItem } from "~/components/user/UserDatasetList.vue";

interface AuthorDatasetItem {
  datasetId: number;
  dataset: {
    dindices?: Array<{ score: number; year: number }>;
    citations: Array<unknown>;
    mentions: Array<unknown>;
    fujiScore?: { score: number | null };
    datasetAuthors?: Array<{ name?: string; affiliations?: string[] }>;
    title?: string;
    description?: string | null;
    identifier?: string;
    version?: string | null;
    publishedAt?: Date | string | null;
  };
}

interface AuthorDatasetsResponse {
  datasets: AuthorDatasetItem[];
  totalDatasets: number;
  currentSIndex: number;
  averageFairScore: number;
  totalCitations: number;
}

const route = useRoute();
const toast = useToast();

const auid = (route.params.auid as string) ?? "";

useSeoMeta({
  title: "Researcher Profile",
  description: "View this researcher's profile and datasets on Scholar Data.",
});

defineOgImageComponent("Pergel", {
  headline: "Scholar Data",
});

const { data: author, error: authorError } = await useFetch(`/api/au/${auid}`);

if (authorError.value) {
  toast.add({
    title: "Error loading author",
    description: authorError.value.data?.statusMessage,
    icon: "material-symbols:error",
    color: "error",
  });
}

const { data: authorData, error } = await useFetch(`/api/au/${auid}/datasets`);

if (error.value) {
  toast.add({
    title: "Error fetching datasets",
    description: error.value.data?.statusMessage,
    icon: "material-symbols:error",
    color: "error",
  });
}

const displayName = computed(
  () => author.value?.name || author.value?.id || "Author",
);

useSeoMeta({
  title: `${displayName.value}`,
  description: "View this researcher's profile and datasets on Scholar Data.",
});

const response = computed(
  () => (authorData.value as AuthorDatasetsResponse | null) ?? null,
);
const datasets = computed(() => response.value?.datasets ?? []);

// Computed metrics for the 6 cards (use server values where provided)
const sindex = computed(() => response.value?.currentSIndex ?? 0);

const datasetCount = computed(() => response.value?.totalDatasets ?? 0);

const totalCitations = computed(() => response.value?.totalCitations ?? 0);

const totalMentions = computed(() => {
  const list = datasets.value;
  if (!list.length) return 0;

  return list.reduce(
    (sum: number, item: AuthorDatasetItem) =>
      sum + item.dataset.mentions.length,
    0,
  );
});

const averageFairScore = computed(() => response.value?.averageFairScore ?? 0);

// S-index over time by year (aggregated across all datasets)
const sindexOverTime = computed(() => {
  const list = datasets.value;
  if (!list.length) return { years: [], scores: [] };

  const allDIndices: Array<{ year: number; score: number; datasetId: number }> =
    [];

  list.forEach((item) => {
    if (item.dataset.dindices && item.dataset.dindices.length > 0) {
      item.dataset.dindices.forEach((dindex) => {
        allDIndices.push({
          year: dindex.year,
          score: dindex.score,
          datasetId: item.datasetId,
        });
      });
    }
  });

  if (allDIndices.length === 0) return { years: [], scores: [] };

  allDIndices.sort((a, b) => a.year - b.year);

  // Start from earliest dataset publishedAt year
  const publishedYears = list
    .map((item) => item.dataset.publishedAt)
    .filter(Boolean)
    .map((d) => new Date(d!).getFullYear());
  const minYear =
    publishedYears.length > 0
      ? Math.min(...publishedYears)
      : allDIndices[0]!.year;
  const currentYear = new Date().getFullYear();

  const years: number[] = [];
  const scores: number[] = [];

  for (let y = minYear; y <= currentYear; y++) {
    years.push(y);
    const datasetLatestDIndex = new Map<
      number,
      { score: number; year: number }
    >();

    allDIndices.forEach((d) => {
      if (d.year <= y) {
        const existing = datasetLatestDIndex.get(d.datasetId);
        if (!existing || d.year > existing.year) {
          datasetLatestDIndex.set(d.datasetId, {
            score: d.score,
            year: d.year,
          });
        }
      }
    });

    let sindexValue = 0;
    datasetLatestDIndex.forEach((entry) => {
      sindexValue += entry.score;
    });
    scores.push(sindexValue);
  }

  return { years, scores };
});

// Cumulative citations (raw and weighted) across all datasets
const cumulativeCitations = computed(() => {
  const list = datasets.value;
  if (!list.length) {
    return {
      dates: [],
      rawValues: [],
      weightedValues: [],
      earliestDate: null,
      endDate: null,
    };
  }
  const allCitations: Array<{ date: Date; weight: number }> = [];

  list.forEach((item) => {
    if (item.dataset.citations && Array.isArray(item.dataset.citations)) {
      (
        item.dataset.citations as Array<{
          citedDate?: string | null;
          citationWeight?: number | null;
        }>
      ).forEach((citation) => {
        if (citation.citedDate) {
          allCitations.push({
            date: new Date(citation.citedDate),
            weight: citation.citationWeight ?? 1.0,
          });
        }
      });
    }
  });

  if (allCitations.length === 0) {
    return {
      dates: [],
      rawValues: [],
      weightedValues: [],
      earliestDate: null,
      endDate: null,
    };
  }

  allCitations.sort((a, b) => a.date.getTime() - b.date.getTime());
  const publishedYears = list
    .map((item) => item.dataset.publishedAt)
    .filter(Boolean)
    .map((d) => new Date(d!).getFullYear());
  const startYear =
    publishedYears.length > 0
      ? Math.min(...publishedYears)
      : allCitations[0]!.date.getFullYear();
  const endYear = new Date().getFullYear() - 1; // current year - 1
  const citationsByYear = new Map<number, { raw: number; weighted: number }>();

  allCitations.forEach((citation) => {
    const year = citation.date.getFullYear();
    const existing = citationsByYear.get(year) || { raw: 0, weighted: 0 };
    citationsByYear.set(year, {
      raw: existing.raw + 1,
      weighted: existing.weighted + citation.weight,
    });
  });

  const dates: string[] = [];
  const rawValues: number[] = [];
  const weightedValues: number[] = [];
  let cumulativeRaw = 0;
  let cumulativeWeighted = 0;

  for (let year = startYear; year <= endYear; year++) {
    dates.push(String(year));
    const yearCitations = citationsByYear.get(year);
    if (yearCitations) {
      cumulativeRaw += yearCitations.raw;
      cumulativeWeighted += yearCitations.weighted;
    }
    rawValues.push(cumulativeRaw);
    weightedValues.push(cumulativeWeighted);
  }

  return {
    dates,
    rawValues,
    weightedValues,
    earliestDate: new Date(startYear, 0, 1),
    endDate: new Date(endYear, 11, 31),
  };
});

// Cumulative mentions (raw and weighted) across all datasets
const cumulativeMentions = computed(() => {
  const list = datasets.value;
  if (!list.length) {
    return {
      dates: [],
      rawValues: [],
      weightedValues: [],
      earliestDate: null,
      endDate: null,
    };
  }

  const allMentions: Array<{ date: Date; weight: number }> = [];

  list.forEach((item) => {
    if (item.dataset.mentions && Array.isArray(item.dataset.mentions)) {
      (
        item.dataset.mentions as Array<{
          mentionedDate?: string | null;
          mentionWeight?: number | null;
        }>
      ).forEach((mention) => {
        if (mention.mentionedDate) {
          allMentions.push({
            date: new Date(mention.mentionedDate),
            weight: mention.mentionWeight ?? 1.0,
          });
        }
      });
    }
  });

  if (allMentions.length === 0) {
    return {
      dates: [],
      rawValues: [],
      weightedValues: [],
      earliestDate: null,
      endDate: null,
    };
  }

  allMentions.sort((a, b) => a.date.getTime() - b.date.getTime());
  const publishedYearsM = list
    .map((item) => item.dataset.publishedAt)
    .filter(Boolean)
    .map((d) => new Date(d!).getFullYear());
  const startYear =
    publishedYearsM.length > 0
      ? Math.min(...publishedYearsM)
      : allMentions[0]!.date.getFullYear();
  const endYear = new Date().getFullYear() - 1; // current year - 1
  const mentionsByYear = new Map<number, { raw: number; weighted: number }>();

  allMentions.forEach((mention) => {
    const year = mention.date.getFullYear();
    const existing = mentionsByYear.get(year) || { raw: 0, weighted: 0 };
    mentionsByYear.set(year, {
      raw: existing.raw + 1,
      weighted: existing.weighted + mention.weight,
    });
  });

  const dates: string[] = [];
  const rawValues: number[] = [];
  const weightedValues: number[] = [];
  let cumulativeRaw = 0;
  let cumulativeWeighted = 0;

  for (let year = startYear; year <= endYear; year++) {
    dates.push(String(year));
    const yearMentions = mentionsByYear.get(year);
    if (yearMentions) {
      cumulativeRaw += yearMentions.raw;
      cumulativeWeighted += yearMentions.weighted;
    }
    rawValues.push(cumulativeRaw);
    weightedValues.push(cumulativeWeighted);
  }

  return {
    dates,
    rawValues,
    weightedValues,
    earliestDate: new Date(startYear, 0, 1),
    endDate: new Date(endYear, 11, 31),
  };
});
</script>

<template>
  <UContainer>
    <UPage>
      <UPageHeader
        v-if="author"
        :ui="{
          container: 'flex w-full flex-1',
        }"
      >
        <template #title>
          <div class="flex flex-col gap-2">
            <UTooltip
              text="This profile was automatically generated by the Scholar Data platform"
            >
              <UBadge
                class="w-max cursor-help"
                color="warning"
                variant="subtle"
                label="Automated Author Profile"
                icon="ic:round-auto-awesome"
              />
            </UTooltip>

            <h1 class="text-2xl font-bold">
              {{ displayName }}
            </h1>

            <div
              v-if="author.affiliations?.length"
              class="flex flex-wrap gap-2"
            >
              <UBadge
                v-for="value in author.affiliations"
                :key="value"
                color="primary"
                variant="subtle"
                :label="value"
              />
            </div>

            <div
              v-if="author.nameIdentifiers?.length"
              class="flex flex-wrap gap-2"
            >
              <UBadge
                v-for="value in author.nameIdentifiers"
                :key="value"
                color="secondary"
                variant="subtle"
                :icon="
                  value.includes('orcid')
                    ? 'simple-icons:orcid'
                    : value.includes('ror')
                      ? 'academicons:ror'
                      : 'mdi:identifier'
                "
                :label="value"
              />
            </div>
          </div>
        </template>

        <template #links />
      </UPageHeader>

      <UPageBody v-if="author">
        <div class="mb-6 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          <UCard>
            <template #header>
              <h3 class="text-lg font-semibold">Current S-Index</h3>
            </template>

            <div class="text-3xl font-bold text-pink-600">
              {{ sindex.toFixed(1) }}
            </div>

            <p class="mt-2 text-sm">Sum of D-Index scores for all datasets</p>
          </UCard>

          <UCard>
            <template #header>
              <h3 class="text-lg font-semibold">Average D-Index per Dataset</h3>
            </template>

            <div class="text-3xl font-bold text-pink-500">
              {{ datasetCount ? (sindex / datasetCount).toFixed(1) : "0.0" }}
            </div>

            <p class="mt-2 text-sm">Average D-Index score per dataset</p>
          </UCard>

          <UCard>
            <template #header>
              <h3 class="text-lg font-semibold">Total Datasets</h3>
            </template>

            <div class="text-3xl font-bold text-pink-600">
              {{ datasetCount }}
            </div>

            <p class="mt-2 text-sm">Total datasets for this author</p>
          </UCard>

          <UCard>
            <template #header>
              <h3 class="text-lg font-semibold">Average FAIR Score</h3>
            </template>

            <div class="text-3xl font-bold text-pink-500">
              {{ averageFairScore.toFixed(1) }}%
            </div>

            <p class="mt-2 text-sm">Average FAIR Score per dataset</p>
          </UCard>

          <UCard>
            <template #header>
              <h3 class="text-lg font-semibold">Total Citations</h3>
            </template>

            <div class="text-3xl font-bold text-pink-500">
              {{ totalCitations }}
            </div>

            <p class="mt-2 text-sm">Total citations to the author's datasets</p>
          </UCard>

          <UCard>
            <template #header>
              <h3 class="text-lg font-semibold">Total Mentions</h3>
            </template>

            <div class="text-3xl font-bold text-pink-600">
              {{ totalMentions }}
            </div>

            <p class="mt-2 text-sm">Total mentions of the author's datasets</p>
          </UCard>
        </div>

        <USeparator />

        <UserMetricsSection
          :sindex="sindex"
          :dataset-count="datasetCount"
          :sindex-over-time="sindexOverTime"
          :cumulative-citations="cumulativeCitations"
          :cumulative-mentions="cumulativeMentions"
        />

        <h2 class="text-2xl font-bold">Datasets</h2>

        <UAlert
          v-if="datasets.length < datasetCount"
          color="warning"
          variant="solid"
          icon="material-symbols:warning"
          title="Limited datasets"
          description="Only the first 500 datasets are displayed."
        />

        <UserDatasetList :items="(datasets as DatasetListItem[])" />
      </UPageBody>

      <UPageBody v-else-if="authorError">
        <div class="py-12 text-center">
          <p class="text-base text-gray-500 dark:text-gray-400">
            Author not found or failed to load.
          </p>

          <UButton to="/search/au" color="primary" variant="soft" class="mt-4">
            Search authors
          </UButton>
        </div>
      </UPageBody>
    </UPage>
  </UContainer>
</template>

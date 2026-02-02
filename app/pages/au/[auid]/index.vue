<script setup lang="ts">
import UserDatasetList from "~/components/user/UserDatasetList.vue";

interface AuthorDatasetItem {
  datasetId: number;
  dataset: {
    dindices?: Array<{ score: number; created: string }>;
    citations: Array<unknown>;
    mentions: Array<unknown>;
    fujiScore?: { score: number | null };
    datasetAuthors?: Array<{ name?: string; affiliations?: string[] }>;
    title?: string;
    description?: string | null;
    identifier?: string;
    version?: string | null;
    publishedAt?: Date | string;
  };
}

const route = useRoute();
const toast = useToast();

const auid = (route.params.auid as string) ?? "";

useSeoMeta({
  title: "Author Profile",
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

const avatarUrl = computed(() => {
  const seed = author.value?.id || author.value?.name || "user";

  return `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(seed)}`;
});

const displayName = computed(
  () => author.value?.name || author.value?.id || "Author",
);

// Computed metrics for the 6 cards
const sindex = computed(() => {
  if (!authorData.value) return 0;

  return (authorData.value as AuthorDatasetItem[]).reduce(
    (sum: number, item: AuthorDatasetItem) =>
      sum + (item.dataset.dindices?.[0]?.score || 0),
    0,
  );
});

const datasetCount = computed(() => {
  return authorData.value?.length || 0;
});

const totalCitations = computed(() => {
  if (!authorData.value) return 0;

  return (authorData.value as AuthorDatasetItem[]).reduce(
    (sum: number, item: AuthorDatasetItem) =>
      sum + item.dataset.citations.length,
    0,
  );
});

const totalMentions = computed(() => {
  if (!authorData.value) return 0;

  return (authorData.value as AuthorDatasetItem[]).reduce(
    (sum: number, item: AuthorDatasetItem) =>
      sum + item.dataset.mentions.length,
    0,
  );
});

const averageFairScore = computed(() => {
  if (!authorData.value) return 0;

  const datasetsWithFairScore = (
    authorData.value as AuthorDatasetItem[]
  ).filter(
    (item: AuthorDatasetItem) =>
      item.dataset.fujiScore?.score !== null &&
      item.dataset.fujiScore?.score !== undefined,
  );
  if (datasetsWithFairScore.length === 0) return 0;

  const sum = datasetsWithFairScore.reduce(
    (sum: number, item: AuthorDatasetItem) =>
      sum + (item.dataset.fujiScore?.score || 0),
    0,
  );

  return sum / datasetsWithFairScore.length;
});

// S-index over time (aggregated across all datasets)
const sindexOverTime = computed(() => {
  if (!authorData.value)
    return { dates: [], scores: [], earliestDate: null, endDate: null };

  const datasets = authorData.value as AuthorDatasetItem[];
  const allDIndices: Array<{ date: Date; score: number; datasetId: number }> =
    [];

  datasets.forEach((item) => {
    if (item.dataset.dindices && item.dataset.dindices.length > 0) {
      item.dataset.dindices.forEach((dindex) => {
        allDIndices.push({
          date: new Date(dindex.created),
          score: dindex.score,
          datasetId: item.datasetId,
        });
      });
    }
  });

  if (allDIndices.length === 0) {
    return { dates: [], scores: [], earliestDate: null, endDate: null };
  }

  allDIndices.sort((a, b) => a.date.getTime() - b.date.getTime());
  const earliestDate = allDIndices[0]!.date;
  const now = new Date();
  const endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const currentDate = new Date(earliestDate);
  currentDate.setDate(1);

  const dates: string[] = [];
  const scores: number[] = [];

  while (currentDate <= endDate) {
    dates.push(currentDate.toISOString().split("T")[0]!);
    const datasetLatestDIndex = new Map<
      number,
      { score: number; date: Date }
    >();

    allDIndices.forEach((dindex) => {
      if (dindex.date <= currentDate) {
        const existing = datasetLatestDIndex.get(dindex.datasetId);
        if (!existing || dindex.date > existing.date) {
          datasetLatestDIndex.set(dindex.datasetId, {
            score: dindex.score,
            date: dindex.date,
          });
        }
      }
    });

    let sindexValue = 0;
    datasetLatestDIndex.forEach((entry) => {
      sindexValue += entry.score;
    });
    scores.push(sindexValue);
    currentDate.setMonth(currentDate.getMonth() + 1);
  }

  return { dates, scores, earliestDate, endDate };
});

// Cumulative citations (raw and weighted) across all datasets
const cumulativeCitations = computed(() => {
  if (!authorData.value) {
    return {
      dates: [],
      rawValues: [],
      weightedValues: [],
      earliestDate: null,
      endDate: null,
    };
  }

  const datasets = authorData.value as AuthorDatasetItem[];
  const allCitations: Array<{ date: Date; weight: number }> = [];

  datasets.forEach((item) => {
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
  const firstCitationDate = allCitations[0]!.date;
  const now = new Date();
  const lastCitationDate = allCitations[allCitations.length - 1]!.date;
  const endDate = lastCitationDate > now ? lastCitationDate : now;
  const startDate = firstCitationDate;
  const citationsByMonth = new Map<string, { raw: number; weighted: number }>();

  allCitations.forEach((citation) => {
    const monthKey = `${citation.date.getFullYear()}-${String(citation.date.getMonth() + 1).padStart(2, "0")}`;
    const existing = citationsByMonth.get(monthKey) || { raw: 0, weighted: 0 };
    citationsByMonth.set(monthKey, {
      raw: existing.raw + 1,
      weighted: existing.weighted + citation.weight,
    });
  });

  const dates: string[] = [];
  const rawValues: number[] = [];
  const weightedValues: number[] = [];
  let cumulativeRaw = 0;
  let cumulativeWeighted = 0;
  const currentDate = new Date(startDate);
  currentDate.setDate(1);

  while (currentDate <= endDate) {
    const monthKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}`;
    dates.push(currentDate.toISOString().split("T")[0]!);
    const monthCitations = citationsByMonth.get(monthKey);
    if (monthCitations) {
      cumulativeRaw += monthCitations.raw;
      cumulativeWeighted += monthCitations.weighted;
    }
    rawValues.push(cumulativeRaw);
    weightedValues.push(cumulativeWeighted);
    currentDate.setMonth(currentDate.getMonth() + 1);
  }

  return { dates, rawValues, weightedValues, earliestDate: startDate, endDate };
});

// Cumulative mentions (raw and weighted) across all datasets
const cumulativeMentions = computed(() => {
  if (!authorData.value) {
    return {
      dates: [],
      rawValues: [],
      weightedValues: [],
      earliestDate: null,
      endDate: null,
    };
  }

  const datasets = authorData.value as AuthorDatasetItem[];
  const allMentions: Array<{ date: Date; weight: number }> = [];

  datasets.forEach((item) => {
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
  const firstMentionDate = allMentions[0]!.date;
  const now = new Date();
  const lastMentionDate = allMentions[allMentions.length - 1]!.date;
  const endDate = lastMentionDate > now ? lastMentionDate : now;
  const startDate = firstMentionDate;
  const mentionsByMonth = new Map<string, { raw: number; weighted: number }>();

  allMentions.forEach((mention) => {
    const monthKey = `${mention.date.getFullYear()}-${String(mention.date.getMonth() + 1).padStart(2, "0")}`;
    const existing = mentionsByMonth.get(monthKey) || { raw: 0, weighted: 0 };
    mentionsByMonth.set(monthKey, {
      raw: existing.raw + 1,
      weighted: existing.weighted + mention.weight,
    });
  });

  const dates: string[] = [];
  const rawValues: number[] = [];
  const weightedValues: number[] = [];
  let cumulativeRaw = 0;
  let cumulativeWeighted = 0;
  const currentDate = new Date(startDate);
  currentDate.setDate(1);

  while (currentDate <= endDate) {
    const monthKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}`;
    dates.push(currentDate.toISOString().split("T")[0]!);
    const monthMentions = mentionsByMonth.get(monthKey);
    if (monthMentions) {
      cumulativeRaw += monthMentions.raw;
      cumulativeWeighted += monthMentions.weighted;
    }
    rawValues.push(cumulativeRaw);
    weightedValues.push(cumulativeWeighted);
    currentDate.setMonth(currentDate.getMonth() + 1);
  }

  return { dates, rawValues, weightedValues, earliestDate: startDate, endDate };
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
              {{ Math.round(sindex) }}
            </div>

            <p class="mt-2 text-sm">Sum of D-Index scores for all datasets</p>
          </UCard>

          <UCard>
            <template #header>
              <h3 class="text-lg font-semibold">Average D-Index per Dataset</h3>
            </template>

            <div class="text-3xl font-bold text-pink-500">
              {{ datasetCount ? Math.round(sindex / datasetCount) : 0 }}
            </div>

            <p class="mt-2 text-sm">Average D-Index score per dataset</p>
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
              <h3 class="text-lg font-semibold">Total Datasets</h3>
            </template>

            <div class="text-3xl font-bold text-pink-600">
              {{ datasetCount }}
            </div>

            <p class="mt-2 text-sm">Total datasets for this author</p>
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

        <UserDatasetList :items="authorData" />
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

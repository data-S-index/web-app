<script setup lang="ts">
import UserDatasetList from "~/components/user/UserDatasetList.vue";

interface OrgDatasetItem {
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

const aoid = (route.params.aoid as string) ?? "";

useSeoMeta({
  title: "Organization Profile",
  description: "View this organization's profile and datasets on Scholar Data.",
});

defineOgImageComponent("Pergel", {
  headline: "Scholar Data",
});

const { data: org, error: orgError } = await useFetch(`/api/ao/${aoid}`);

if (orgError.value) {
  toast.add({
    title: "Error loading organization",
    description: orgError.value.data?.statusMessage,
    icon: "material-symbols:error",
    color: "error",
  });
}

const { data: orgData, error } = await useFetch(`/api/ao/${aoid}/datasets`);

if (error.value) {
  toast.add({
    title: "Error fetching datasets",
    description: error.value.data?.statusMessage,
    icon: "material-symbols:error",
    color: "error",
  });
}

const displayName = computed(
  () => org.value?.name || org.value?.id || "Organization",
);

useSeoMeta({
  title: `${displayName.value}`,
  description: "View this organization's profile and datasets on Scholar Data.",
});

// Computed metrics for the 6 cards
const sindex = computed(() => {
  if (!orgData.value) return 0;

  return (orgData.value as OrgDatasetItem[]).reduce(
    (sum: number, item: OrgDatasetItem) =>
      sum + (item.dataset.dindices?.[0]?.score || 0),
    0,
  );
});

const datasetCount = computed(() => {
  return orgData.value?.length || 0;
});

const totalCitations = computed(() => {
  if (!orgData.value) return 0;

  return (orgData.value as OrgDatasetItem[]).reduce(
    (sum: number, item: OrgDatasetItem) => sum + item.dataset.citations.length,
    0,
  );
});

const totalMentions = computed(() => {
  if (!orgData.value) return 0;

  return (orgData.value as OrgDatasetItem[]).reduce(
    (sum: number, item: OrgDatasetItem) => sum + item.dataset.mentions.length,
    0,
  );
});

const averageFairScore = computed(() => {
  if (!orgData.value) return 0;

  const datasetsWithFairScore = (orgData.value as OrgDatasetItem[]).filter(
    (item: OrgDatasetItem) =>
      item.dataset.fujiScore?.score !== null &&
      item.dataset.fujiScore?.score !== undefined,
  );
  if (datasetsWithFairScore.length === 0) return 0;

  const sum = datasetsWithFairScore.reduce(
    (sum: number, item: OrgDatasetItem) =>
      sum + (item.dataset.fujiScore?.score || 0),
    0,
  );

  return sum / datasetsWithFairScore.length;
});

// S-index over time (aggregated across all datasets)
const sindexOverTime = computed(() => {
  if (!orgData.value)
    return { dates: [], scores: [], earliestDate: null, endDate: null };

  const datasets = orgData.value as OrgDatasetItem[];
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
  if (!orgData.value) {
    return {
      dates: [],
      rawValues: [],
      weightedValues: [],
      earliestDate: null,
      endDate: null,
    };
  }

  const datasets = orgData.value as OrgDatasetItem[];
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
  if (!orgData.value) {
    return {
      dates: [],
      rawValues: [],
      weightedValues: [],
      earliestDate: null,
      endDate: null,
    };
  }

  const datasets = orgData.value as OrgDatasetItem[];
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
        v-if="org"
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
                label="Automated Organization Profile"
                icon="ic:round-auto-awesome"
              />
            </UTooltip>

            <h1 class="text-2xl font-bold">
              {{ displayName }}
            </h1>
          </div>
        </template>

        <template #links />
      </UPageHeader>

      <UPageBody v-if="org">
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

            <p class="mt-2 text-sm">Total datasets in this organization</p>
          </UCard>

          <UCard>
            <template #header>
              <h3 class="text-lg font-semibold">Total Citations</h3>
            </template>

            <div class="text-3xl font-bold text-pink-500">
              {{ totalCitations }}
            </div>

            <p class="mt-2 text-sm">
              Total citations to the organization's datasets
            </p>
          </UCard>

          <UCard>
            <template #header>
              <h3 class="text-lg font-semibold">Total Mentions</h3>
            </template>

            <div class="text-3xl font-bold text-pink-600">
              {{ totalMentions }}
            </div>

            <p class="mt-2 text-sm">
              Total mentions of the organization's datasets
            </p>
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

        <UserDatasetList :items="orgData" />
      </UPageBody>

      <UPageBody v-else-if="orgError">
        <div class="py-12 text-center">
          <p class="text-base text-gray-500 dark:text-gray-400">
            Organization not found or failed to load.
          </p>

          <UButton to="/search/ao" color="primary" variant="soft" class="mt-4">
            Search organizations
          </UButton>
        </div>
      </UPageBody>
    </UPage>
  </UContainer>
</template>

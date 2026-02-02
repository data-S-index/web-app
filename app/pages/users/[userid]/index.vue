<script setup lang="ts">
interface UserDatasetItem {
  datasetId: number;
  dataset: {
    dindices?: Array<{ score: number; created: string }>;
    citations: Array<unknown>;
    mentions: Array<unknown>;
    fujiScore?: { score: number | null };
  };
}

useSeoMeta({
  title: "Researcher Profile",
  description:
    "View this researcher's profile, S-Index, and shared datasets on Scholar Data.",
});

defineOgImageComponent("Pergel", {
  headline: "Scholar Data",
});

const { user, loggedIn } = useUserSession();

const route = useRoute();
const toast = useToast();

const userid = (route.params.userid as string).toUpperCase();

const isCurrentUser = computed(() => {
  return loggedIn.value && user.value?.id === userid;
});

const { data: userData, error } = await useFetch(
  `/api/users/${userid}/datasets`,
);

if (error.value) {
  toast.add({
    title: "Error fetching datasets",
    description: error.value.data?.statusMessage,
    icon: "material-symbols:error",
    color: "error",
  });
}

// Fetch user profile info
const { data: userProfile, error: userProfileError } = await useFetch(
  `/api/users/${userid}`,
);

if (userProfileError.value) {
  toast.add({
    title: "Error fetching user profile",
    description: userProfileError.value.data?.statusMessage,
    icon: "material-symbols:error",
    color: "error",
  });
}

// Generate avatar URL from dicebear using userid as seed
const avatarUrl = computed(() => {
  return `https://api.dicebear.com/9.x/thumbs/svg?seed=${userid}`;
});

// Get user's full name
const fullName = computed(() => {
  if (!userProfile.value) return "";

  const givenName = userProfile.value.givenName || "";
  const familyName = userProfile.value.familyName || "";

  return `${givenName} ${familyName}`.trim() || "User";
});

useSeoMeta({
  title: `${fullName.value}`,
  description:
    "View this researcher's profile, S-Index, and shared datasets on Scholar Data.",
});

const removeDataset = async (datasetId: number) => {
  try {
    await $fetch("/api/user/datasets/", {
      method: "DELETE",
      body: {
        datasetId,
      },
    });

    toast.add({
      title: "Dataset removed successfully",
      description: "The dataset has been removed from your collection",
      icon: "i-heroicons-check-circle-20-solid",
      color: "success",
    });

    // Reload the page
    window.location.reload();
  } catch (error: unknown) {
    const errorMessage =
      (error as { data?: { statusMessage?: string } })?.data?.statusMessage ||
      "Failed to remove dataset";
    toast.add({
      title: "Error removing dataset",
      description: errorMessage,
      icon: "material-symbols:error",
      color: "error",
    });
  }
};

// Computed metrics for the 6 cards
const sindex = computed(() => {
  if (!userData.value) return 0;

  return (userData.value as UserDatasetItem[]).reduce(
    (sum: number, item: UserDatasetItem) =>
      sum + (item.dataset.dindices?.[0]?.score || 0),
    0,
  );
});

const datasetCount = computed(() => {
  return userData.value?.length || 0;
});

const totalCitations = computed(() => {
  if (!userData.value) return 0;

  return (userData.value as UserDatasetItem[]).reduce(
    (sum: number, item: UserDatasetItem) => sum + item.dataset.citations.length,
    0,
  );
});

const totalMentions = computed(() => {
  if (!userData.value) return 0;

  return (userData.value as UserDatasetItem[]).reduce(
    (sum: number, item: UserDatasetItem) => sum + item.dataset.mentions.length,
    0,
  );
});

const averageFairScore = computed(() => {
  if (!userData.value) return 0;
  const datasetsWithFairScore = (userData.value as UserDatasetItem[]).filter(
    (item: UserDatasetItem) =>
      item.dataset.fujiScore?.score !== null &&
      item.dataset.fujiScore?.score !== undefined,
  );
  if (datasetsWithFairScore.length === 0) return 0;
  const sum = datasetsWithFairScore.reduce(
    (sum: number, item: UserDatasetItem) =>
      sum + (item.dataset.fujiScore?.score || 0),
    0,
  );

  return sum / datasetsWithFairScore.length;
});

// S-index over time (aggregated across all datasets)
const sindexOverTime = computed(() => {
  if (!userData.value)
    return { dates: [], scores: [], earliestDate: null, endDate: null };

  const datasets = userData.value as UserDatasetItem[];

  // Collect all d-index entries from all datasets
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

  // Sort by date
  allDIndices.sort((a, b) => a.date.getTime() - b.date.getTime());

  // Get earliest and latest dates
  const earliestDate = allDIndices[0]!.date;
  const now = new Date();
  const endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // For each month, find the latest d-index for each dataset and sum them
  const currentDate = new Date(earliestDate);
  currentDate.setDate(1); // Start of month

  const dates: string[] = [];
  const scores: number[] = [];

  while (currentDate <= endDate) {
    dates.push(currentDate.toISOString().split("T")[0]!);

    // For each dataset, find the most recent d-index (by date) up to this month
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

    // Sum all latest d-indices to get S-index
    let sindexValue = 0;
    datasetLatestDIndex.forEach((entry) => {
      sindexValue += entry.score;
    });

    scores.push(sindexValue);

    // Move to next month
    currentDate.setMonth(currentDate.getMonth() + 1);
  }

  return { dates, scores, earliestDate, endDate };
});

// Cumulative citations (raw and weighted) across all datasets
const cumulativeCitations = computed(() => {
  if (!userData.value) {
    return {
      dates: [],
      rawValues: [],
      weightedValues: [],
      earliestDate: null,
      endDate: null,
    };
  }

  const datasets = userData.value as UserDatasetItem[];

  // Collect all citations from all datasets
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

  // Sort by date
  allCitations.sort((a, b) => a.date.getTime() - b.date.getTime());

  const firstCitationDate = allCitations[0]!.date;
  const now = new Date();
  const lastCitationDate = allCitations[allCitations.length - 1]!.date;
  const endDate = lastCitationDate > now ? lastCitationDate : now;
  const startDate = firstCitationDate;

  // Group citations by month
  const citationsByMonth = new Map<string, { raw: number; weighted: number }>();

  allCitations.forEach((citation) => {
    const monthKey = `${citation.date.getFullYear()}-${String(citation.date.getMonth() + 1).padStart(2, "0")}`;
    const existing = citationsByMonth.get(monthKey) || { raw: 0, weighted: 0 };
    citationsByMonth.set(monthKey, {
      raw: existing.raw + 1,
      weighted: existing.weighted + citation.weight,
    });
  });

  // Generate monthly data points
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
  if (!userData.value) {
    return {
      dates: [],
      rawValues: [],
      weightedValues: [],
      earliestDate: null,
      endDate: null,
    };
  }

  const datasets = userData.value as UserDatasetItem[];

  // Collect all mentions from all datasets
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

  // Sort by date
  allMentions.sort((a, b) => a.date.getTime() - b.date.getTime());

  const firstMentionDate = allMentions[0]!.date;
  const now = new Date();
  const lastMentionDate = allMentions[allMentions.length - 1]!.date;
  const endDate = lastMentionDate > now ? lastMentionDate : now;
  const startDate = firstMentionDate;

  // Group mentions by month
  const mentionsByMonth = new Map<string, { raw: number; weighted: number }>();

  allMentions.forEach((mention) => {
    const monthKey = `${mention.date.getFullYear()}-${String(mention.date.getMonth() + 1).padStart(2, "0")}`;
    const existing = mentionsByMonth.get(monthKey) || { raw: 0, weighted: 0 };
    mentionsByMonth.set(monthKey, {
      raw: existing.raw + 1,
      weighted: existing.weighted + mention.weight,
    });
  });

  // Generate monthly data points
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

// Modal state for dataset search
const showAddDatasetModal = ref(false);

// Handle datasets added event
const handleDatasetsAdded = () => {
  // Refresh the page data
  window.location.reload();
};
</script>

<template>
  <UContainer>
    <UPage>
      <UPageHeader
        :ui="{
          container: 'flex min-w-full flex-1',
          wrapper: 'w-full ',
          title: 'w-full',
        }"
      >
        <template #title>
          <div class="flex min-w-full gap-4">
            <UAvatar :src="avatarUrl" :alt="fullName" size="3xl" />

            <div class="flex w-full min-w-0 flex-1 flex-col gap-1">
              <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {{ fullName ? fullName : userProfile?.username }}
              </h1>

              <div
                class="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-gray-500 dark:text-gray-400"
              >
                <span
                  v-if="userProfile?.affiliation"
                  class="flex items-center gap-1.5"
                >
                  <UIcon
                    name="i-heroicons-building-office-2"
                    class="size-4 shrink-0 text-gray-400 dark:text-gray-500"
                  />
                  {{ userProfile.affiliation }}
                </span>

                <NuxtLink
                  v-if="userProfile?.homePage"
                  :to="userProfile.homePage"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300 flex items-center gap-1.5 hover:underline"
                >
                  <UIcon name="i-heroicons-globe-alt" class="size-4 shrink-0" />

                  <span>Homepage</span>

                  <UIcon
                    name="i-heroicons-arrow-top-right-on-square"
                    class="size-3.5 shrink-0"
                  />
                </NuxtLink>
              </div>
            </div>
          </div>
        </template>

        <template #links />
      </UPageHeader>

      <UPageBody>
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
              {{ Math.round(sindex / datasetCount) }}
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
              <h3 class="text-lg font-semibold">Total Claimed Datasets</h3>
            </template>

            <div class="text-3xl font-bold text-pink-600">
              {{ datasetCount }}
            </div>

            <p class="mt-2 text-sm">Total datasets claimed by the user</p>
          </UCard>

          <UCard>
            <template #header>
              <h3 class="text-lg font-semibold">Total Citations</h3>
            </template>

            <div class="text-3xl font-bold text-pink-500">
              {{ totalCitations }}
            </div>

            <p class="mt-2 text-sm">Total citations to the user's datasets</p>
          </UCard>

          <UCard>
            <template #header>
              <h3 class="text-lg font-semibold">Total Mentions</h3>
            </template>

            <div class="text-3xl font-bold text-pink-600">
              {{ totalMentions }}
            </div>

            <p class="mt-2 text-sm">Total mentions of the user's datasets</p>
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

        <div class="flex items-center justify-between">
          <h2 class="text-2xl font-bold">Datasets</h2>

          <UModal
            v-model="showAddDatasetModal"
            fullscreen
            title="Add a dataset"
          >
            <UButton
              v-if="isCurrentUser"
              icon="i-heroicons-plus-20-solid"
              label="Add a dataset"
            />

            <template #body>
              <DatasetSearchModal
                :userid="userid"
                :user-name="fullName"
                :is-open="showAddDatasetModal"
                @close="showAddDatasetModal = false"
                @datasets-added="handleDatasetsAdded"
              />
            </template>
          </UModal>
        </div>

        <UserDatasetList
          :items="userData"
          :show-remove="isCurrentUser"
          @remove="removeDataset"
        />
      </UPageBody>
    </UPage>
  </UContainer>
</template>

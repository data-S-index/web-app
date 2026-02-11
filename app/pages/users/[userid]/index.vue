<script setup lang="ts">
import type { DatasetListItem } from "~/components/user/UserDatasetList.vue";

interface UserDatasetItem {
  datasetId: number;
  dataset: {
    dindices?: Array<{ score: number; year: number }>;
    citations: Array<unknown>;
    mentions: Array<unknown>;
    fujiScore?: { score: number | null };
    publishedAt?: string | Date | null;
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

// S-index over time by year (aggregated across all datasets)
const sindexOverTime = computed(() => {
  if (!userData.value) return { years: [], scores: [] };

  const datasets = userData.value as UserDatasetItem[];

  // Collect all Dataset Index entries from all datasets (year-based)
  const allDIndices: Array<{ year: number; score: number; datasetId: number }> =
    [];

  datasets.forEach((item) => {
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

  if (allDIndices.length === 0) {
    return { years: [], scores: [] };
  }

  // Sort by year
  allDIndices.sort((a, b) => a.year - b.year);

  // Start from earliest dataset publishedAt year
  const publishedYears = datasets
    .map((item) => item.dataset.publishedAt)
    .filter(Boolean)
    .map((d) => new Date(d!).getFullYear());
  const minYear =
    publishedYears.length > 0
      ? Math.min(...publishedYears)
      : allDIndices[0]!.year;
  let currentYear = new Date().getFullYear();

  // If the latest mention or citation is not in the current year, set the current year to the previous year
  if (!allDIndices.some((dindex) => dindex.year === currentYear)) {
    currentYear--;
  }

  const years: number[] = [];
  const scores: number[] = [];

  for (let y = minYear; y <= currentYear; y++) {
    years.push(y);

    // For each dataset, take latest Dataset Index with year <= y
    const datasetLatestDIndex = new Map<
      number,
      { score: number; year: number }
    >([]);

    allDIndices.forEach((dindex) => {
      if (dindex.year <= y) {
        const existing = datasetLatestDIndex.get(dindex.datasetId);
        if (!existing || dindex.year > existing.year) {
          datasetLatestDIndex.set(dindex.datasetId, {
            score: dindex.score,
            year: dindex.year,
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

  const publishedYears = datasets
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

  const publishedYearsM = datasets
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
            <UAvatar
              :src="avatarUrl"
              :alt="fullName"
              size="3xl"
              class="squircle mt-1 rounded-none"
            />

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
      </UPageHeader>

      <UPageBody>
        <div class="mb-6 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          <UCard>
            <template #header>
              <h3 class="text-lg font-semibold">Current S-Index</h3>
            </template>

            <div class="text-3xl font-bold text-pink-600">
              {{
                sindex.toLocaleString(undefined, {
                  minimumFractionDigits: 1,
                  maximumFractionDigits: 1,
                })
              }}
            </div>

            <p class="mt-2 text-sm">Sum of Dataset Indices for all datasets</p>
          </UCard>

          <UCard>
            <template #header>
              <h3 class="text-lg font-semibold">
                Average Dataset Index per Dataset
              </h3>
            </template>

            <div class="text-3xl font-bold text-pink-500">
              {{
                datasetCount
                  ? (sindex / datasetCount).toLocaleString(undefined, {
                      minimumFractionDigits: 1,
                      maximumFractionDigits: 1,
                    })
                  : "0.0"
              }}
            </div>

            <p class="mt-2 text-sm">Average Dataset Index per dataset</p>
          </UCard>

          <UCard>
            <template #header>
              <h3 class="text-lg font-semibold">Total Claimed Datasets</h3>
            </template>

            <div class="text-3xl font-bold text-pink-600">
              {{ datasetCount.toLocaleString() }}
            </div>

            <p class="mt-2 text-sm">Total datasets claimed by the user</p>
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
              {{ totalCitations.toLocaleString() }}
            </div>

            <p class="mt-2 text-sm">Total citations to the user's datasets</p>
          </UCard>

          <UCard>
            <template #header>
              <h3 class="text-lg font-semibold">Total Mentions</h3>
            </template>

            <div class="text-3xl font-bold text-pink-600">
              {{ totalMentions.toLocaleString() }}
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
          :items="(userData as DatasetListItem[] | undefined) ?? undefined"
          :show-remove="isCurrentUser"
          @remove="removeDataset"
        />
      </UPageBody>
    </UPage>
  </UContainer>
</template>

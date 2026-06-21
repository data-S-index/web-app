<script setup lang="ts">
import type { Author } from "#shared/types/dataset";

const route = useRoute();
const toast = useToast();
const { loggedIn, user } = useUserSession();

const isAdmin = computed(() => {
  return loggedIn.value && user.value?.admin === true;
});

const recomputeFairLoading = ref(false);

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
  title: dataset.value?.title || "Scholar Data",
  description:
    dataset.value?.description ||
    "View this dataset's details and metrics on Scholar Data.",
});

defineOgImage("NuxtSeo.takumi", {
  title: dataset.value?.title || "Scholar Data",
  description:
    dataset.value?.description ||
    "View this dataset's details and metrics on Scholar Data.",
});

const getAuthorTooltipText = (author: Author): string => {
  const parts: string[] = [];
  const affiliations = author.affiliations || [];

  if (Array.isArray(affiliations) && affiliations.length > 0) {
    parts.push(`Affiliations: ${affiliations.join("; ")}`);
  }

  return parts.length > 0 ? parts.join("\n") : "No additional information";
};

const recomputeFairScore = async () => {
  if (!dataset.value?.id) {
    return;
  }

  recomputeFairLoading.value = true;

  await $fetch<{
    datasetId: number;
    alreadyQueued: boolean;
    message: string;
  }>(`/api/dataset/${dataset.value.id}/recompute-fair`, {
    method: "POST",
  })
    .then((response) => {
      toast.add({
        title: response.alreadyQueued
          ? "Already queued"
          : "FAIR recompute queued",
        description: response.message,
        icon: "material-symbols:check-circle",
        color: "success",
      });
    })
    .catch(() => {
      toast.add({
        title: "Failed to queue FAIR recompute",
        description: "Could not queue this dataset right now.",
        icon: "material-symbols:error",
        color: "error",
      });
    })
    .finally(() => {
      recomputeFairLoading.value = false;
    });
};

const copyDoi = async () => {
  const doi = dataset.value?.identifier;

  if (!doi) {
    return;
  }

  try {
    await navigator.clipboard.writeText(doi);
    toast.add({
      title: "DOI copied",
      description: doi,
      icon: "i-heroicons-check-circle",
      color: "success",
    });
  } catch {
    toast.add({
      title: "Copy failed",
      description: "Unable to copy DOI to clipboard.",
      icon: "material-symbols:error",
      color: "error",
    });
  }
};
</script>

<template>
  <UContainer>
    <div
      v-if="error"
      class="mx-auto flex min-h-[calc(100vh-64px)] w-full max-w-screen-sm flex-col items-center justify-center gap-8 px-6 pt-4 pb-16 text-center"
    >
      <div class="flex h-20 w-20 items-center justify-center rounded-full">
        <UIcon
          name="streamline-pixel:coding-apps-websites-404-error"
          class="text-primary-500 dark:text-primary-400"
          size="80"
        />
      </div>

      <div class="flex flex-col gap-3">
        <h1 class="text-4xl font-bold tracking-tight">Dataset Not Found</h1>
      </div>

      <div class="flex flex-wrap justify-center gap-3">
        <UButton
          color="primary"
          size="lg"
          to="/discover"
          icon="i-lucide-search"
        >
          Browse Datasets
        </UButton>

        <UButton variant="outline" size="lg" to="/" icon="i-lucide-house">
          Go Home
        </UButton>
      </div>
    </div>

    <UPage v-if="dataset">
      <UPageHeader>
        <div class="flex flex-col space-y-2">
          <div class="flex items-center gap-2">
            <div class="flex hidden items-center gap-1">
              <UIcon name="i-heroicons-calendar-20-solid" class="h-4 w-4" />

              <p class="text-sm font-light">
                Published on
                {{ dataset.pubYear || "Unknown Year" }}
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
              :to="
                dataset.identifierType === 'doi'
                  ? `https://doi.org/${dataset.identifier}`
                  : dataset.identifierType === 'emdb'
                    ? `https://www.ebi.ac.uk/emdb/${dataset.identifier}`
                    : dataset.identifier
              "
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
            <DatasetCitationsDisplay
              v-if="dataset.citations"
              :citations="dataset.citations"
            />

            <!-- Mentions -->
            <DatasetMentionsDisplay
              v-if="dataset.mentions"
              :mentions="dataset.mentions"
            />
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
                <div class="flex items-center gap-2">
                  <h3 class="text-lg font-semibold">Metrics</h3>

                  <NuxtLink
                    href="https://docs.scholardata.io/data-collection/overview"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="hover:text-primary-500 flex items-center gap-1 text-gray-400 dark:text-gray-400 dark:hover:text-gray-300"
                  >
                    <UIcon
                      name="i-heroicons-information-circle-20-solid"
                      class="h-4 w-4"
                    />
                  </NuxtLink>
                </div>
              </template>

              <div class="space-y-4">
                <div class="grid grid-cols-2 gap-6">
                  <div
                    v-if="dataset.dindices && dataset.dindices.length > 0"
                    class="flex flex-col items-center text-center"
                  >
                    <p class="mb-2 text-sm font-medium">Dataset Index</p>

                    <div class="flex items-center gap-2">
                      <div
                        class="text-primary-600 dark:text-primary-400 text-3xl font-bold"
                      >
                        {{
                          dataset.dindices.length > 0
                            ? dataset.dindices[
                                dataset.dindices.length - 1
                              ]?.score.toLocaleString(undefined, {
                                minimumFractionDigits: 1,
                                maximumFractionDigits: 1,
                              })
                            : "0.0"
                        }}
                      </div>
                    </div>
                  </div>

                  <div
                    v-if="dataset.fujiScore && dataset.fujiScore.score !== null"
                    class="flex flex-col items-center text-center"
                  >
                    <p class="mb-2 text-sm font-medium">FAIR Score</p>

                    <div
                      class="text-primary-600 dark:text-primary-400 text-3xl font-bold"
                    >
                      {{ Math.round(dataset.fujiScore.score) }}%
                    </div>
                  </div>

                  <div
                    v-if="dataset.fujiScore && dataset.fujiScore.score !== null"
                    class="flex flex-col items-center text-center"
                  >
                    <p class="mb-2 text-sm font-medium">Citations</p>

                    <div
                      class="text-primary-600 dark:text-primary-400 text-3xl font-bold"
                    >
                      {{ dataset.citations.length.toLocaleString() }}
                    </div>
                  </div>

                  <div
                    v-if="dataset.fujiScore && dataset.fujiScore.score !== null"
                    class="flex flex-col items-center text-center"
                  >
                    <p class="mb-2 text-sm font-medium">Mentions</p>

                    <div
                      class="text-primary-600 dark:text-primary-400 text-3xl font-bold"
                    >
                      {{ dataset.mentions.length.toLocaleString() }}
                    </div>
                  </div>
                </div>
              </div>
            </UCard>

            <!-- Metrics Over Time -->
            <UCard>
              <template #header>
                <h3 class="text-lg font-semibold">Metrics Over Time</h3>
              </template>

              <div class="space-y-4">
                <DatasetMetricsTabs :dataset="dataset" />
              </div>
            </UCard>

            <!-- Publisher and DOI -->
            <UCard v-if="dataset.identifier || dataset.publisher">
              <template #header>
                <h3 class="text-lg font-semibold">Publication Details</h3>
              </template>

              <div class="space-y-3">
                <div v-if="dataset.identifier" class="space-y-3">
                  <p class="mb-1 text-sm font-medium">DOI</p>

                  <div
                    class="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300"
                  >
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
                        size="sm"
                        icon="i-heroicons-link-20-solid"
                        class="cursor-pointer"
                      />
                    </a>

                    <UButton
                      color="neutral"
                      variant="ghost"
                      size="xs"
                      icon="uil:copy"
                      aria-label="Copy DOI"
                      @click="copyDoi"
                    />
                  </div>

                  <div v-if="dataset.publisher">
                    <p class="mb-1 text-sm font-medium">Publisher</p>

                    <p class="text-sm text-gray-700 dark:text-gray-300">
                      {{ dataset.publisher }}
                    </p>
                  </div>
                </div>
              </div>
            </UCard>

            <!-- Extracted Domain -->
            <DatasetDomainInfo
              v-if="(dataset as any).domain"
              :domain="(dataset as any).domain"
            />

            <!-- Subjects -->
            <UCard v-if="dataset.subjects && dataset.subjects.length > 0">
              <template #header>
                <h3 class="text-lg font-semibold">Keywords</h3>
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

            <!-- Normalization Factors Card -->
            <DatasetNormalizationFactors
              v-if="dataset.normalizationFactor"
              :normalization-factors="dataset.normalizationFactor"
            />

            <!-- Admin box -->
            <div v-if="isAdmin" class="flex flex-col gap-2 p-2">
              <UButton
                label="Recompute FAIR score"
                :loading="recomputeFairLoading"
                :disabled="recomputeFairLoading"
                icon="i-heroicons-arrow-path"
                @click="recomputeFairScore"
              />
            </div>
          </div>
        </div>
      </UPageBody>
    </UPage>
  </UContainer>
</template>

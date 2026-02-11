<!-- eslint-disable @typescript-eslint/no-explicit-any -->
<script setup lang="ts">
import type { Author } from "#shared/types/dataset";

defineProps<{
  dataset: any;
  isFromCache?: boolean;
}>();

const getAuthorTooltipText = (author: Author): string => {
  const parts: string[] = [];
  const affiliations = author.affiliations || [];

  if (Array.isArray(affiliations) && affiliations.length > 0) {
    parts.push(`Affiliations: ${affiliations.join("; ")}`);
  }

  return parts.length > 0 ? parts.join("\n") : "No additional information";
};

const reloadPage = () => {
  window.location.reload();
};
</script>

<template>
  <UPageHeader>
    <div class="flex flex-col space-y-2">
      <div class="flex items-center gap-2">
        <div class="flex items-center gap-1">
          <UIcon name="i-heroicons-calendar-20-solid" class="h-4 w-4" />

          <p class="text-sm font-light">
            Published on
            {{
              dataset.publishedAt
                ? $dayjs(dataset.publishedAt).format("DD MMMM YYYY")
                : "Unknown date"
            }}
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

        <div class="flex items-center justify-end gap-2">
          <UButton
            color="neutral"
            variant="outline"
            label="Try another dataset"
            icon="i-heroicons-arrow-path-rounded-square-20-solid"
            @click="reloadPage"
          />

          <UButton
            v-if="dataset.identifier || dataset.url"
            color="primary"
            variant="solid"
            :to="
              dataset.identifier
                ? `https://doi.org/${dataset.identifier}`
                : dataset.url || null
            "
            target="_blank"
            rel="noopener noreferrer"
            icon="i-heroicons-arrow-top-right-on-square-20-solid"
            label="View Dataset"
          />
        </div>
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
        <!-- Cache Alert -->
        <UAlert
          v-if="isFromCache"
          color="primary"
          variant="subtle"
          icon="i-heroicons-information-circle-20-solid"
          title="Cached Result"
          description="This data was loaded from cache and may be up to 1 hour old. As this is a beta platform, caching helps us stay within third-party rate limits while we improve performance."
        />

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

                <div
                  class="text-primary-600 dark:text-primary-400 text-3xl font-bold"
                >
                  {{ Math.round(dataset.fujiScore.score) }}%
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
                <p class="mb-2 text-sm font-medium">Dataset Index</p>

                <div class="flex items-center gap-2">
                  <div
                    class="text-primary-600 dark:text-primary-400 text-3xl font-bold"
                  >
                    {{
                      dataset.dindices[
                        dataset.dindices.length - 1
                      ].score.toFixed(1)
                    }}
                  </div>
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

        <!-- Domain Information -->
        <DatasetDomainInfo v-if="dataset.domain" :domain="dataset.domain" />

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

        <!-- Normalization Factors Card -->
        <DatasetNormalizationFactors
          v-if="dataset.normalization_factors"
          :normalization-factors="dataset.normalization_factors"
        />
      </div>
    </div>
  </UPageBody>
</template>

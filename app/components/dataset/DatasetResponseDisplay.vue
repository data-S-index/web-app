<!-- eslint-disable @typescript-eslint/no-explicit-any -->
<script setup lang="ts">
import type { Author } from "#shared/types/dataset";

const props = defineProps<{
  dataset: any;
}>();

const getAuthorTooltipText = (author: Author): string => {
  const parts: string[] = [];
  const affiliations = author.affiliations || [];

  if (Array.isArray(affiliations) && affiliations.length > 0) {
    parts.push(`Affiliations: ${affiliations.join("; ")}`);
  }

  return parts.length > 0 ? parts.join("\n") : "No additional information";
};

const citationsCount = computed(() => props.dataset?.citations?.length || 0);
const mentionsCount = computed(() => props.dataset?.mentions?.length || 0);

// Pagination for citations
const citationsPage = ref(1);
const citationsPerPage = 10;
const paginatedCitations = computed(() => {
  if (!props.dataset?.citations || citationsCount.value <= citationsPerPage) {
    return props.dataset?.citations || [];
  }

  const start = (citationsPage.value - 1) * citationsPerPage;
  const end = start + citationsPerPage;

  return props.dataset.citations.slice(start, end);
});
</script>

<template>
  <UPage class="mt-8">
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

          <UButton
            v-if="dataset.identifier"
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
              <li v-for="(citation, index) in paginatedCitations" :key="index">
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
                    <div class="flex flex-col gap-1">
                      <p v-if="citation.citedDate" class="text-sm">
                        Cited on
                        {{ $dayjs(citation.citedDate).format("DD MMMM YYYY") }}
                      </p>

                      <p
                        v-if="citation.citationWeight"
                        class="text-xs text-gray-500 dark:text-gray-400"
                      >
                        Weight: {{ citation.citationWeight.toFixed(2) }}
                      </p>
                    </div>

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
                  class="mb-2 flex-1 space-y-1 rounded-lg border border-gray-200 p-3 shadow-sm dark:border-gray-700"
                >
                  <NuxtLink
                    :href="mention.mentionLink"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="font-mono text-blue-600 hover:underline dark:text-blue-400"
                  >
                    {{ mention.mentionLink }}
                  </NuxtLink>

                  <div class="flex items-center justify-between gap-2">
                    <div class="flex flex-col gap-1">
                      <p v-if="mention.mentionedDate" class="text-sm">
                        Mentioned on
                        {{
                          $dayjs(mention.mentionedDate).format("DD MMMM YYYY")
                        }}
                      </p>

                      <p
                        v-if="mention.mentionWeight"
                        class="text-xs text-gray-500 dark:text-gray-400"
                      >
                        Weight: {{ mention.mentionWeight.toFixed(2) }}
                      </p>
                    </div>

                    <div class="flex flex-wrap gap-2">
                      <UBadge
                        v-for="(source, sourceIndex) in mention.source"
                        :key="sourceIndex"
                        color="info"
                        variant="subtle"
                        size="sm"
                      >
                        {{ source }}
                      </UBadge>
                    </div>
                  </div>
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
                      {{
                        Math.round(
                          dataset.dindices[dataset.dindices.length - 1].score,
                        )
                      }}
                    </div>
                  </div>
                </div>
              </div>

              <!-- D-Index List -->
              <div
                v-if="dataset.dindices && dataset.dindices.length > 0"
                class="border-t border-gray-200 pt-4 dark:border-gray-700"
              >
                <h4 class="mb-3 text-sm font-medium">D-Index History</h4>

                <div class="flex flex-col gap-2">
                  <UCollapsible
                    v-for="(dindex, index) in [...dataset.dindices].reverse()"
                    :key="index"
                    class="flex w-full flex-col gap-2"
                  >
                    <UButton
                      :label="`${$dayjs(dindex.created).format('DD MMM YYYY')} - ${dindex.score.toFixed(2)}`"
                      color="neutral"
                      variant="subtle"
                      trailing-icon="i-lucide-chevron-down"
                      block
                    />

                    <template #content>
                      <div class="rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
                        <p class="text-sm">
                          <span class="font-medium">Date:</span>
                          {{ $dayjs(dindex.created).format("DD MMMM YYYY") }}
                        </p>

                        <p class="text-sm">
                          <span class="font-medium">D-Index:</span>
                          {{ dindex.score.toFixed(4) }}
                        </p>
                      </div>
                    </template>
                  </UCollapsible>
                </div>
              </div>
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
</template>

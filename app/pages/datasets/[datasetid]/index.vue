<script setup lang="ts">
const route = useRoute();
const toast = useToast();

const { datasetid } = route.params as { datasetid: string };

const { data: datasetData, error } = await useFetch(
  `/api/datasets/${datasetid}`,
);

if (error.value) {
  toast.add({
    title: "Error fetching dataset",
    description: error.value.data?.statusMessage,
    icon: "material-symbols:error",
    color: "error",
  });
}

const dataset = computed(() => {
  if (!datasetData.value || Array.isArray(datasetData.value)) {
    return null;
  }

  return datasetData.value;
});

useSeoMeta({
  title: dataset.value?.title || "Dataset Details",
  description: dataset.value?.description || "Dataset information",
});

interface Author {
  givenName?: string;
  name?: string;
  familyName?: string;
  affiliations?: string[];
  affiliation?: string[];
  nameIdentifiers?: Array<
    | string
    | {
        nameIdentifierScheme?: string;
        scheme?: string;
        nameIdentifier?: string;
        value?: string;
      }
  >;
}

const getAuthorName = (author: Author): string => {
  if (author.name) return author.name;

  const givenName = author.givenName || "";
  const familyName = author.familyName || "";

  return `${givenName} ${familyName}`.trim() || "Unknown Author";
};

const getAuthorTooltipText = (author: Author): string => {
  const parts: string[] = [];
  const affiliations = author.affiliations || author.affiliation || [];

  if (Array.isArray(affiliations) && affiliations.length > 0) {
    parts.push(`Affiliations: ${affiliations.join("; ")}`);
  }

  return parts.length > 0 ? parts.join("\n") : "No additional information";
};

const citationsCount = computed(() => dataset.value?.Citation?.length || 0);
const fujiScore = computed(() => dataset.value?.FujiScore?.score || null);
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
                |
              </p>
            </div>

            <UBadge
              color="success"
              variant="soft"
              size="sm"
              :label="`Version ${dataset.version}`"
              icon="i-heroicons-tag-20-solid"
            />
          </div>

          <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {{ dataset.title }}
          </h1>

          <div
            v-if="
              dataset.authors &&
              Array.isArray(dataset.authors) &&
              dataset.authors.length > 0
            "
          >
            <div class="flex flex-wrap gap-1 text-sm">
              <template
                v-for="(author, index) in dataset.authors as Author[]"
                :key="index"
              >
                <UTooltip :text="getAuthorTooltipText(author)">
                  <span
                    class="hover:text-primary-600 dark:hover:text-primary-400 cursor-help font-normal underline decoration-dotted underline-offset-2 transition-colors"
                  >
                    {{ getAuthorName(author) }}
                  </span>
                </UTooltip>

                <span v-if="index < (dataset.authors as Author[]).length - 1">
                  ,
                </span>
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
            <UCard v-if="dataset.Citation && dataset.Citation.length > 0">
              <template #header>
                <div class="flex items-start justify-between gap-2">
                  <h3 class="text-lg font-semibold">
                    Citations ({{ citationsCount }})
                  </h3>

                  <UBadge
                    color="primary"
                    variant="subtle"
                    :label="`${citationsCount} Citation${citationsCount !== 1 ? 's' : ''}`"
                    icon="i-heroicons-book-open-20-solid"
                  />
                </div>
              </template>

              <div class="space-y-3">
                <div
                  v-for="citation in dataset.Citation"
                  :key="citation.id"
                  class="flex items-start gap-3 rounded-lg border border-gray-200 p-3 dark:border-gray-700"
                >
                  <Icon
                    name="i-heroicons-book-open-20-solid"
                    class="text-primary-500 mt-0.5 h-5 w-5 flex-shrink-0"
                  />

                  <div class="flex-1 space-y-1">
                    <a
                      :href="`https://doi.org/${citation.doi}`"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="text-primary-600 dark:text-primary-400 font-mono text-sm hover:underline"
                    >
                      {{ citation.doi }}
                    </a>

                    <div class="flex flex-wrap gap-2">
                      <UBadge
                        v-if="citation.datacite"
                        color="success"
                        variant="subtle"
                        size="sm"
                      >
                        DataCite
                      </UBadge>

                      <UBadge
                        v-if="citation.mdc"
                        color="success"
                        variant="subtle"
                        size="sm"
                      >
                        MDC
                      </UBadge>

                      <UBadge
                        v-if="citation.openAlex"
                        color="success"
                        variant="subtle"
                        size="sm"
                      >
                        OpenAlex
                      </UBadge>
                    </div>

                    <p class="text-xs text-gray-500 dark:text-gray-400">
                      Cited on
                      {{ $dayjs(citation.citedDate).format("DD MMMM YYYY") }}
                    </p>
                  </div>
                </div>
              </div>
            </UCard>
          </div>

          <!-- Sidebar -->
          <div class="space-y-6">
            <!-- Publisher and DOI -->
            <UCard v-if="dataset.doi || dataset.publisher">
              <template #header>
                <h3 class="text-lg font-semibold">Publication Details</h3>
              </template>

              <div class="space-y-3">
                <div v-if="dataset.doi">
                  <p class="mb-1 text-sm font-medium">DOI</p>

                  <a
                    :href="`https://doi.org/${dataset.doi}`"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="inline-block"
                  >
                    <UBadge
                      color="success"
                      variant="subtle"
                      :label="dataset.doi"
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

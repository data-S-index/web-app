<script setup lang="ts">
useSeoMeta({
  title: "Search Datasets",
  description: "Search for datasets by title, DOI, or keywords.",
});

defineOgImageComponent("Pergel", {
  headline: "Search Datasets",
});

type SearchResult = {
  id: number;
  title: string;
  authors: string;
  version: string | null;
  identifier: string;
  identifierType: string;
  publishedAt: string | Date;
};

const toast = useToast();
const searchTerm = ref("");
const searchLoading = ref(false);
const searchResults = ref<SearchResult[]>([]);
const searchPage = ref(1);
const searchTotal = ref(-1);
const searchDuration = ref<string>("0ms");
const hasSearched = ref(false);

const defaultSearchResults = ref<SearchResult[]>([
  {
    id: 1252148,
    identifier: "10.15468/ab3s5x",
    identifierType: "doi",
    title: "iNaturalist Research-grade Observations",
    authors: "iNaturalist contributors",
    version: null,
    publishedAt: "2025-01-01 00:00:00",
  },
  {
    id: 2595790,
    identifier: "10.15468/hnhrg3",
    identifierType: "doi",
    title: "NMNH Extant Specimen Records (USNM, US)",
    authors:
      "Informatics and Data Science Center-Digital Stewardship, Orrell, Thomas",
    version: null,
    publishedAt: "2025-01-01 00:00:00",
  },
  {
    id: 2041781,
    identifier: "10.15468/ib5ypt",
    identifierType: "doi",
    title: "Naturalis Biodiversity Center (NL) - Botany",
    authors: "Creuwels, Jeroen, Guerrero, Susana Arias, Roxali Bijmoer",
    version: null,
    publishedAt: "2025-01-01 00:00:00",
  },
  {
    id: 28911503,
    identifier: "10.57702/zp44cu3g",
    identifierType: "doi",
    title: "Learning Multiple Layers of Features from Tiny Images",
    authors: "Krizhevsky, Alex",
    version: null,
    publishedAt: "2024-01-01 00:00:00",
  },
  {
    id: 1177587,
    identifier: "10.5519/0002965",
    identifierType: "doi",
    title: "Collection specimens",
    authors: "Natural History Museum",
    version: null,
    publishedAt: "2014-01-01 00:00:00",
  },
  {
    id: 1212752,
    identifier: "10.15468/ypoair",
    identifierType: "doi",
    title: "Edinburgh (E) Herbarium Specimens",
    authors: "Royal Botanic Garden Edinburgh (RBGE)",
    version: null,
    publishedAt: "2025-01-01 00:00:00",
  },
  {
    id: 29778699,
    identifier: "10.57702/kcdhx0zi",
    identifierType: "doi",
    title:
      "Distributed representations of words and phrases and their compositionality",
    authors: "Mikolov, Tomas",
    version: null,
    publishedAt: "2025-01-01 00:00:00",
  },
  {
    id: 10887715,
    identifier: "10.5281/zenodo.5781449",
    identifierType: "doi",
    title: "Learning Rich Representation of Keyphrases from Text",
    authors:
      "Arora, Ravneet, Bhowmik, Rajarshi, Kulkarni, Mayank, Mahata, Debanjan",
    version: null,
    publishedAt: "2021-12-14 00:00:00",
  },
  {
    id: 1275551,
    identifier: "10.15468/hja69f",
    identifierType: "doi",
    title: "Tropicos MO Specimen Data",
    authors: "Teisher, Jordan",
    version: null,
    publishedAt: "2025-01-01 00:00:00",
  },
]);

const copyToClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text);
    toast.add({
      title: "Copied to clipboard",
      description: text,
      icon: "i-heroicons-check-circle-20-solid",
      color: "success",
    });
  } catch {
    toast.add({
      title: "Failed to copy",
      description: "Could not copy to clipboard",
      icon: "i-heroicons-x-circle-20-solid",
      color: "error",
    });
  }
};

const updateSearchPage = (page: number) => {
  searchForDatasets(page, false);
};

const searchForDatasets = async (page: number = 1, reset: boolean = false) => {
  if (reset) {
    searchPage.value = 1;
    searchTotal.value = -1;
    searchResults.value = [];
    page = 1;
  } else {
    searchPage.value = page;
  }

  searchLoading.value = true;

  await $fetch(`/api/search/datasets?q=${searchTerm.value}&page=${page}`)
    .then((response) => {
      searchResults.value = response.datasets as SearchResult[];
      searchTotal.value = response.total;
      searchPage.value = response.page;
      searchDuration.value = response.queryDuration;
      hasSearched.value = true;
    })
    .catch((error) => {
      toast.add({
        title: "Error searching for datasets",
        description: error.data?.statusMessage,
        icon: "material-symbols:error",
        color: "error",
      });
    })
    .finally(() => {
      searchLoading.value = false;
    });
};
</script>

<template>
  <UContainer>
    <UPage>
      <UPageHeader
        title="Search Datasets"
        description="Find datasets by title, DOI, or keywords."
      />

      <UPageBody>
        <div class="w-full space-y-5">
          <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
            <UInput
              v-model="searchTerm"
              icon="i-lucide-search"
              size="lg"
              variant="outline"
              placeholder="Search for datasets by title, DOI, or keywords..."
              class="min-w-0 flex-1"
              @keyup.enter="searchForDatasets(searchPage, true)"
            />

            <UButton
              icon="i-heroicons-magnifying-glass-20-solid"
              label="Search"
              size="lg"
              :disabled="!searchTerm.trim()"
              :loading="searchLoading"
              class="shrink-0"
              @click="searchForDatasets(searchPage, true)"
            />
          </div>

          <div v-if="!hasSearched" class="space-y-6">
            <div
              class="border-primary-200 from-primary-50/80 to-primary-100/40 dark:border-primary-800/50 dark:from-primary-950/40 dark:to-primary-900/30 rounded-2xl border bg-gradient-to-br p-6"
            >
              <div
                class="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4"
              >
                <div
                  class="bg-primary-100 text-primary-600 dark:bg-primary-800/60 dark:text-primary-400 flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
                >
                  <Icon
                    name="i-lucide-sparkles"
                    class="h-6 w-6"
                    aria-hidden="true"
                  />
                </div>

                <div class="min-w-0 flex-1 space-y-1">
                  <h2
                    class="text-lg font-semibold tracking-tight text-gray-900 dark:text-white"
                  >
                    New here? Start exploring
                  </h2>

                  <p
                    class="text-sm leading-relaxed text-gray-600 dark:text-gray-400"
                  >
                    Not sure what to search for? Below are popular datasets you
                    can browse right away. Click any card to open it, or use the
                    search above when you have something in mind.
                  </p>
                </div>
              </div>
            </div>

            <div>
              <p
                class="mb-3 text-sm font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400"
              >
                Popular datasets to explore
              </p>

              <div class="space-y-3">
                <div
                  v-for="result in defaultSearchResults"
                  :key="result.id"
                  class="relative flex rounded-lg border-2 border-gray-200 bg-white p-4 transition-all hover:border-gray-300 dark:border-gray-700 dark:bg-gray-800/50 dark:hover:border-gray-600"
                >
                  <div class="flex min-w-0 flex-1 flex-col gap-2">
                    <div class="flex items-start justify-between gap-3">
                      <h3
                        class="line-clamp-2 min-w-0 flex-1 text-base leading-snug font-semibold"
                      >
                        {{ result.title }}
                      </h3>

                      <div class="flex shrink-0 flex-wrap items-center gap-1.5">
                        <UBadge
                          v-if="result.version"
                          color="secondary"
                          variant="soft"
                          size="sm"
                          :label="`v${result.version}`"
                          icon="i-heroicons-tag-20-solid"
                        />

                        <UTooltip text="Click to copy identifier">
                          <UBadge
                            v-if="result.identifier"
                            color="primary"
                            variant="soft"
                            size="sm"
                            :label="result.identifier"
                            :icon="
                              result.identifierType === 'doi'
                                ? 'simple-icons:doi'
                                : 'mdi:identifier'
                            "
                            class="max-w-[12rem] cursor-pointer truncate font-mono text-xs"
                            @click="copyToClipboard(result.identifier)"
                          />
                        </UTooltip>
                      </div>
                    </div>

                    <div
                      class="mt-1 flex min-w-0 flex-1 items-start justify-between gap-2"
                    >
                      <div
                        v-if="result.authors"
                        class="flex min-w-0 items-center gap-2"
                      >
                        <Icon
                          name="i-heroicons-user-group-20-solid"
                          class="h-4 w-4 shrink-0 text-gray-400"
                        />

                        <p
                          class="flex-1 truncate text-sm text-gray-600 dark:text-gray-400"
                        >
                          {{ result.authors }}
                        </p>
                      </div>

                      <UButton
                        :to="`/datasets/${result.id}`"
                        target="_blank"
                        rel="noopener noreferrer"
                        icon="i-heroicons-arrow-top-right-on-square-20-solid"
                        color="neutral"
                        label="View Dataset"
                        size="sm"
                        aria-label="Open dataset in new tab"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div v-if="searchResults.length > 0" class="mt-6">
            <div class="flex flex-col gap-5">
              <div v-if="searchLoading">
                <div class="py-6 text-center">
                  <Icon
                    name="i-heroicons-arrow-path-20-solid"
                    class="text-primary-500 mx-auto h-10 w-10 animate-spin"
                  />

                  <p class="mt-2 text-base dark:text-gray-400">Searching...</p>
                </div>
              </div>

              <div v-else>
                <div
                  v-if="searchDuration !== '0ms' && !searchLoading"
                  class="flex items-center justify-between"
                >
                  <p class="text-sm text-gray-500 dark:text-gray-400">
                    Total results: {{ searchTotal }}
                  </p>

                  <UBadge
                    icon="i-heroicons-clock-20-solid"
                    color="primary"
                    variant="soft"
                    :label="searchDuration"
                  />
                </div>

                <USeparator class="my-4" />

                <div class="space-y-3">
                  <div
                    v-for="result in searchResults"
                    :key="result.id"
                    class="relative flex rounded-lg border-2 border-gray-200 bg-white p-4 transition-all hover:border-gray-300 dark:border-gray-700 dark:bg-gray-800/50 dark:hover:border-gray-600"
                  >
                    <div class="flex min-w-0 flex-1 flex-col gap-2">
                      <div class="flex items-start justify-between gap-3">
                        <h3
                          class="line-clamp-2 min-w-0 flex-1 text-base leading-snug font-semibold"
                        >
                          {{ result.title }}
                        </h3>

                        <div
                          class="flex shrink-0 flex-wrap items-center gap-1.5"
                        >
                          <UBadge
                            v-if="result.version"
                            color="secondary"
                            variant="soft"
                            size="sm"
                            :label="`v${result.version}`"
                            icon="i-heroicons-tag-20-solid"
                          />

                          <UTooltip text="Click to copy identifier">
                            <UBadge
                              v-if="result.identifier"
                              color="primary"
                              variant="soft"
                              size="sm"
                              :label="result.identifier"
                              :icon="
                                result.identifierType === 'doi'
                                  ? 'simple-icons:doi'
                                  : 'mdi:identifier'
                              "
                              class="max-w-[12rem] cursor-pointer truncate font-mono text-xs"
                              @click="copyToClipboard(result.identifier)"
                            />
                          </UTooltip>
                        </div>
                      </div>

                      <div class="flex min-w-0 flex-col gap-1.5">
                        <div
                          v-if="result.authors"
                          class="flex min-w-0 items-center gap-2"
                        >
                          <Icon
                            name="i-heroicons-user-group-20-solid"
                            class="h-4 w-4 shrink-0 text-gray-400"
                          />

                          <p
                            class="flex-1 truncate text-sm text-gray-600 dark:text-gray-400"
                          >
                            {{ result.authors }}
                          </p>
                        </div>

                        <div
                          v-if="result.publishedAt"
                          class="flex min-w-0 flex-1 items-center justify-between gap-2"
                        >
                          <div class="flex min-w-0 items-center gap-2">
                            <Icon
                              name="i-heroicons-calendar-20-solid"
                              class="h-4 w-4 shrink-0 text-gray-400"
                            />

                            <p class="text-sm text-gray-500">
                              {{
                                $dayjs(result.publishedAt).format(
                                  "dddd, MMMM D, YYYY",
                                )
                              }}
                            </p>
                          </div>

                          <UButton
                            :to="`/datasets/${result.id}`"
                            target="_blank"
                            rel="noopener noreferrer"
                            icon="i-heroicons-arrow-top-right-on-square-20-solid"
                            color="neutral"
                            label="View Dataset"
                            size="sm"
                            aria-label="Open dataset in new tab"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div class="flex w-full justify-center">
                <UPagination
                  v-model:page="searchPage"
                  :total="Math.min(searchTotal, 1000)"
                  :items-per-page="20"
                  :disabled="searchLoading"
                  @update:page="updateSearchPage"
                />
              </div>
            </div>
          </div>

          <div
            v-else-if="!searchLoading && hasSearched && searchTerm.trim()"
            class="py-6 text-center"
          >
            <p class="text-base text-gray-500 dark:text-gray-400">
              No results found. Try a different search term.
            </p>
          </div>
        </div>
      </UPageBody>
    </UPage>
  </UContainer>
</template>

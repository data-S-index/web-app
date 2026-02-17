<script setup lang="ts">
useSeoMeta({
  title: "Search Datasets",
  description: "Search for datasets by title, DOI, or keywords.",
});

defineOgImageComponent("Pergel", {
  headline: "Search Datasets",
});

const formatter = new Intl.NumberFormat("en-US", {
  notation: "compact",
  compactDisplay: "short",
});

type SearchResult = {
  id: number;
  title: string;
  authors: string;
  version: string | null;
  identifier: string;
  identifierType: string;
  publishedAt: string | Date;
  dIndex: number;
  citationCount: number;
  mentionCount: number;
};

const route = useRoute();
const router = useRouter();
const toast = useToast();
const searchTerm = ref((route.query.q as string) ?? "");
const searchLoading = ref(false);
const searchResults = ref<SearchResult[]>([]);
const searchPage = ref(1);
const searchTotal = ref(-1);
const searchDuration = ref<string>("0ms");
const hasSearched = ref(false);

// Sync search term from URL when user navigates back/forward and re-run search
watch(
  () => route.query.q,
  (q) => {
    const value = (q as string) ?? "";
    if (searchTerm.value !== value) {
      searchTerm.value = value;
      if (value.trim()) {
        searchForDatasets(1, true);
      }
    }
  },
);

// On load, if URL has a search term, run the search
onMounted(() => {
  const q = (route.query.q as string)?.trim();
  if (q) {
    searchForDatasets(1, true);
  }
});

// 1116680	10.5061/dryad.jp917	doi	Data from: Building the graph of medicine from millions of clinical narratives	Dryad	8/28/2015	1485	2511.360000000029	3	840.22
// 4360136	10.7910/dvn/dbw86t	doi	The HAM10000 dataset, a large collection of multi-source dermatoscopic images of common pigmented skin lesions	Harvard Dataverse	1/1/2018	827	1333.9500000000094	117	506.63
// 3003537	10.7937/k9/tcia.2017.klxwjj1q	doi	Segmentation Labels for the Pre-operative Scans of the TCGA-GBM collection	The Cancer Imaging Archive	1/1/2017	530	842.2200000000056	507	538.73
// 1934257	10.13012/j8pn93h8	doi	New York City Taxi Trip Data (2010-2013)	University of Illinois Urbana-Champaign	1/1/2016	306	508.73999999999876	110	228.32
// 3749268	10.5281/zenodo.1117372	doi	MUSDB18 - a corpus for music separation	Zenodo	12/17/2017	271	440.4599999999983	74	187.61
// 2413757	10.6084/m9.figshare.3115156.v2	doi	Common Workflow Language, v1.0	figshare	1/1/2016	257	426.17999999999904	231	258.86
// 6242085	10.24381/cds.adbb2d47	doi	ERA5 hourly data on single levels from 1940 to present	Copernicus Climate Change Service (C3S) Climate Data Store (CDS)	1/1/2018	173	288.0999999999994	2287	1334.19
// 1261090	10.7910/dvn/ydeput	doi	ESC: Dataset for Environmental Sound Classification	Harvard Dataverse	1/1/2015	160	270.5099999999995	171	185.26
// 3777593	10.17632/rscbjbr9sj.2	doi	Labeled Optical Coherence Tomography (OCT) and Chest X-Ray Images for Classification	Mendeley	1/6/2018	156	244.72000000000006	734	459.99
// 5155149	10.7910/dvn/voqchq	doi	County Presidential Election Returns 2000-2024	Harvard Dataverse	1/1/2018	131	209.67999999999995	287	219.27

const defaultSearchResults = ref<SearchResult[]>([
  {
    id: 1116680,
    identifier: "10.5061/dryad.jp917",
    identifierType: "doi",
    title:
      "Data from: Building the graph of medicine from millions of clinical narratives",
    authors: "Finlayson, Samuel G.; LePendu, Paea; Shah, Nigam H.",
    version: null,
    publishedAt: new Date("2015-08-28"),
    dIndex: 2511.36,
    citationCount: 840,
    mentionCount: 3,
  },
  {
    id: 4360136,
    identifier: "10.7910/dvn/dbw86t",
    identifierType: "doi",
    title:
      "The HAM10000 dataset, a large collection of multi-source dermatoscopic images of common pigmented skin lesions",
    authors: "Tschandl, Philipp",
    version: null,
    publishedAt: new Date("2018-01-01"),
    dIndex: 1333.95,
    citationCount: 827,
    mentionCount: 117,
  },
  {
    id: 3003537,
    identifier: "10.7937/k9/tcia.2017.klxwjj1q",
    identifierType: "doi",
    title:
      "Segmentation Labels for the Pre-operative Scans of the TCGA-GBM collection",
    authors:
      "Bakas, Spyridon; Akbari, Hamed; Sotiras, Aristeidis; Bilello, Michel; Rozycki, Martin; Kirby, Justin; Freymann, John; Farahani, Keyvan; Davatzikos, Christos",
    version: null,
    publishedAt: new Date("2017-01-01"),
    dIndex: 842.22,
    citationCount: 530,
    mentionCount: 507,
  },
  {
    id: 1934257,
    identifier: "10.13012/j8pn93h8",
    identifierType: "doi",
    title: "New York City Taxi Trip Data (2010-2013)",
    authors: "Donovan, Brian; Work, Dan",
    version: null,
    publishedAt: new Date("2016-01-01"),
    dIndex: 508.74,
    citationCount: 306,
    mentionCount: 110,
  },
  {
    id: 3749268,
    identifier: "10.5281/zenodo.1117372",
    identifierType: "doi",
    title: "MUSDB18 - a corpus for music separation",
    authors:
      "Rafii, Zafar; Liutkus, Antoine; Stöter, Fabian-Robert; Mimilakis, Stylianos Ioannis; Bittner, Rachel",
    version: null,
    publishedAt: new Date("2017-12-17"),
    dIndex: 440.46,
    citationCount: 271,
    mentionCount: 74,
  },
  {
    id: 2413757,
    identifier: "10.6084/m9.figshare.3115156.v2",
    identifierType: "doi",
    title: "Common Workflow Language, v1.0",
    authors:
      "Amstutz, Peter; Crusoe, Michael R.; Nebojša Tijanić; Chapman, Brad; Chilton, John; Heuer, Michael; Kartashov, Andrey; Leehr, Dan; Ménager, Hervé; Nedeljkovich, Maya; Scales, Matt; Soiland-Reyes, Stian; Stojanovic, Luka",
    version: "v2",
    publishedAt: new Date("2016-01-01"),
    dIndex: 426.18,
    citationCount: 257,
    mentionCount: 231,
  },
  {
    id: 6242085,
    identifier: "10.24381/cds.adbb2d47",
    identifierType: "doi",
    title: "ERA5 hourly data on single levels from 1940 to present",
    authors: "C3S",
    version: null,
    publishedAt: new Date("2018-01-01"),
    dIndex: 288.1,
    citationCount: 173,
    mentionCount: 2287,
  },
  {
    id: 1261090,
    identifier: "10.7910/dvn/ydeput",
    identifierType: "doi",
    title: "ESC: Dataset for Environmental Sound Classification",
    authors: "J. Piczak, Karol",
    version: null,
    publishedAt: new Date("2015-01-01"),
    dIndex: 270.51,
    citationCount: 160,
    mentionCount: 171,
  },
  {
    id: 3777593,
    identifier: "10.17632/rscbjbr9sj.2",
    identifierType: "doi",
    title:
      "Labeled Optical Coherence Tomography (OCT) and Chest X-Ray Images for Classification",
    authors: "Kermany, Daniel",
    version: null,
    publishedAt: new Date("2018-01-06"),
    dIndex: 244.72,
    citationCount: 156,
    mentionCount: 734,
  },
  {
    id: 5155149,
    identifier: "10.7910/dvn/voqchq",
    identifierType: "doi",
    title: "County Presidential Election Returns 2000-2024",
    authors: "MIT Election Data and Science Lab",
    version: null,
    publishedAt: new Date("2018-01-01"),
    dIndex: 209.68,
    citationCount: 131,
    mentionCount: 287,
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
    // Persist search term in URL so back/forward restores the search
    await router.replace({
      path: route.path,
      query: {
        ...route.query,
        ...(searchTerm.value.trim()
          ? { q: searchTerm.value.trim() }
          : { q: undefined }),
      },
    });
  } else {
    searchPage.value = page;
  }

  searchLoading.value = true;

  await $fetch(
    `/api/search/datasets?q=${encodeURIComponent(searchTerm.value)}&page=${page}`,
  )
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
        title="Browse Datasets"
        description="We have created 49M+ dataset impact pages from our large scale analysis. Search a dataset below to view its impact."
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
                    can browse right away.
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
                <NuxtLink
                  v-for="result in defaultSearchResults"
                  :key="result.id"
                  :to="`/datasets/${result.id}`"
                  class="hover:border-primary-500 relative flex rounded-lg border-2 border-gray-200 bg-white p-4 transition-all dark:border-gray-700 dark:bg-gray-800/50 dark:hover:border-gray-600"
                >
                  <div class="flex min-w-0 flex-1 flex-col gap-2">
                    <div class="flex items-start justify-between gap-3">
                      <h3
                        class="line-clamp-2 min-w-0 flex-1 text-base leading-snug font-semibold"
                      >
                        {{ result.title }}
                      </h3>

                      <div class="mt-1 flex items-center gap-2">
                        <UBadge
                          color="info"
                          variant="soft"
                          size="sm"
                          :label="`D-Index: ${formatter.format(result.dIndex)}`"
                        />

                        <UBadge
                          color="info"
                          variant="soft"
                          size="sm"
                          :label="`Citations: ${formatter.format(result.citationCount)}`"
                        />

                        <UBadge
                          color="info"
                          variant="soft"
                          size="sm"
                          :label="`Mentions: ${formatter.format(result.mentionCount)}`"
                        />
                      </div>
                    </div>

                    <div
                      class="flex min-w-0 flex-1 items-end justify-between gap-10"
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
                          class="flex-1 text-sm text-gray-600 dark:text-gray-400"
                        >
                          {{ result.authors }}
                        </p>
                      </div>

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
                          class="max-w cursor-pointer truncate font-mono text-xs"
                          @click="copyToClipboard(result.identifier)"
                        />
                      </UTooltip>
                    </div>
                  </div>
                </NuxtLink>
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
                  <NuxtLink
                    v-for="result in searchResults"
                    :key="result.id"
                    :to="`/datasets/${result.id}`"
                    class="hover:border-primary-500 relative flex rounded-lg border-2 border-gray-200 bg-white p-4 transition-all dark:border-gray-700 dark:bg-gray-800/50 dark:hover:border-gray-600"
                  >
                    <div class="flex min-w-0 flex-1 flex-col gap-2">
                      <div class="flex items-start justify-between gap-3">
                        <h3
                          class="line-clamp-2 min-w-0 flex-1 text-base leading-snug font-semibold"
                        >
                          {{ result.title }}
                        </h3>

                        <div class="mt-1 flex items-center gap-2">
                          <UBadge
                            color="info"
                            variant="soft"
                            size="sm"
                            :label="`D-Index: ${formatter.format(result.dIndex)}`"
                          />

                          <UBadge
                            color="info"
                            variant="soft"
                            size="sm"
                            :label="`Citations: ${formatter.format(result.citationCount)}`"
                          />

                          <UBadge
                            color="info"
                            variant="soft"
                            size="sm"
                            :label="`Mentions: ${formatter.format(result.mentionCount)}`"
                          />
                        </div>
                      </div>

                      <div
                        class="flex min-w-0 flex-1 items-end justify-between gap-10"
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
                            class="flex-1 text-sm text-gray-600 dark:text-gray-400"
                          >
                            {{ result.authors }}
                          </p>
                        </div>

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
                            class="max-w cursor-pointer truncate font-mono text-xs"
                            @click="copyToClipboard(result.identifier)"
                          />
                        </UTooltip>
                      </div>
                    </div>
                  </NuxtLink>
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

<script setup lang="ts">
useSeoMeta({
  title: "Search Organizations",
  description: "Search for organizations by name.",
});

defineOgImageComponent("Pergel", {
  headline: "Search Organizations",
});

type SearchResult = {
  id: number;
  name: string;
  datasetCount: number;
  sIndex: number;
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
        searchForOrganizations(1, true);
      }
    }
  },
);

// On load, if URL has a search term, run the search
onMounted(() => {
  const q = (route.query.q as string)?.trim();
  if (q) {
    searchForOrganizations(1, true);
  }
});

// 3087	Naturalis Biodiversity Center	460	18665.83233281953	2025	40.58	54087
// 18492	University of Alaska Fairbanks - School of Fisheries and Oceans	59	1750.130674790651	2024	29.66	4125
// 9523	Yale Peabody Museum	22	9568.066494731056	2025	434.91	28635
// 653	California Academy of Sciences	297	9262.133983899585	2025	31.19	26631
// 2496	University of Colorado	794	2520.968694784173	2025	3.18	3733
// 45730	Bloomberg	31	7198.113511451558	2025	232.2	16949
// 10543	University of Kansas, Biodiversity Institute	8	3870.560131932596	2025	483.82	11585
// 179	University of Exeter	2772	3593.562857698414	2025	1.3	2270
// 440	Boston University	3013	3632.0423205792004	2025	1.21	2733
// 9895	Danish Biodiversity Information Facility (DanBIF)	119	2719.152466734635	2025	22.85	4980

// Populate via query; placeholder data for layout only
const defaultSearchResults = ref<SearchResult[]>([
  {
    id: 3087,
    name: "Naturalis Biodiversity Center",
    datasetCount: 460,
    sIndex: 18665.83233281953,
  },
  {
    id: 18492,
    name: "University of Alaska Fairbanks - School of Fisheries and Oceans",
    datasetCount: 59,
    sIndex: 1750.130674790651,
  },
  {
    id: 9523,
    name: "Yale Peabody Museum",
    datasetCount: 22,
    sIndex: 9568.066494731056,
  },
  {
    id: 653,
    name: "California Academy of Sciences",
    datasetCount: 297,
    sIndex: 9262.133983899585,
  },
  {
    id: 2496,
    name: "University of Colorado",
    datasetCount: 794,
    sIndex: 2520.968694784173,
  },
  {
    id: 45730,
    name: "Bloomberg",
    datasetCount: 31,
    sIndex: 7198.113511451558,
  },
  {
    id: 10543,
    name: "University of Kansas, Biodiversity Institute",
    datasetCount: 8,
    sIndex: 3870.560131932596,
  },
  {
    id: 179,
    name: "University of Exeter",
    datasetCount: 2772,
    sIndex: 3593.562857698414,
  },
  {
    id: 440,
    name: "Boston University",
    datasetCount: 3013,
    sIndex: 3632.0423205792004,
  },
  {
    id: 9895,
    name: "Danish Biodiversity Information Facility (DanBIF)",
    datasetCount: 119,
    sIndex: 2719.152466734635,
  },
]);

const updateSearchPage = (page: number) => {
  searchForOrganizations(page, false);
};

const clearSearch = async () => {
  searchTerm.value = "";
  searchResults.value = [];
  searchPage.value = 1;
  searchTotal.value = -1;
  searchDuration.value = "0ms";
  hasSearched.value = false;
  await router.replace({
    path: route.path,
    query: { ...route.query, q: undefined },
  });
};

const searchForOrganizations = async (
  page: number = 1,
  reset: boolean = false,
) => {
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
    `/api/search/ao?q=${encodeURIComponent(searchTerm.value)}&page=${page}`,
  )
    .then(
      (response: {
        organizations: SearchResult[];
        total: number;
        page: number;
        queryDuration: string;
      }) => {
        searchResults.value = response.organizations;
        searchTotal.value = response.total;
        searchPage.value = response.page;
        searchDuration.value = response.queryDuration;
        hasSearched.value = true;
      },
    )
    .catch((error) => {
      toast.add({
        title: "Error searching for organizations",
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
        title="Browse Organizations"
        description="We have automatically created 220K+ organization profiles from a large scale analysis of 49M+ dataset. They are available for demo purpose. Search an organization below to view its profile and S-index."
      />

      <UPageBody>
        <div class="w-full space-y-5">
          <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
            <UInput
              v-model="searchTerm"
              icon="i-lucide-search"
              size="lg"
              variant="outline"
              placeholder="Search for organizations by name..."
              class="min-w-0 flex-1"
              @keyup.enter="searchForOrganizations(searchPage, true)"
            />

            <UButton
              v-if="hasSearched || searchTerm.trim()"
              icon="i-heroicons-x-circle-20-solid"
              label="Clear"
              size="lg"
              color="neutral"
              variant="outline"
              class="shrink-0"
              @click="clearSearch"
            />

            <UButton
              icon="i-heroicons-magnifying-glass-20-solid"
              label="Search"
              size="lg"
              :disabled="!searchTerm.trim()"
              :loading="searchLoading"
              class="shrink-0"
              @click="searchForOrganizations(searchPage, true)"
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
                    Not sure what to search for? Below are popular organizations
                    you can browse. Click any card to open it, or use the search
                    above when you have something in mind.
                  </p>
                </div>
              </div>
            </div>

            <div>
              <p
                class="mb-3 text-sm font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400"
              >
                Popular organizations to explore
              </p>

              <SearchResultsList :results="defaultSearchResults" type="org" />
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

                <SearchResultsList :results="searchResults" type="org" />
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
              No organizations found. Try a different search term.
            </p>
          </div>
        </div>
      </UPageBody>
    </UPage>
  </UContainer>
</template>

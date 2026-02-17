<script setup lang="ts">
useSeoMeta({
  title: "Search Users",
  description: "Search for researchers by name, identifiers, or affiliations.",
});

defineOgImageComponent("Pergel", {
  headline: "Search Users",
});

type SearchResult = {
  id: number;
  name: string;
  nameIdentifiers: string[];
  affiliations: string[];
  sIndex: number;
  datasetCount: number;
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
        searchForUsers(1, true);
      }
    }
  },
);

// On load, if URL has a search term, run the search
onMounted(() => {
  const q = (route.query.q as string)?.trim();
  if (q) {
    searchForUsers(1, true);
  }
});

// 14773	Schiebel, Ralf			840	26682.386616270604	2025	31.76	39057
// 1002	Hemleben, Christoph			762	23119.658062356193	2025	30.34	33881
// 430013	Motz, Gary	Personal	Yale Peabody Museum	10	9545.833550065021	2025	954.58	28627
// 3640718	Krizhevsky, Alex	Personal		9	8628.512587474217	2025	958.72	25638
// 432818	Grant, Sharon	Personal	Field Museum of Natural History	11	7664.501405795111	2025	696.77	22607
// 1009	Mackensen, Andreas			576	6814.500882927574	2025	11.83	9421
// 16707	Assmy, Philipp			250	5324.177973344383	2025	21.3	8160
// 14790	Stangeew, Elena			118	5192.257787662468	2024	44	7618
// 19724	Armonies, Werner			184	4543.086065965589	2024	24.69	7550
// 17749	Psarra, Stella			271	4032.2259456781276	2024	14.88	6160

// Populate via query; placeholder data for layout only
const defaultSearchResults = ref<SearchResult[]>([
  {
    id: 14773,
    name: "Schiebel, Ralf",
    nameIdentifiers: ["0000-0002-6252-7647"],
    affiliations: [],
    datasetCount: 840,
    sIndex: 26682.386616270604,
  },
  {
    id: 1002,
    name: "Hemleben, Christoph",
    nameIdentifiers: [],
    affiliations: [],
    datasetCount: 762,
    sIndex: 23119.658062356193,
  },
  {
    id: 430013,
    name: "Motz, Gary",
    nameIdentifiers: [],
    affiliations: ["Yale Peabody Museum"],
    datasetCount: 10,
    sIndex: 9545.833550065021,
  },
  {
    id: 3640718,
    name: "Krizhevsky, Alex",
    nameIdentifiers: [],
    affiliations: [],
    datasetCount: 9,
    sIndex: 8628.512587474217,
  },
  {
    id: 432818,
    name: "Grant, Sharon",
    nameIdentifiers: [],
    affiliations: ["Field Museum of Natural History"],
    datasetCount: 11,
    sIndex: 7664.501405795111,
  },
  {
    id: 1009,
    name: "Mackensen, Andreas",
    nameIdentifiers: ["https://orcid.org/0000-0002-5024-4455"],
    affiliations: [],
    datasetCount: 576,
    sIndex: 6814.500882927574,
  },
  {
    id: 16707,
    name: "Assmy, Philipp",
    nameIdentifiers: [],
    affiliations: [],
    datasetCount: 250,
    sIndex: 5324.177973344383,
  },
  {
    id: 14790,
    name: "Stangeew, Elena",
    nameIdentifiers: [],
    affiliations: [],
    datasetCount: 118,
    sIndex: 5192.257787662468,
  },
  {
    id: 19724,
    name: "Armonies, Werner",
    nameIdentifiers: ["https://orcid.org/0000-0001-5546-2462"],
    affiliations: [],
    datasetCount: 184,
    sIndex: 4543.086065965589,
  },
  {
    id: 17749,
    name: "Psarra, Stella",
    nameIdentifiers: [],
    affiliations: [],
    datasetCount: 271,
    sIndex: 4032.2259456781276,
  },
]);

const updateSearchPage = (page: number) => {
  searchForUsers(page, false);
};

const searchForUsers = async (page: number = 1, reset: boolean = false) => {
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
    `/api/search/au?q=${encodeURIComponent(searchTerm.value)}&page=${page}`,
  )
    .then(
      (response: {
        users: SearchResult[];
        total: number;
        page: number;
        queryDuration: string;
      }) => {
        searchResults.value = response.users;
        searchTotal.value = response.total;
        searchPage.value = response.page;
        searchDuration.value = response.queryDuration;
        hasSearched.value = true;
      },
    )
    .catch((error) => {
      toast.add({
        title: "Error searching for users",
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
        title="Browse Profiles"
        description="We have automatically created 1M+ researcher profiles from a large scale analysis of 49M+ dataset. They are available for demo purpose. Search a researcher below to view their profile and S-index."
      />

      <UPageBody>
        <div class="w-full space-y-5">
          <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
            <UInput
              v-model="searchTerm"
              icon="i-lucide-search"
              size="lg"
              variant="outline"
              placeholder="Search for users by name..."
              class="min-w-0 flex-1"
              @keyup.enter="searchForUsers(searchPage, true)"
            />

            <UButton
              icon="i-heroicons-magnifying-glass-20-solid"
              label="Search"
              size="lg"
              :disabled="!searchTerm.trim()"
              :loading="searchLoading"
              class="shrink-0"
              @click="searchForUsers(searchPage, true)"
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
                    Below are high-impact profiles (high S-index and high reuse
                    of datasets relative to their field of research)
                  </p>
                </div>
              </div>
            </div>

            <div>
              <p
                class="mb-3 text-sm font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400"
              >
                Popular users to explore
              </p>

              <SearchResultsList
                :results="defaultSearchResults"
                type="user"
              />
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

                <SearchResultsList :results="searchResults" type="user" />
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
              No users found. Try a different search term.
            </p>
          </div>
        </div>
      </UPageBody>
    </UPage>
  </UContainer>
</template>

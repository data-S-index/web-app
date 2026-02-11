<script setup lang="ts">
useSeoMeta({
  title: "Search Organizations",
  description: "Search for organizations by name.",
});

defineOgImageComponent("Pergel", {
  headline: "Search Organizations",
});

type SearchResult = {
  id: string;
  name: string;
  datasetCount: number;
};

const formatter = Intl.NumberFormat("en", { notation: "compact" });

const toast = useToast();
const searchTerm = ref("");
const searchLoading = ref(false);
const searchResults = ref<SearchResult[]>([]);
const searchPage = ref(1);
const searchTotal = ref(-1);
const searchDuration = ref<string>("0ms");
const hasSearched = ref(false);

// Populate via query; placeholder data for layout only
const defaultSearchResults = ref<SearchResult[]>([
  {
    id: "01KGS1CE185QK2BGHPFXXSS2XK",
    name: "National Institute for Fusion Science",
    datasetCount: 16350783,
  },
  {
    id: "01KGS1CDZ8TGFXKE7YEPNBSS6G",
    name: "Leibniz Institute DSMZ - German Collection of Microorganisms and Cell Cultures",
    datasetCount: 460822,
  },
  {
    id: "01KGS1CD8PSJQ8TYAEX0HF1QX6",
    name: "Pacific Northwest National Laboratory",
    datasetCount: 444723,
  },
  {
    id: "01KGDHY7VBS6SQGS2HFVGQ3SEV",
    name: "Environmental Molecular Sciences Laboratory",
    datasetCount: 406437,
  },
  {
    id: "01KGS1CD7VNEA3WMJGBT6M526P",
    name: "California Institute of Technology",
    datasetCount: 47303,
  },
  {
    id: "01KGDHY7GQ47JMV73PT9PK7CHR",
    name: "Harvard University",
    datasetCount: 36640,
  },
  {
    id: "01KGDHY7S6G5G22MTE9P45ZMV7",
    name: "Friedrich-Schiller-University Jena",
    datasetCount: 33660,
  },
]);

const updateSearchPage = (page: number) => {
  searchForOrganizations(page, false);
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

// Avatar URL or initial for org (user/org style)
const getOrgAvatarUrl = (org: SearchResult) => {
  const seed = org.id || org.name || "org";

  return `https://api.dicebear.com/9.x/shapes/svg?seed=${encodeURIComponent(seed)}`;
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

              <div class="space-y-3">
                <NuxtLink
                  v-for="result in defaultSearchResults"
                  :key="result.id"
                  :to="`/ao/${result.id}`"
                  class="hover:border-primary-400 dark:hover:border-primary-500 relative flex items-center gap-4 rounded-lg border-2 border-gray-200 bg-white p-4 transition-all hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50 dark:hover:border-gray-800"
                >
                  <UAvatar
                    :src="getOrgAvatarUrl(result)"
                    :alt="result.name"
                    size="xl"
                    class="squircle rounded-none"
                  />

                  <div class="min-w-0 flex-1">
                    <h3
                      class="line-clamp-1 text-base font-semibold text-gray-900 dark:text-gray-100"
                    >
                      {{ result.name || result.id }}
                    </h3>

                    <p
                      class="mt-0.5 truncate text-sm text-gray-500 dark:text-gray-400"
                    >
                      {{ formatter.format(result.datasetCount) }} dataset{{
                        result.datasetCount === 1 ? "" : "s"
                      }}
                    </p>
                  </div>

                  <UButton
                    icon="i-heroicons-arrow-right-20-solid"
                    color="primary"
                    variant="soft"
                    size="sm"
                    aria-label="View organization"
                  />
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
                    :to="`/ao/${result.id}`"
                    class="hover:border-primary-400 dark:hover:border-primary-500 relative flex items-center gap-4 rounded-lg border-2 border-gray-200 bg-white p-4 transition-all hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50 dark:hover:bg-gray-800"
                  >
                    <UAvatar
                      :src="getOrgAvatarUrl(result)"
                      :alt="result.name"
                      size="xl"
                      class="squircle rounded-none"
                    />

                    <div class="min-w-0 flex-1">
                      <h3
                        class="line-clamp-1 text-base font-semibold text-gray-900 dark:text-gray-100"
                      >
                        {{ result.name || result.id }}
                      </h3>

                      <p
                        class="mt-0.5 truncate text-sm text-gray-500 dark:text-gray-400"
                      >
                        {{ formatter.format(result.datasetCount) }} dataset{{
                          result.datasetCount === 1 ? "" : "s"
                        }}
                      </p>
                    </div>

                    <UButton
                      icon="i-heroicons-arrow-right-20-solid"
                      color="primary"
                      variant="soft"
                      size="sm"
                      aria-label="View organization"
                    />
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
              No organizations found. Try a different search term.
            </p>
          </div>
        </div>
      </UPageBody>
    </UPage>
  </UContainer>
</template>

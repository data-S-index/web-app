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

const toast = useToast();
const searchTerm = ref("");
const searchLoading = ref(false);
const searchResults = ref<SearchResult[]>([]);
const searchPage = ref(1);
const searchTotal = ref(-1);
const searchDuration = ref<string>("0ms");
const hasSearched = ref(false);

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
        title="Search Organizations"
        description="Find automated organizations by name."
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
                        {{ result.datasetCount }} dataset{{
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

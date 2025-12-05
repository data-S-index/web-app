<script setup lang="ts">
const { user, loggedIn } = useUserSession();

useSeoMeta({
  title: "Add Datasets",
});

const route = useRoute();
const router = useRouter();
const toast = useToast();

const userid = (route.params.userid as string).toUpperCase();

if (!loggedIn.value || user.value?.id !== userid) {
  navigateTo(`/users/${userid}`);
}

const userName =
  `${user.value?.givenName || ""} ${user.value?.familyName || ""}`.trim();

type SearchResult = {
  id: number;
  title: string;
  authors: string;
  version: string | null;
  publishedAt: string | Date;
};

const searchTerm = ref<string>(userName || "");
const searchLoading = ref(false);
const searchResults = ref<SearchResult[]>([]);
const searchPage = ref(1);
const searchTotal = ref(-1);
const searchDuration = ref<string>("0ms");
const attachDatasetsToUserLoading = ref(false);
const rowSelection = ref<Record<string, boolean>>({});
const selectAll = ref(false);

// Fetch user datasets to check for existing ones
const { data: userData } = await useFetch(`/api/users/${userid}/datasets`);

const updateSearchPage = (page: number) => {
  searchForDatasets(page, false);
};

const searchForDatasets = async (page: number = 1, reset: boolean = false) => {
  if (reset) {
    searchPage.value = 1;
    searchTotal.value = -1;
    searchResults.value = [];
    rowSelection.value = {};
  }

  searchLoading.value = true;
  console.log("Searching for datasets on page", page);

  await $fetch(
    `/api/datasets/search?q=${searchTerm.value}&page=${searchPage.value}&total=${searchTotal.value}`,
  )
    .then((response) => {
      console.log(response);
      searchResults.value = response.datasets as SearchResult[];
      searchTotal.value = response.total;
      searchPage.value = response.page;
      searchDuration.value = response.queryDuration;
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

const attachDatasetsToUser = async () => {
  attachDatasetsToUserLoading.value = true;

  // rowSelection has an object with the index in string format of the row as the key and the value is true if the row is selected
  const selectedDatasetIds = Object.keys(rowSelection.value).filter(
    (key) => rowSelection.value[key],
  );

  console.log("selectedDatasetIds", selectedDatasetIds);

  // Filter out datasets that the user already has
  const existingDatasetIds = new Set(
    userData.value?.map((item: { datasetId: number }) =>
      String(item.datasetId),
    ) || [],
  );
  const datasetIds = selectedDatasetIds
    .filter((id): id is string => !!id)
    .filter((id) => !existingDatasetIds.has(id))
    .map((id) => Number(id));

  if (!datasetIds.length) {
    if (selectedDatasetIds.length > 0) {
      toast.add({
        title: "All selected datasets are already in your list",
        description: "Please select datasets that you don't already have",
        icon: "material-symbols:info",
        color: "info",
      });
    } else {
      toast.add({
        title: "No datasets selected",
        description: "Please select at least one dataset",
        icon: "material-symbols:error",
        color: "error",
      });
    }
    attachDatasetsToUserLoading.value = false;

    return;
  }

  await $fetch("/api/user/datasets/", {
    method: "POST",
    body: {
      datasetIds,
    },
  })
    .then(async () => {
      toast.add({
        title: "Datasets added successfully",
        description: "Datasets have been added to your account",
      });

      // Redirect back to user page
      await router.push(`/users/${userid}`);
    })
    .catch((error) => {
      toast.add({
        title: "Error adding datasets",
        description: error.data?.statusMessage,
        icon: "material-symbols:error",
        color: "error",
      });
    })
    .finally(() => {
      attachDatasetsToUserLoading.value = false;
    });
};

// Watch selectAll to toggle all checkboxes
watch(selectAll, (value) => {
  if (value) {
    searchResults.value.forEach((result) => {
      rowSelection.value[String(result.id)] = true;
    });
  } else {
    searchResults.value.forEach((result) => {
      rowSelection.value[String(result.id)] = false;
    });
  }
});
</script>

<template>
  <UContainer>
    <UPage>
      <UPageHeader>
        <template #title> Add datasets for {{ userName }} </template>
      </UPageHeader>

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
                  class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <UCheckbox v-model="selectAll" label="Select all" size="md" />

                  <div class="flex items-center gap-3">
                    <div
                      v-if="searchDuration !== '0ms' && !searchLoading"
                      class="flex items-center gap-1.5 rounded-lg bg-gray-100 px-3 py-1.5 dark:bg-gray-800"
                    >
                      <Icon
                        name="i-heroicons-clock-20-solid"
                        class="h-4 w-4 text-gray-500 dark:text-gray-400"
                      />

                      <span
                        class="text-xs font-medium text-gray-600 dark:text-gray-400"
                      >
                        {{ searchDuration }}
                      </span>
                    </div>

                    <UButton
                      icon="i-heroicons-plus-20-solid"
                      label="Add selected datasets"
                      size="md"
                      :disabled="searchLoading || searchResults.length === 0"
                      :loading="attachDatasetsToUserLoading"
                      @click="attachDatasetsToUser"
                    />
                  </div>
                </div>

                <USeparator class="my-4" />

                <div class="space-y-3">
                  <UCard
                    v-for="result in searchResults"
                    :key="result.id"
                    class="transition-all hover:shadow-md"
                  >
                    <div class="flex gap-4 p-4">
                      <UCheckbox
                        v-model="rowSelection[String(result.id)]"
                        class="mt-1 shrink-0"
                      />

                      <div class="flex min-w-0 flex-1 flex-col gap-2">
                        <div class="flex items-start justify-between gap-3">
                          <a
                            :href="`/datasets/${result.id}`"
                            target="_blank"
                            class="group min-w-0 flex-1"
                          >
                            <h3
                              class="group-hover:text-primary-600 dark:group-hover:text-primary-400 line-clamp-2 text-base leading-snug font-semibold transition-colors"
                            >
                              {{ result.title }}
                            </h3>
                          </a>

                          <UBadge
                            v-if="result.version"
                            color="primary"
                            variant="soft"
                            size="sm"
                            :label="`v${result.version}`"
                            icon="i-heroicons-tag-20-solid"
                            class="shrink-0"
                          />
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
                            class="flex min-w-0 items-center gap-2"
                          >
                            <Icon
                              name="i-heroicons-calendar-20-solid"
                              class="h-4 w-4 shrink-0 text-gray-400"
                            />

                            <p class="text-xs text-gray-500 dark:text-gray-500">
                              {{
                                $dayjs(result.publishedAt).format("MMMM YYYY")
                              }}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </UCard>
                </div>
              </div>

              <div class="flex w-full justify-center">
                <UPagination
                  v-model:page="searchPage"
                  :total="searchTotal"
                  :disabled="searchLoading"
                  @update:page="updateSearchPage"
                />
              </div>
            </div>
          </div>

          <div
            v-else-if="!searchLoading && searchTerm.trim()"
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

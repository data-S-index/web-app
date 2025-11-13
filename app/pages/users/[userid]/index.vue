<script setup lang="ts">
import { faker } from "@faker-js/faker";
import { h, resolveComponent } from "vue";
import type { TableColumn } from "@nuxt/ui";
const { user, loggedIn } = useUserSession();

const UCheckbox = resolveComponent("UCheckbox");
const UButton = resolveComponent("UButton");

useSeoMeta({
  title: "User Profile",
});

const route = useRoute();
const toast = useToast();

// const { userid } = route.params as { userid: string };
const userid = (route.params.userid as string).toUpperCase();

// const { user } = useUserSession();

// const searchTerm = ref<string>(
//   user.value?.givenName && user.value?.familyName
//     ? `${user.value?.givenName} ${user.value?.familyName}`
//     : "",
// );

const searchTerm = ref<string>("");

const searchLoading = ref<boolean>(false);
const searchResults = ref<{ id: string; title: string; doi: string }[]>([]);
const addDatasetModal = ref<boolean>(false);
const attachDatasetsToUserLoading = ref<boolean>(false);

const columns: TableColumn<{ id: string; title: string; doi: string }>[] = [
  {
    id: "select",
    header: ({ table }) =>
      h(UCheckbox, {
        modelValue: table.getIsSomePageRowsSelected()
          ? "indeterminate"
          : table.getIsAllPageRowsSelected(),
        "onUpdate:modelValue": (value: boolean | "indeterminate") =>
          table.toggleAllPageRowsSelected(!!value),
        "aria-label": "Select all",
      }),
    cell: ({ row }) =>
      h(UCheckbox, {
        modelValue: row.getIsSelected(),
        "onUpdate:modelValue": (value: boolean | "indeterminate") =>
          row.toggleSelected(!!value),
        "aria-label": "Select row",
      }),
  },
  // {
  //   id: "id",
  //   header: "#",
  //   cell: ({ row }) => row.original.id,
  // },
  {
    id: "title",
    header: "Title",
    cell: ({ row }) => row.original.title,
  },
  {
    id: "doi",
    header: "DOI",
    cell: ({ row }) =>
      h(UButton, {
        icon: "i-heroicons-link-20-solid",
        trailing: true,
        label: row.original.doi,
        href: `https://doi.org/${row.original.doi}`,
        target: "_blank",
        size: "sm",
        variant: "link",
      }),
  },
];
const rowSelection = ref<Record<string, boolean>>({});

const {
  data: userData,
  error,
  refresh: refreshUserData,
} = await useFetch(`/api/users/${userid}/datasets`);

if (error.value) {
  toast.add({
    title: "Error fetching datasets",
    description: error.value.data?.statusMessage,
    icon: "material-symbols:error",
    color: "error",
  });
}

// Fetch user profile info
const { data: userProfile, error: userProfileError } = await useFetch(
  `/api/users/${userid}`,
);

if (userProfileError.value) {
  toast.add({
    title: "Error fetching user profile",
    description: userProfileError.value.data?.statusMessage,
    icon: "material-symbols:error",
    color: "error",
  });
}

// Generate fake affiliation with faker
const affiliation = computed(() => {
  if (!userProfile.value) return "";

  // Use userid as seed for consistent fake data
  faker.seed([...userid].reduce((acc, char) => acc + char.charCodeAt(0), 0));

  return faker.company.name();
});

// Generate avatar URL from dicebear using userid as seed
const avatarUrl = computed(() => {
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${userid}`;
});

// Get user's full name
const fullName = computed(() => {
  if (!userProfile.value) return "";

  const givenName = userProfile.value.givenName || "";
  const familyName = userProfile.value.familyName || "";

  return `${givenName} ${familyName}`.trim() || "User";
});

const searchForDatasets = async () => {
  searchLoading.value = true;

  await $fetch(`/api/datasets/search?q=${searchTerm.value}`)
    .then((response) => {
      searchResults.value = response.map(
        (result: { id: string; title: string; doi: string }) => ({
          id: result.id,
          title: result.title,
          doi: result.doi,
        }),
      );

      // Pre-select datasets that the user already has
      if (userData.value) {
        const existingDatasetIds = new Set(
          userData.value.map((item: { datasetId: string }) => item.datasetId),
        );

        const preSelection: Record<string, boolean> = {};
        searchResults.value.forEach((result, index) => {
          if (existingDatasetIds.has(result.id)) {
            preSelection[index.toString()] = true;
          }
        });

        rowSelection.value = preSelection;
      }
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
  const selectedDatasetIds = Object.keys(rowSelection.value)
    .filter((key) => rowSelection.value[key])
    .map((key) => searchResults.value[parseInt(key)]?.id);

  // Filter out datasets that the user already has
  const existingDatasetIds = new Set(
    userData.value?.map((item: { datasetId: string }) => item.datasetId) || [],
  );
  const datasetIds = selectedDatasetIds
    .filter((id): id is string => !!id)
    .filter((id) => !existingDatasetIds.has(id));

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
        title: "Datasets attached to user",
        description: "Datasets attached to user successfully",
      });

      // Refresh user data
      await refreshUserData();

      // Close the modal
      addDatasetModal.value = false;

      // Clear search state
      searchResults.value = [];
      rowSelection.value = {};
      searchTerm.value = "";
    })
    .catch((error) => {
      toast.add({
        title: "Error attaching datasets to user",
        description: error.data?.statusMessage,
        icon: "material-symbols:error",
        color: "error",
      });
    })
    .finally(() => {
      attachDatasetsToUserLoading.value = false;
    });
};

const openAddDatasetModal = () => {
  addDatasetModal.value = true;
};

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

const getAuthorTooltipText = (author: Author): string => {
  const parts: string[] = [];

  // Add affiliations
  const affiliations = author.affiliations || author.affiliation || [];
  if (Array.isArray(affiliations) && affiliations.length > 0) {
    parts.push(`${affiliations.join("; ")}`);
  }

  return parts.length > 0
    ? parts.join("\n")
    : "No additional information available";
};
</script>

<template>
  <UContainer>
    <UPage>
      <UPageHeader>
        <template #title>
          <div class="flex items-center gap-2">
            <UAvatar :src="avatarUrl" :alt="fullName" size="3xl" />

            <div class="flex flex-col">
              <h1
                v-if="fullName"
                class="text-2xl font-bold text-gray-900 dark:text-gray-100"
              >
                {{ fullName }}
              </h1>

              <p
                v-if="affiliation"
                class="flex items-center text-sm font-medium text-gray-500 dark:text-gray-400"
              >
                {{ affiliation }}
              </p>
            </div>
          </div>
        </template>

        <template #links />
      </UPageHeader>

      <UPageBody>
        <div class="mb-6 grid grid-cols-1 gap-6 md:grid-cols-3">
          <UCard>
            <template #header>
              <h3 class="text-lg font-semibold">Total Datasets</h3>
            </template>

            <div class="text-3xl font-bold text-pink-600">
              {{ userData?.length }}
            </div>

            <p class="mt-2 text-sm">Claimed by user</p>
          </UCard>

          <UCard>
            <template #header>
              <h3 class="text-lg font-semibold">S-Index Score</h3>
            </template>

            <div class="text-3xl font-bold text-pink-600">
              {{ faker.number.float({ min: 0, max: 100 }).toFixed(2) }}
            </div>

            <p class="mt-2 text-sm">S-Index score for the user's datasets</p>
          </UCard>

          <UCard>
            <template #header>
              <h3 class="text-lg font-semibold">Total Citations</h3>
            </template>

            <div class="text-3xl font-bold text-pink-500">
              {{
                userData?.reduce(
                  (sum: number, item: any) =>
                    sum + item.dataset.Citation.length,
                  0,
                )
              }}
            </div>

            <p class="mt-2 text-sm">Total citations for the user's datasets</p>
          </UCard>
        </div>

        <USeparator />

        <div class="flex items-center justify-between">
          <h2 class="text-2xl font-bold">Datasets</h2>

          <div class="flex items-center gap-2">
            <UModal
              v-model="addDatasetModal"
              title="Add a dataset"
              description="Add a dataset to your account"
              fullscreen
            >
              <UButton
                v-if="loggedIn && user?.id === userid"
                icon="i-heroicons-plus-20-solid"
                label="Add a dataset"
                @click="openAddDatasetModal"
              />

              <template #actions>
                <div class="flex w-full items-center justify-end gap-2">
                  <UButton
                    icon="i-heroicons-plus-20-solid"
                    label="Add dataset"
                    :disabled="
                      searchLoading ||
                      searchResults.length === 0 ||
                      Object.keys(rowSelection).length === 0
                    "
                    :loading="attachDatasetsToUserLoading"
                    @click="attachDatasetsToUser"
                  />
                </div>
              </template>

              <template #body>
                <div class="flex h-full flex-col gap-6 p-1">
                  <UFormField label="Search for a dataset" name="searchTerm">
                    <div class="flex items-center gap-2">
                      <UInput
                        v-model="searchTerm"
                        type="text"
                        placeholder="Search for a dataset by title, DOI, or keywords..."
                        class="flex-1"
                        @keyup.enter="searchForDatasets"
                      />

                      <UButton
                        icon="i-heroicons-magnifying-glass-20-solid"
                        label="Search"
                        :loading="searchLoading"
                        :disabled="!searchTerm.trim()"
                        @click="searchForDatasets"
                      />
                    </div>
                  </UFormField>

                  <USeparator />

                  <div
                    v-if="searchResults.length > 0"
                    class="flex flex-1 flex-col overflow-hidden"
                  >
                    <div class="mb-4 flex items-center justify-between">
                      <p
                        class="text-sm font-medium text-gray-700 dark:text-gray-300"
                      >
                        Found {{ searchResults.length }} result{{
                          searchResults.length !== 1 ? "s" : ""
                        }}
                      </p>

                      <p
                        v-if="Object.keys(rowSelection).length > 0"
                        class="text-primary-600 dark:text-primary-400 text-sm"
                      >
                        {{ Object.keys(rowSelection).length }} selected
                      </p>
                    </div>

                    <div
                      class="flex-1 overflow-auto rounded-lg border border-gray-200 dark:border-gray-800"
                    >
                      <UTable
                        v-model:row-selection="rowSelection"
                        :data="searchResults"
                        :columns="columns"
                        class="w-full"
                      />
                    </div>
                  </div>

                  <div
                    v-else-if="!searchLoading"
                    class="flex flex-1 flex-col items-center justify-center py-12 text-center"
                  >
                    <Icon
                      name="i-heroicons-magnifying-glass-20-solid"
                      class="dark: mb-4 h-12 w-12 text-gray-400"
                    />

                    <p class="text-base font-medium dark:text-gray-400">
                      No results found
                    </p>

                    <p class="mt-1 text-sm text-gray-500 dark:text-gray-500">
                      Try searching with different keywords
                    </p>
                  </div>

                  <div
                    v-else
                    class="flex flex-1 items-center justify-center py-12"
                  >
                    <div class="text-center">
                      <Icon
                        name="i-heroicons-arrow-path-20-solid"
                        class="text-primary-500 mx-auto h-8 w-8 animate-spin"
                      />

                      <p class="mt-4 text-sm dark:text-gray-400">
                        Searching...
                      </p>
                    </div>
                  </div>
                </div>
              </template>
            </UModal>
          </div>
        </div>

        <div v-if="userData" class="flex flex-col gap-4">
          <UCard v-for="item in userData" :key="item.datasetId">
            <template #header>
              <div class="flex items-start justify-between gap-2">
                <NuxtLink
                  :to="`/datasets/${item.datasetId}`"
                  target="_blank"
                  class="group flex-1"
                >
                  <h3
                    class="group-hover:text-primary-600 dark:group-hover:text-primary-400 text-lg font-semibold transition-colors"
                  >
                    {{ item.dataset.title || "No title available" }}
                  </h3>
                </NuxtLink>

                <UBadge
                  color="primary"
                  variant="subtle"
                  :label="`${item.dataset.Citation.length} Citation${item.dataset.Citation.length !== 1 ? 's' : ''}`"
                  icon="i-heroicons-book-open-20-solid"
                />
              </div>
            </template>

            <div class="space-y-3">
              <MarkdownRenderer
                :content="
                  item.dataset.description || 'No description available'
                "
                truncate
              />

              <div>
                <p class="mb-1 text-sm font-medium">Authors</p>

                <div class="flex flex-wrap gap-1 text-sm">
                  <template
                    v-for="(author, index) in item.dataset.authors as Author[]"
                    :key="index"
                  >
                    <UTooltip :text="getAuthorTooltipText(author)">
                      <span
                        class="hover:text-primary-600 dark:hover:text-primary-400 cursor-help underline decoration-dotted underline-offset-2 transition-colors"
                      >
                        {{
                          `${author.givenName || author.name || ""} ${author.familyName || ""}`.trim()
                        }}
                      </span>
                    </UTooltip>

                    <span
                      v-if="
                        index < (item.dataset.authors as Author[]).length - 1
                      "
                    >
                      ,
                    </span>
                  </template>
                </div>
              </div>

              <div
                class="flex flex-wrap items-center gap-2 border-t border-gray-200 pt-2 dark:border-gray-700"
              >
                <UTooltip
                  :text="`Published on ${$dayjs(item.dataset.publishedAt)
                    .format('DD MMMM YYYY HH:mm:ss')
                    .toString()}`"
                >
                  <UBadge
                    color="neutral"
                    variant="subtle"
                    class="cursor-help"
                    :label="
                      $dayjs(item.dataset.publishedAt).format('MMMM YYYY ')
                    "
                    icon="i-heroicons-calendar-20-solid"
                  />
                </UTooltip>

                <a
                  v-if="item.dataset.doi"
                  :href="`https://doi.org/${item.dataset.doi}`"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="inline-block"
                >
                  <UBadge
                    color="success"
                    variant="subtle"
                    :label="item.dataset.doi"
                    icon="i-heroicons-link-20-solid"
                    class="cursor-pointer"
                  />
                </a>
              </div>
            </div>
          </UCard>
        </div>
      </UPageBody>
    </UPage>
  </UContainer>
</template>

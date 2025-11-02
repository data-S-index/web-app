<script setup lang="ts">
import { faker } from "@faker-js/faker";
import { h, resolveComponent } from "vue";
import type { TableColumn } from "@nuxt/ui";

const UCheckbox = resolveComponent("UCheckbox");

definePageMeta({
  middleware: ["auth"],
});

useSeoMeta({
  title: "Dashboard",
});

const toast = useToast();

// const { user } = useUserSession();

// const searchTerm = ref<string>(
//   user.value?.givenName && user.value?.familyName
//     ? `${user.value?.givenName} ${user.value?.familyName}`
//     : "",
// );

const searchTerm = ref<string>("cur");

const searchLoading = ref<boolean>(false);
const searchResults = ref<{ id: number; title: string; doi: string }[]>([]);
const addDatasetModal = ref<boolean>(false);
const attachDatasetsToUserLoading = ref<boolean>(false);

const columns: TableColumn<{ id: number; title: string; doi: string }>[] = [
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
  {
    id: "id",
    header: "#",
    cell: ({ row }) => row.original.id,
  },
  {
    id: "title",
    header: "Title",
    cell: ({ row }) => row.original.title,
  },
  {
    id: "doi",
    header: "DOI",
    cell: ({ row }) => row.original.doi,
  },
];
const rowSelection = ref<Record<string, boolean>>({});

const { data: userData, error } = await useFetch("/api/user/datasets");

if (error.value) {
  toast.add({
    title: "Error fetching datasets",
    description: error.value.data?.statusMessage,
    icon: "material-symbols:error",
    color: "error",
  });
}

if (userData.value) {
  console.log(userData.value);
}

const searchForDatasets = async () => {
  searchLoading.value = true;

  await $fetch(`/api/datasets/search?q=${searchTerm.value}`)
    .then((response) => {
      searchResults.value = response.map(
        (result: { id: number; title: string; doi: string }) => ({
          id: result.id,
          title: result.title,
          doi: result.doi,
        }),
      );
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
  const datasetIds = Object.keys(rowSelection.value)
    .filter((key) => rowSelection.value[key])
    .map((key) => searchResults.value[parseInt(key)]?.id);

  if (!datasetIds.length) {
    toast.add({
      title: "No datasets selected",
      description: "Please select at least one dataset",
      icon: "material-symbols:error",
      color: "error",
    });
  }

  console.log(datasetIds);

  await $fetch("/api/user/datasets/", {
    method: "POST",
    body: {
      datasetIds,
    },
  })
    .then(() => {
      toast.add({
        title: "Datasets attached to user",
        description: "Datasets attached to user successfully",
      });
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
</script>

<template>
  <UContainer>
    <UPage>
      <UPageHeader
        title="Dashboard"
        description="A quick overview of your data."
        headline="Dashboard"
      >
        <template #links>
          <div class="flex items-center gap-2">
            <UModal
              v-model="addDatasetModal"
              title="Add a dataset"
              description="Add a dataset to your account"
              fullscreen
            >
              <UButton
                icon="i-heroicons-plus-20-solid"
                label="Add dataset"
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
                <div class="flex flex-col gap-4">
                  <UFormField label="Search for a dataset" name="searchTerm">
                    <div class="flex items-center gap-2">
                      <UInput
                        v-model="searchTerm"
                        type="text"
                        placeholder="Search for a dataset"
                      />

                      <UButton
                        icon="i-heroicons-magnifying-glass-20-solid"
                        label="Search"
                        :loading="searchLoading"
                        @click="searchForDatasets"
                      />
                    </div>
                  </UFormField>

                  <USeparator />

                  <div v-if="searchResults.length > 0">
                    <pre>{{ rowSelection }}</pre>

                    <UTable
                      v-model:row-selection="rowSelection"
                      :data="searchResults"
                      :columns="columns"
                      class="flex-1"
                    />
                  </div>

                  <div v-else>
                    <p class="text-sm text-gray-600">No results found</p>
                  </div>
                </div>
              </template>
            </UModal>
          </div>
        </template>
      </UPageHeader>

      <UPageBody>
        <h2 class="text-2xl font-bold">Your data in a nutshell</h2>

        <div class="mb-6 grid grid-cols-1 gap-6 md:grid-cols-3">
          <UCard>
            <template #header>
              <h3 class="text-lg font-semibold">Total Datasets</h3>
            </template>

            <div class="text-3xl font-bold text-pink-600">
              {{ faker.number.int({ min: 0, max: 100 }).toLocaleString() }}
            </div>

            <p class="mt-2 text-sm text-gray-600">Attached to your account</p>
          </UCard>

          <UCard>
            <template #header>
              <h3 class="text-lg font-semibold">Your S-Index Score</h3>
            </template>

            <div class="text-3xl font-bold text-pink-600">
              {{ faker.number.float({ min: 0, max: 100 }).toFixed(2) }}
            </div>

            <p class="mt-2 text-sm text-gray-600">
              Lorem ipsum dolor sit amet.
            </p>
          </UCard>

          <UCard>
            <template #header>
              <h3 class="text-lg font-semibold">Total Citations</h3>
            </template>

            <div class="text-3xl font-bold text-pink-500">
              {{ faker.number.int({ min: 0, max: 100 }).toLocaleString() }}
            </div>

            <p class="mt-2 text-sm text-gray-600">
              Lorem ipsum dolor sit amet.
            </p>
          </UCard>
        </div>

        <USeparator />

        <h2 class="text-2xl font-bold">Your datasets</h2>

        <pre>{{ userData }}</pre>
      </UPageBody>
    </UPage>
  </UContainer>
</template>

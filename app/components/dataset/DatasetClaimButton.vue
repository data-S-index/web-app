<script setup lang="ts">
const props = defineProps<{
  datasetId: number;
  initialClaimed: boolean;
}>();

const { loggedIn } = useUserSession();
const toast = useToast();

const claimed = ref(props.initialClaimed);
const loading = ref(false);

const claimDataset = async () => {
  loading.value = true;

  await $fetch("/api/user/datasets/", {
    method: "POST",
    body: { datasetIds: [props.datasetId] },
  })
    .then(() => {
      claimed.value = true;
      toast.add({
        title: "Dataset claimed",
        description: "This dataset has been added to your profile.",
        icon: "i-heroicons-check-circle",
        color: "success",
      });
    })
    .catch(() => {
      toast.add({
        title: "Failed to claim dataset",
        description: "Could not add this dataset to your profile.",
        icon: "material-symbols:error",
        color: "error",
      });
    })
    .finally(() => {
      loading.value = false;
    });
};

const unclaimDataset = async () => {
  loading.value = true;

  await $fetch("/api/user/datasets/", {
    method: "DELETE",
    body: { datasetId: props.datasetId },
  })
    .then(() => {
      claimed.value = false;
      toast.add({
        title: "Dataset removed",
        description: "This dataset has been removed from your profile.",
        icon: "i-heroicons-check-circle",
        color: "success",
      });
    })
    .catch(() => {
      toast.add({
        title: "Failed to remove dataset",
        description: "Could not remove this dataset from your profile.",
        icon: "material-symbols:error",
        color: "error",
      });
    })
    .finally(() => {
      loading.value = false;
    });
};
</script>

<template>
  <template v-if="loggedIn">
    <UTooltip
      v-if="!claimed"
      text="Add this dataset to your profile"
    >
      <UButton
        color="primary"
        variant="outline"
        :loading="loading"
        :disabled="loading"
        icon="i-heroicons-bookmark-20-solid"
        label="Claim Dataset"
        @click="claimDataset"
      />
    </UTooltip>

    <UPopover v-else arrow>
      <UTooltip text="This dataset is in your profile">
        <UButton
          color="success"
          variant="outline"
          :loading="loading"
          :disabled="loading"
          icon="i-heroicons-bookmark-slash-20-solid"
          label="Claimed"
        />
      </UTooltip>

      <template #content>
        <div class="space-y-3 p-4">
          <p class="text-sm font-medium">
            Remove this dataset from your profile?
          </p>

          <div class="flex justify-end gap-2">
            <UButton color="neutral" variant="ghost" size="sm" label="Cancel" />

            <UButton
              color="error"
              variant="solid"
              size="sm"
              label="Remove"
              icon="i-heroicons-trash-20-solid"
              @click="unclaimDataset"
            />
          </div>
        </div>
      </template>
    </UPopover>
  </template>
</template>

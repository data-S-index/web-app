<script setup lang="ts">
definePageMeta({
  middleware: ["admin"],
});

useSeoMeta({
  title: "Controls",
  robots: "noindex, nofollow",
});

interface AdminControls {
  datasetApiBlocked: boolean;
}

const toast = useToast();

const { data: controls, status } = await useFetch<AdminControls>(
  "/api/admin/controls",
);

const saving = ref(false);

async function setDatasetApiBlocked(blocked: boolean) {
  saving.value = true;

  try {
    controls.value = await $fetch<AdminControls>("/api/admin/controls", {
      method: "PATCH",
      body: { datasetApiBlocked: blocked },
    });

    toast.add({
      title: blocked ? "Dataset API blocked" : "Dataset API unblocked",
      color: blocked ? "warning" : "success",
    });
  } catch (error) {
    console.error(error);
    toast.add({
      title: "Failed to update setting",
      color: "error",
    });
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
    <UContainer>
      <UPage>
        <UPageHeader
          title="Controls"
          description="Temporarily switch off parts of the site to relieve load on the server."
        />

        <UPageBody>
          <UCard>
            <div class="flex items-start justify-between gap-6">
              <div class="flex flex-col gap-1">
                <div class="flex items-center gap-2">
                  <span class="font-semibold">Block dataset API</span>

                  <UBadge
                    v-if="controls?.datasetApiBlocked"
                    color="warning"
                    variant="subtle"
                    label="Blocked"
                  />
                </div>

                <p class="text-sm text-gray-500 dark:text-gray-400">
                  Rejects all requests to <code>/api/dataset/*</code> with a
                  503. Dataset pages will fail to load while this is on. Changes
                  can take up to 5 seconds to apply on every server instance.
                  Only enforced on the published site, not in local dev.
                </p>
              </div>

              <USwitch
                :model-value="controls?.datasetApiBlocked ?? false"
                :loading="saving"
                :disabled="saving || status === 'pending' || !controls"
                @update:model-value="setDatasetApiBlocked"
              />
            </div>
          </UCard>
        </UPageBody>
      </UPage>
    </UContainer>
  </div>
</template>

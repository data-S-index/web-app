<script setup lang="ts">
const router = useRouter();
const toast = useToast();

useSeoMeta({
  title: "Resolve DOI",
  description: "Resolve a DOI to view dataset details",
});

const doiInput = ref("");
const isLoading = ref(false);

const extractDoi = (input: string): string | null => {
  if (!input || !input.trim()) return null;

  let cleanDoi = input.trim();

  // Remove doi.org URLs
  cleanDoi = cleanDoi.replace(/^https?:\/\/(dx\.)?doi\.org\//i, "");

  // Remove doi: prefix
  cleanDoi = cleanDoi.replace(/^doi:/i, "");

  // Trim any remaining whitespace
  cleanDoi = cleanDoi.trim();

  return cleanDoi || null;
};

const handleResolve = async () => {
  const doi = extractDoi(doiInput.value);

  if (!doi) {
    toast.add({
      title: "Invalid DOI",
      description: "Please enter a valid DOI",
      icon: "material-symbols:error",
      color: "error",
    });

    return;
  }

  isLoading.value = true;

  try {
    const result = await $fetch<{ datasetId: number; doi: string }>(
      `/api/resolve/doi?doi=${encodeURIComponent(doi)}`,
    );

    if (result?.datasetId) {
      // Navigate to the dataset page
      await router.push(`/datasets/${result.datasetId}`);
    } else {
      throw new Error("Dataset ID not found in response");
    }
  } catch (error) {
    let errorMessage = "Failed to resolve DOI";
    if (error && typeof error === "object") {
      const err = error as {
        data?: { statusMessage?: string };
        message?: string;
      };
      errorMessage = err.data?.statusMessage || err.message || errorMessage;
    }

    toast.add({
      title: "Error resolving DOI",
      description: errorMessage,
      icon: "material-symbols:error",
      color: "error",
    });
  } finally {
    isLoading.value = false;
  }
};

const handleKeyPress = (event: KeyboardEvent) => {
  if (event.key === "Enter" && !isLoading.value) {
    handleResolve();
  }
};
</script>

<template>
  <UContainer>
    <UPage>
      <UPageHeader>
        <h1 class="text-3xl font-bold text-gray-900 dark:text-gray-100">
          Resolve DOI
        </h1>

        <p class="mt-2 text-gray-600 dark:text-gray-400">
          Enter a DOI to view the corresponding dataset details
        </p>
      </UPageHeader>

      <UPageBody>
        <UCard class="">
          <template #header>
            <h2 class="text-xl font-semibold">Enter DOI</h2>
          </template>

          <div class="space-y-4">
            <div>
              <UInput
                v-model="doiInput"
                placeholder="e.g., 10.1234/example or https://doi.org/10.1234/example"
                size="xl"
                :disabled="isLoading"
                @keypress="handleKeyPress"
              />

              <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">
                You can paste a full DOI URL or just the DOI identifier
              </p>
            </div>

            <UButton
              color="primary"
              size="xl"
              block
              :loading="isLoading"
              @click="handleResolve"
            >
              Resolve DOI
            </UButton>
          </div>
        </UCard>
      </UPageBody>
    </UPage>
  </UContainer>
</template>

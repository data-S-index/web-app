<script setup lang="ts">
const router = useRouter();
const toast = useToast();

useSeoMeta({
  title: "Get Dataset D-index score",
  description: "Get Dataset D-index score by entering a DOI or dataset URL",
});

const hasDoi = ref<boolean | null>(null);
const doiInput = ref("");
const datasetUrl = ref("");
const datasetId = ref("");
const publicationDate = ref("");
const datasetDomain = ref("");

const isLoading = ref(false);

// Common dataset domains
const domainOptions = [
  { label: "Select a domain (optional)", value: "" },
  { label: "Life Sciences", value: "Life Sciences" },
  { label: "Physical Sciences", value: "Physical Sciences" },
  { label: "Social Sciences", value: "Social Sciences" },
  { label: "Earth Sciences", value: "Earth Sciences" },
  { label: "Computer Science", value: "Computer Science" },
  { label: "Mathematics", value: "Mathematics" },
  { label: "Engineering", value: "Engineering" },
  { label: "Medicine", value: "Medicine" },
  { label: "Chemistry", value: "Chemistry" },
  { label: "Physics", value: "Physics" },
  { label: "Biology", value: "Biology" },
  { label: "Astronomy", value: "Astronomy" },
  { label: "Environmental Science", value: "Environmental Science" },
  { label: "Other", value: "Other" },
];

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

const handleSubmit = () => {
  if (hasDoi.value === null) {
    toast.add({
      title: "Please select an option",
      description: "Please indicate whether you have a DOI or not",
      icon: "i-heroicons-exclamation-triangle-20-solid",
      color: "warning",
    });

    return;
  }

  if (hasDoi.value) {
    const doi = extractDoi(doiInput.value);

    if (!doi) {
      toast.add({
        title: "Invalid DOI",
        description: "Please enter a valid DOI",
        icon: "i-heroicons-exclamation-triangle-20-solid",
        color: "error",
      });

      return;
    }

    // Handle DOI resolution
    router.push(`/resolve?doi=${encodeURIComponent(doi)}`);
  } else {
    if (!datasetUrl.value.trim()) {
      toast.add({
        title: "URL required",
        description: "Please enter the dataset URL",
        icon: "i-heroicons-exclamation-triangle-20-solid",
        color: "error",
      });

      return;
    }

    // Handle URL-based resolution
    const params = new URLSearchParams();

    params.append("url", datasetUrl.value);

    if (datasetId.value.trim()) {
      params.append("datasetId", datasetId.value);
    }

    if (publicationDate.value) {
      params.append("publishedAt", publicationDate.value);
    }

    if (datasetDomain.value) {
      params.append("domain", datasetDomain.value);
    }

    router.push(`/resolve?${params.toString()}`);
  }
};
</script>

<template>
  <UContainer>
    <UPage>
      <UPageHeader>
        <h1 class="text-3xl font-bold text-gray-900 dark:text-gray-100">
          Get Dataset D-index score
        </h1>

        <p class="mt-2 text-gray-600 dark:text-gray-400">
          Enter a DOI or dataset URL to view the corresponding dataset details
        </p>
      </UPageHeader>

      <UPageBody>
        <div class="space-y-6">
          <!-- DOI Selection -->
          <div>
            <label
              class="mb-3 block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Do you have a DOI?
            </label>

            <UFieldGroup>
              <UButton
                color="neutral"
                :variant="hasDoi === true ? 'solid' : 'subtle'"
                label="Yes, I have a DOI"
                @click="hasDoi = true"
              />

              <UButton
                color="neutral"
                :variant="hasDoi === false ? 'solid' : 'subtle'"
                label="No, I have a URL"
                @click="hasDoi = false"
              />
            </UFieldGroup>
          </div>

          <UCard v-if="hasDoi !== null">
            <template #header>
              <h2 class="text-xl font-semibold">Dataset Information</h2>
            </template>

            <div class="space-y-6">
              <!-- DOI Input Section -->
              <div v-if="hasDoi === true" class="space-y-4">
                <div>
                  <label
                    for="doi-input"
                    class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    DOI <span class="text-red-500">*</span>
                  </label>

                  <UInput
                    id="doi-input"
                    v-model="doiInput"
                    placeholder="e.g., 10.1234/example or https://doi.org/10.1234/example"
                    size="xl"
                    :disabled="isLoading"
                  />

                  <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    You can paste a full DOI URL or just the DOI identifier
                  </p>
                </div>
              </div>

              <!-- URL-based Input Section -->
              <div v-if="hasDoi === false" class="space-y-4">
                <div>
                  <label
                    for="url-input"
                    class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    Dataset URL <span class="text-red-500">*</span>
                  </label>

                  <UInput
                    id="url-input"
                    v-model="datasetUrl"
                    type="url"
                    placeholder="https://example.com/dataset"
                    size="xl"
                    :disabled="isLoading"
                  />

                  <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    Enter the URL where the dataset can be accessed
                  </p>
                </div>

                <div>
                  <label
                    for="dataset-id-input"
                    class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    Dataset ID (optional)
                  </label>

                  <UInput
                    id="dataset-id-input"
                    v-model="datasetId"
                    placeholder="e.g., DS12345"
                    size="xl"
                    :disabled="isLoading"
                  />
                </div>

                <div>
                  <label
                    for="publication-date-input"
                    class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    Publication Date (optional)
                  </label>

                  <UInput
                    id="publication-date-input"
                    v-model="publicationDate"
                    type="date"
                    size="xl"
                    :disabled="isLoading"
                  />
                </div>

                <div>
                  <label
                    for="domain-select"
                    class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    Dataset Domain (optional)
                  </label>

                  <USelect
                    id="domain-select"
                    v-model="datasetDomain"
                    :options="domainOptions"
                    size="xl"
                    :disabled="isLoading"
                  />
                </div>
              </div>

              <!-- Submit Button -->
              <UButton
                v-if="hasDoi !== null"
                color="primary"
                size="xl"
                block
                :loading="isLoading"
                @click="handleSubmit"
              >
                {{ hasDoi ? "Resolve DOI" : "Resolve Dataset" }}
              </UButton>
            </div>
          </UCard>
        </div>
      </UPageBody>
    </UPage>
  </UContainer>
</template>

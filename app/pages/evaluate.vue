<!-- eslint-disable @typescript-eslint/no-explicit-any -->
<script setup lang="ts">
import { openAlexTopics } from "@/utils/data";

const route = useRoute();
const toast = useToast();

useSeoMeta({
  title: "Evaluate a dataset",
  description: "Enter a DOI or dataset URL to get its Dataset Index.",
});

defineOgImageComponent("Pergel", {
  headline: "Get your Dataset Index",
});

const hasDoi = ref<boolean | null>(null);
const doiInput = ref("");
const datasetUrl = ref("");
const datasetId = ref("");
const publicationDate = ref("");
const datasetDomain = ref("");

const isLoading = ref(false);
const dataset = ref<any>(null);
const error = ref<any>(null);
const isFromCache = ref(false);

// Simple list of tasks happening during loading
const loadingTasks = [
  "Fetching dataset metadata",
  "Collecting citations",
  "Gathering mentions",
  "Evaluating FAIR score",
  "Calculating Dataset Index",
];

// Check for query parameters and fetch data if present
const query = route.query;
const queryDoi = query.doi as string | undefined;
const queryUrl = query.url as string | undefined;

// Transform API response to match dataset structure
const transformApiResponse = (apiData: any) => {
  if (!apiData) return null;

  const metadata = apiData.metadata || {};
  const fair = apiData.fair || {};
  const citations = apiData.citations || [];
  const mentions = apiData.mentions || [];
  const datasetIndexSeries = apiData.dataset_index_series || [];

  // Transform creators to datasetAuthors format
  const datasetAuthors = (metadata.creators || []).map((creator: any) => ({
    name: creator.name || "Unknown Author",
    nameType: "Personal",
    affiliations: creator.affiliations || [],
    nameIdentifiers: creator.identifiers || [],
  }));

  // Transform citations
  const transformedCitations = citations.map((citation: any) => ({
    citationLink: citation.citation_link || citation.citationLink,
    datacite: citation.source?.includes("datacite") || false,
    mdc: citation.source?.includes("mdc") || false,
    openAlex: citation.source?.includes("openalex") || false,
    citedDate: citation.citation_date || citation.citedDate,
    citationWeight: citation.citation_weight || null,
  }));

  // Transform mentions
  const transformedMentions = mentions.map((mention: any) => ({
    mentionLink: mention.mention_link || mention.mentionLink,
    source: mention.source || [],
    mentionedDate: mention.mention_date || mention.mentionDate,
    mentionWeight: mention.mention_weight || null,
  }));

  // Transform dataset_index_series to dindices format
  const dindices = datasetIndexSeries.map((item: any) => ({
    score: item.dataset_index || 0,
    created: item.date || new Date().toISOString(),
  }));

  return {
    title: metadata?.title || "Untitled Dataset",
    description: metadata?.description || "",
    version: metadata?.version || null,
    publisher: metadata?.publisher || null,
    publishedAt: metadata?.publication_date || null,
    identifier:
      apiData.norm_doi ||
      apiData.norm_identifier ||
      metadata?.identifiers?.[0]?.identifier ||
      null,
    url: apiData.norm_url || metadata?.url || null,
    domain: apiData.topic || null,
    subjects: metadata?.subjects || [],
    datasetAuthors,
    citations: transformedCitations,
    mentions: transformedMentions,
    fujiScore:
      fair.fair_score !== undefined
        ? {
            score: fair.fair_score,
            evaluationDate: fair.evaluation_date || null,
            metricVersion: fair.fuji_metric_version || null,
            softwareVersion: fair.fuji_software_version || null,
          }
        : null,
    dindices: dindices.sort(
      (a: any, b: any) =>
        new Date(a.created).getTime() - new Date(b.created).getTime(),
    ),
    normalization_factors: apiData.normalization_factors || null,
  };
};

// Fetch data from external API using DOI
const fetchDatasetData = async (doi: string) => {
  isLoading.value = true;
  error.value = null;

  try {
    const apiUrl = `/api/evaluate/doi?doi=${encodeURIComponent(doi)}`;
    const response = await fetch(apiUrl);

    if (!response.ok) {
      if (response.status === 429) {
        const errorData = await response.json().catch(() => ({}));
        const resetAt = errorData.resetAt
          ? new Date(errorData.resetAt * 1000).toLocaleTimeString()
          : "soon";
        throw new Error(
          `Rate limit exceeded. Please try again after ${resetAt}.`,
        );
      }
      throw new Error(`Failed to fetch dataset: ${response.statusText}`);
    }

    const apiData = await response.json();

    // Check if data is from cache
    isFromCache.value = apiData._cached === true;

    // Remove cache flag before transforming
    const { _cached, ...dataWithoutCache } = apiData;
    dataset.value = transformApiResponse(dataWithoutCache);

    // Show cache notification if data is from cache
    if (isFromCache.value) {
      toast.add({
        title: "Data from cache",
        description:
          "This dataset information was retrieved from cache and may be up to 1 hour old.",
        icon: "material-symbols:info",
        color: "primary",
      });
    }

    useSeoMeta({
      title: dataset.value?.title || "Dataset Details",
      description: dataset.value?.description || "Dataset information",
    });
  } catch (err: any) {
    error.value = err;
    toast.add({
      title: "Error fetching dataset",
      description:
        err.message || "An error occurred while fetching the dataset",
      icon: "material-symbols:error",
      color: "error",
    });
  } finally {
    isLoading.value = false;
  }
};

// Fetch data from external API using URL
const fetchDatasetDataFromUrl = async (
  url: string,
  pubdate?: string,
  topicId?: string,
) => {
  isLoading.value = true;
  error.value = null;

  try {
    const params = new URLSearchParams();
    params.append("url", url);

    if (pubdate) {
      params.append("pubdate", pubdate);
    }

    if (topicId) {
      params.append("topic_id", topicId);
    }

    const apiUrl = `/api/evaluate/url?${params.toString()}`;
    const response = await fetch(apiUrl);

    if (!response.ok) {
      if (response.status === 429) {
        const errorData = await response.json().catch(() => ({}));
        const resetAt = errorData.resetAt
          ? new Date(errorData.resetAt * 1000).toLocaleTimeString()
          : "soon";
        throw new Error(
          `Rate limit exceeded. Please try again after ${resetAt}.`,
        );
      }
      throw new Error(`Failed to fetch dataset: ${response.statusText}`);
    }

    const apiData = await response.json();

    // Check if data is from cache
    isFromCache.value = apiData._cached === true;

    // Remove cache flag before transforming
    const { _cached, ...dataWithoutCache } = apiData;
    dataset.value = transformApiResponse(dataWithoutCache);

    // Show cache notification if data is from cache
    if (isFromCache.value) {
      toast.add({
        title: "Data from cache",
        description:
          "This dataset information was retrieved from cache and may be up to 1 hour old.",
        icon: "material-symbols:info",
        color: "primary",
      });
    }

    useSeoMeta({
      title: dataset.value?.title || "Dataset Details",
      description: dataset.value?.description || "Dataset information",
    });
  } catch (err: any) {
    error.value = err;
    toast.add({
      title: "Error fetching dataset",
      description:
        err.message || "An error occurred while fetching the dataset",
      icon: "material-symbols:error",
      color: "error",
    });
  } finally {
    isLoading.value = false;
  }
};

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

// Check if a URL is a doi.org URL
const isDoiUrl = (url: string): boolean => {
  if (!url || !url.trim()) return false;

  const trimmedUrl = url.trim().toLowerCase();

  return /^https?:\/\/(dx\.)?doi\.org\//i.test(trimmedUrl);
};

// Fetch data if DOI is in query params
if (queryDoi) {
  fetchDatasetData(queryDoi);
}

// Fetch data if URL is in query params
if (queryUrl) {
  // Check if query URL is a doi.org URL
  if (isDoiUrl(queryUrl)) {
    const doi = extractDoi(queryUrl);
    if (doi) {
      fetchDatasetData(doi);
    }
  } else {
    const queryPubdate = query.pubdate as string | undefined;
    const queryTopicId = query.topic_id as string | undefined;
    fetchDatasetDataFromUrl(queryUrl, queryPubdate, queryTopicId);
  }
}

// Watch for doi.org URLs in the URL input field
watch(datasetUrl, (newUrl) => {
  if (newUrl && isDoiUrl(newUrl) && hasDoi.value === false) {
    const doi = extractDoi(newUrl);
    if (doi) {
      // Automatically switch to DOI mode
      hasDoi.value = true;
      doiInput.value = doi;
      datasetUrl.value = "";
      toast.add({
        title: "DOI detected",
        description: "Detected DOI from URL. Switched to DOI mode.",
        icon: "i-heroicons-information-circle-20-solid",
        color: "primary",
      });
    }
  }
});

const handleSubmit = async () => {
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

    // Handle DOI resolution - fetch data and display on same page
    await fetchDatasetData(doi);
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

    // Check if the URL is a doi.org URL
    if (isDoiUrl(datasetUrl.value)) {
      const doi = extractDoi(datasetUrl.value);

      if (doi) {
        // Automatically switch to DOI mode and fetch using DOI
        await fetchDatasetData(doi);

        return;
      }
    }

    // Handle URL-based resolution - fetch data and display on same page
    const topicId = datasetDomain.value
      ? openAlexTopics.find((topic) => topic.label === datasetDomain.value)
          ?.value
      : undefined;

    await fetchDatasetDataFromUrl(
      datasetUrl.value,
      publicationDate.value || undefined,
      topicId,
    );
  }
};
</script>

<template>
  <UContainer>
    <!-- Form Display (always visible) -->
    <UPage>
      <UPageHeader
        v-if="!isLoading && !dataset"
        title="Get Dataset Index"
        description="Enter a DOI or dataset URL to view the corresponding dataset details"
      />

      <UPageBody v-if="!dataset">
        <div v-if="!isLoading && !dataset" class="space-y-6">
          <!-- DOI Selection -->
          <div>
            <label
              class="mb-3 block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Do you have a DOI?
            </label>

            <UFieldGroup :disabled="isLoading">
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

                  <USelectMenu
                    id="domain-select"
                    v-model="datasetDomain"
                    value-key="value"
                    :items="openAlexTopics"
                    size="xl"
                    class="w-full"
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
                :disabled="isLoading"
                @click="handleSubmit"
              >
                {{ hasDoi ? "Evaluate DOI" : "Evaluate Dataset URL" }}
              </UButton>
            </div>
          </UCard>
        </div>

        <UEmpty
          v-if="isLoading"
          icon="svg-spinners:blocks-shuffle-3"
          title="Processing dataset..."
          description="We're gathering and analyzing information about your dataset. This may take up to a minute."
          variant="naked"
        >
          <template #footer>
            <USeparator class="my-4" />

            <ul class="space-y-2">
              <li
                v-for="(task, index) in loadingTasks"
                :key="index"
                class="flex items-center gap-3 text-sm"
              >
                <UIcon
                  name="svg-spinners:ring-resize"
                  class="text-primary-500 h-5 w-5"
                />

                <span class="text-gray-600 dark:text-gray-300">
                  {{ task }}
                </span>
              </li>
            </ul>
          </template>
        </UEmpty>
      </UPageBody>

      <!-- Dataset Display (when data is loaded, shown below form) -->
      <DatasetResponseDisplay
        v-if="dataset && !isLoading"
        :dataset="dataset"
        :is-from-cache="isFromCache"
      />
    </UPage>
  </UContainer>
</template>

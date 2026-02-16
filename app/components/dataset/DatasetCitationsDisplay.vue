<!-- eslint-disable @typescript-eslint/no-explicit-any -->
<script setup lang="ts">
const props = defineProps<{
  citations: Array<{
    citationLink: string;
    datacite: boolean;
    mdc: boolean;
    openAlex: boolean;
    citedDate: string;
    citationWeight: number;
  }>;
}>();

const citationsCount = computed(() => props.citations?.length || 0);

// Sort citations newest first (by citedDate)
const sortedCitations = computed(() => {
  if (!props.citations || props.citations.length === 0) {
    return [];
  }

  return [...props.citations].sort((a, b) => {
    const dateA = a.citedDate ? new Date(a.citedDate).getTime() : 0;
    const dateB = b.citedDate ? new Date(b.citedDate).getTime() : 0;

    return dateB - dateA;
  });
});

// Pagination for citations
const citationsPage = ref(1);
const citationsPerPage = 10;
const paginatedCitations = computed(() => {
  if (
    !sortedCitations.value.length ||
    citationsCount.value <= citationsPerPage
  ) {
    return sortedCitations.value;
  }

  const start = (citationsPage.value - 1) * citationsPerPage;
  const end = start + citationsPerPage;

  return sortedCitations.value.slice(start, end);
});
</script>

<template>
  <CardCollapsibleContent
    :title="`Citations (${citationsCount})`"
    :collapse="citationsCount > 0 ? false : true"
  >
    <ul v-if="citationsCount > 0" class="list-none">
      <li v-for="(citation, index) in paginatedCitations" :key="index">
        <div
          class="mb-2 flex-1 space-y-1 rounded-lg border border-gray-200 p-3 shadow-sm dark:border-gray-700"
        >
          <div class="flex items-start justify-between gap-10">
            <NuxtLink
              :href="citation.citationLink"
              target="_blank"
              rel="noopener noreferrer"
              class="font-mono text-blue-600 hover:underline dark:text-blue-400"
            >
              {{ citation.citationLink }}
            </NuxtLink>

            <div class="flex flex-wrap gap-2">
              <UBadge
                v-if="citation.datacite"
                color="success"
                variant="subtle"
                size="sm"
              >
                DataCite
              </UBadge>

              <UTooltip
                text="This citation was found in the Make Data Count (MDC) database."
              >
                <UBadge
                  v-if="citation.mdc"
                  color="success"
                  variant="subtle"
                  size="sm"
                  class="cursor-help"
                >
                  MDC
                </UBadge>
              </UTooltip>

              <UBadge
                v-if="citation.openAlex"
                color="success"
                variant="subtle"
                size="sm"
              >
                OpenAlex
              </UBadge>
            </div>
          </div>

          <div class="flex items-center justify-between gap-2">
            <p v-if="citation.citedDate" class="text-sm">
              Cited on
              {{ $dayjs(citation.citedDate).format("DD MMMM YYYY") }}
            </p>

            <p
              v-if="citation.citationWeight"
              class="text-xs text-gray-500 dark:text-gray-400"
            >
              Weight: {{ citation.citationWeight.toFixed(2) }}
            </p>
          </div>
        </div>
      </li>
    </ul>

    <UEmpty
      v-else
      title="No citations found"
      description="It looks like this dataset has no citations."
    />

    <div
      v-if="citationsCount > citationsPerPage"
      class="mt-4 flex justify-center"
    >
      <UPagination
        v-model:page="citationsPage"
        :total="citationsCount"
        :items-per-page="citationsPerPage"
      />
    </div>
  </CardCollapsibleContent>
</template>

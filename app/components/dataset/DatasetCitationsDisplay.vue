<!-- eslint-disable @typescript-eslint/no-explicit-any -->
<script setup lang="ts">
const props = defineProps<{
  citations: any[];
}>();

const citationsCount = computed(() => props.citations?.length || 0);

// Pagination for citations
const citationsPage = ref(1);
const citationsPerPage = 10;
const paginatedCitations = computed(() => {
  if (!props.citations || citationsCount.value <= citationsPerPage) {
    return props.citations || [];
  }

  const start = (citationsPage.value - 1) * citationsPerPage;
  const end = start + citationsPerPage;

  return props.citations.slice(start, end);
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
          <NuxtLink
            :href="citation.citationLink"
            target="_blank"
            rel="noopener noreferrer"
            class="font-mono text-blue-600 hover:underline dark:text-blue-400"
          >
            {{ citation.citationLink }}
          </NuxtLink>

          <div class="flex items-center justify-between gap-2">
            <div class="flex flex-col gap-1">
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

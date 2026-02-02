<!-- eslint-disable @typescript-eslint/no-explicit-any -->
<script setup lang="ts">
const props = defineProps<{
  mentions: any[];
}>();

const mentionsCount = computed(() => props.mentions?.length || 0);

// Pagination for mentions
const mentionsPage = ref(1);
const mentionsPerPage = 10;
const paginatedMentions = computed(() => {
  if (!props.mentions || mentionsCount.value <= mentionsPerPage) {
    return props.mentions || [];
  }

  const start = (mentionsPage.value - 1) * mentionsPerPage;
  const end = start + mentionsPerPage;

  return props.mentions.slice(start, end);
});
</script>

<template>
  <CardCollapsibleContent
    :title="`Mentions (${mentionsCount})`"
    :collapse="mentionsCount > 0 ? false : true"
  >
    <ul v-if="mentionsCount > 0" class="list-none">
      <li v-for="(mention, index) in paginatedMentions" :key="index">
        <div
          class="mb-2 flex-1 space-y-1 rounded-lg border border-gray-200 p-3 shadow-sm dark:border-gray-700"
        >
          <div class="flex items-start justify-between gap-10">
            <NuxtLink
              :href="mention.mentionLink"
              target="_blank"
              rel="noopener noreferrer"
              class="font-mono text-blue-600 hover:underline dark:text-blue-400"
            >
              {{ mention.mentionLink }}
            </NuxtLink>

            <div class="flex flex-wrap gap-2">
              <UBadge
                v-for="(source, sourceIndex) in mention.source"
                :key="sourceIndex"
                color="info"
                variant="subtle"
                size="sm"
              >
                {{ source }}
              </UBadge>
            </div>
          </div>

          <div class="flex items-center justify-between gap-2">
            <p v-if="mention.mentionedDate" class="text-sm">
              Mentioned on
              {{ $dayjs(mention.mentionedDate).format("DD MMMM YYYY") }}
            </p>

            <p
              v-if="mention.mentionWeight"
              class="text-xs text-gray-500 dark:text-gray-400"
            >
              Weight: {{ mention.mentionWeight.toFixed(2) }}
            </p>
          </div>
        </div>
      </li>
    </ul>

    <UEmpty
      v-else
      title="No mentions found"
      description="It looks like this dataset has not been mentioned in any sources."
    />

    <div
      v-if="mentionsCount > mentionsPerPage"
      class="mt-4 flex justify-center"
    >
      <UPagination
        v-model:page="mentionsPage"
        :total="mentionsCount"
        :items-per-page="mentionsPerPage"
      />
    </div>
  </CardCollapsibleContent>
</template>

<script setup lang="ts">
defineProps<{
  tips: string[];
  exactMatchExamples?: string[];
  publisherScope?: boolean;
}>();
</script>

<template>
  <div
    class="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/40"
  >
    <ul class="space-y-1.5 text-sm text-gray-600 dark:text-gray-400">
      <li v-for="tip in tips" :key="tip" class="flex items-start gap-2">
        <Icon
          name="i-heroicons-information-circle-20-solid"
          class="text-primary-500 mt-0.5 h-4 w-4 shrink-0"
        />
        {{ tip }}
      </li>

      <li v-if="exactMatchExamples?.length" class="flex items-start gap-2">
        <Icon
          name="i-heroicons-information-circle-20-solid"
          class="text-primary-500 mt-0.5 h-4 w-4 shrink-0"
        />

        <span>
          Wrap a term in quotes for an exact match, e.g.
          <template
            v-for="(example, index) in exactMatchExamples"
            :key="example"
          >
            <code
              class="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs dark:bg-gray-700"
              >"{{ example }}"</code
            >
            <span v-if="index < exactMatchExamples.length - 1"> or </span>
          </template>
        </span>
      </li>

      <li v-if="publisherScope" class="flex items-start gap-2">
        <Icon
          name="i-heroicons-information-circle-20-solid"
          class="text-primary-500 mt-0.5 h-4 w-4 shrink-0"
        />

        <span>
          Prefix with
          <code
            class="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs dark:bg-gray-700"
            >publisher:</code
          >
          to search only the publisher field, e.g.
          <code
            class="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs dark:bg-gray-700"
            >publisher:"Dryad"</code
          >
        </span>
      </li>
    </ul>

    <NuxtLink
      href="https://docs.scholardata.io/using-scholar-data/search-feature"
      target="_blank"
      rel="noopener noreferrer"
      class="hover:text-primary-600 text-primary-500 dark:hover:text-primary-400 mt-3 inline-flex items-center gap-1 text-sm font-medium"
    >
      Learn more about search
      <Icon
        name="i-heroicons-arrow-top-right-on-square-20-solid"
        class="h-3.5 w-3.5"
      />
    </NuxtLink>
  </div>
</template>

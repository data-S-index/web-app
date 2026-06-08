<script setup lang="ts">
defineProps<{
  title?: string;
}>();
</script>

<template>
  <div
    class="rounded-xl border border-gray-200 bg-gray-50 p-5 dark:border-gray-700 dark:bg-gray-800/40"
  >
    <h3
      class="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300"
    >
      <Icon
        name="i-heroicons-magnifying-glass-20-solid"
        class="h-4 w-4 text-gray-500 dark:text-gray-400"
      />
      {{ title ?? "Search tips" }}
    </h3>

    <ul class="space-y-2 text-sm text-gray-600 dark:text-gray-400">
      <li class="flex items-start gap-2">
        <Icon
          name="i-heroicons-check-circle-20-solid"
          class="text-primary-500 mt-0.5 h-4 w-4 shrink-0"
        />
        Search by dataset title, author name, DOI, ORCID, or keywords
      </li>

      <li class="flex items-start gap-2">
        <Icon
          name="i-heroicons-star-20-solid"
          class="mt-0.5 h-4 w-4 shrink-0 text-amber-500"
        />

        <span>
          For exact results, search by <strong>DOI</strong>
          or
          <strong>ORCID</strong>: these are the most reliable identifiers
        </span>
      </li>

      <li class="flex items-start gap-2">
        <Icon
          name="i-heroicons-check-circle-20-solid"
          class="text-primary-500 mt-0.5 h-4 w-4 shrink-0"
        />

        <span>
          Paste a DOI in quotes for an exact match - e.g.
          <code
            class="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs dark:bg-gray-700"
            >"10.5061/dryad.abc123"</code
          >
        </span>
      </li>

      <li class="flex items-start gap-2">
        <Icon
          name="i-heroicons-check-circle-20-solid"
          class="text-primary-500 mt-0.5 h-4 w-4 shrink-0"
        />

        <span>
          Search by ORCID in quotes to find all datasets from a researcher -
          e.g.
          <code
            class="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs dark:bg-gray-700"
            >"0000-0002-1825-0097"</code
          >
        </span>
      </li>

      <li class="flex items-start gap-2">
        <Icon
          name="i-heroicons-check-circle-20-solid"
          class="text-primary-500 mt-0.5 h-4 w-4 shrink-0"
        />
        Use quotes for any exact phrase - e.g.
        <code
          class="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs dark:bg-gray-700"
          >"climate change"</code
        >
      </li>
    </ul>
  </div>
</template>

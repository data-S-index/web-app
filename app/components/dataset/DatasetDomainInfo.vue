<!-- eslint-disable @typescript-eslint/no-explicit-any -->
<script setup lang="ts">
defineProps<{
  domain:
    | {
        subfield_name: string | undefined;
        field_name: string | undefined;
        domain_name: string | undefined;
        score: number | undefined;
        source: string | undefined;
      }
    | null
    | undefined;
}>();
</script>

<template>
  <UCard v-if="domain">
    <template #header>
      <div class="flex items-center gap-2">
        <h3 class="text-lg font-semibold">Assigned Domain</h3>

        <NuxtLink
          href="https://docs.scholardata.io/data-collection/research-fields"
          target="_blank"
          rel="noopener noreferrer"
          class="hover:text-primary-500 flex items-center gap-1 text-gray-400 dark:text-gray-400 dark:hover:text-gray-300"
        >
          <UIcon
            name="i-heroicons-information-circle-20-solid"
            class="h-4 w-4"
          />
        </NuxtLink>
      </div>
    </template>

    <div class="space-y-3">
      <div v-if="domain?.subfield_name">
        <p class="mb-1 text-sm font-medium">Subfield</p>

        <p class="text-sm text-gray-700 dark:text-gray-300">
          {{ domain?.subfield_name }}
        </p>
      </div>

      <div v-if="domain?.field_name">
        <p class="mb-1 text-sm font-medium">Field</p>

        <p class="text-sm text-gray-700 dark:text-gray-300">
          {{ domain?.field_name }}
        </p>
      </div>

      <div v-if="domain?.domain_name">
        <p class="mb-1 text-sm font-medium">Domain</p>

        <p class="text-sm text-gray-700 dark:text-gray-300">
          {{ domain?.domain_name }}
        </p>
      </div>

      <div v-if="domain?.score !== undefined">
        <p class="mb-1 text-sm font-medium">Confidence Score</p>

        <p class="text-sm text-gray-700 dark:text-gray-300">
          {{ Math.round((domain?.score ?? 0) * 100) }}%
        </p>
      </div>

      <div v-if="domain?.source">
        <p class="mb-1 text-sm font-medium">Source</p>

        <div class="flex items-center gap-2">
          <p
            v-if="domain?.source === 'openalex'"
            class="text-sm text-gray-700 dark:text-gray-300"
          >
            Open Alex
          </p>

          <p
            v-if="domain?.source === 'custom_model'"
            class="text-sm text-gray-700 dark:text-gray-300"
          >
            Scholar Data Model
          </p>

        </div>
      </div>
    </div>
  </UCard>
</template>

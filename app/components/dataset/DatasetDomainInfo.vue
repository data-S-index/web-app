<!-- eslint-disable @typescript-eslint/no-explicit-any -->
<script setup lang="ts">
defineProps<{
  domain:
    | {
        topic_name: string | undefined;
        subfield_name: string | undefined;
        field_name: string | undefined;
        domain_name: string | undefined;
      }
    | null
    | undefined;
}>();
</script>

<template>
  <UCard v-if="domain">
    <template #header>
      <h3 class="text-lg font-semibold">Assigned Domain</h3>
    </template>

    <div class="space-y-3">
      <div v-if="domain?.topic_name">
        <p class="mb-1 text-sm font-medium">Topic Name</p>

        <p class="text-sm text-gray-700 dark:text-gray-300">
          {{ domain?.topic_name }}
        </p>
      </div>

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
    </div>
  </UCard>
</template>

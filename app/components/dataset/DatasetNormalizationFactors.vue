<!-- eslint-disable @typescript-eslint/no-explicit-any -->
<script setup lang="ts">
const props = defineProps<{
  normalizationFactors: any;
}>();
</script>

<template>
  <UCard v-if="normalizationFactors">
    <template #header>
      <div class="flex items-center gap-2">
        <h3 class="text-lg font-semibold">Normalization Factors</h3>

        <UTooltip
          text="These factors are used to normalize citation and mention weights across different time periods and topics for fair comparison."
        >
          <UIcon
            name="i-heroicons-information-circle-20-solid"
            class="h-4 w-4 cursor-help text-gray-400"
          />
        </UTooltip>
      </div>
    </template>

    <div class="space-y-4">
      <div class="grid grid-cols-3 gap-6">
        <div class="flex flex-col items-center text-center">
          <p class="mb-2 text-sm font-medium">FT</p>

          <div
            class="text-primary-600 dark:text-primary-400 text-2xl font-bold"
          >
            {{ normalizationFactors.FT?.toFixed(2) || "N/A" }}
          </div>
        </div>

        <div class="flex flex-col items-center text-center">
          <p class="mb-2 text-sm font-medium">CTw</p>

          <div
            class="text-primary-600 dark:text-primary-400 text-2xl font-bold"
          >
            {{ normalizationFactors.CTw?.toFixed(2) || "N/A" }}
          </div>
        </div>

        <div class="flex flex-col items-center text-center">
          <p class="mb-2 text-sm font-medium">MTw</p>

          <div
            class="text-primary-600 dark:text-primary-400 text-2xl font-bold"
          >
            {{ normalizationFactors.MTw?.toFixed(2) || "N/A" }}
          </div>
        </div>
      </div>

      <div class="space-y-2 border-t border-gray-200 pt-3 dark:border-gray-700">
        <div class="flex items-center justify-between text-sm">
          <span class="text-gray-500 dark:text-gray-400">Topic Used</span>

          <span class="text-sm font-medium text-gray-900 dark:text-gray-100">
            {{ normalizationFactors.topic_id_used || "N/A" }}
          </span>
        </div>

        <div class="flex items-center justify-between text-sm">
          <span class="text-gray-500 dark:text-gray-400">Year Used</span>

          <span class="text-sm font-medium text-gray-900 dark:text-gray-100">
            {{ normalizationFactors.year_used || "N/A" }}
          </span>
        </div>

        <div
          v-if="normalizationFactors.year_requested"
          class="flex items-center justify-between text-sm"
        >
          <span class="text-gray-500 dark:text-gray-400"> Year Requested </span>

          <span class="text-sm font-medium text-gray-900 dark:text-gray-100">
            {{ normalizationFactors.year_requested }}
          </span>
        </div>

        <div
          v-if="normalizationFactors.used_year_clamp !== undefined"
          class="flex items-center justify-between text-sm"
        >
          <span class="text-gray-500 dark:text-gray-400"> Year Clamp </span>

          <UBadge
            :color="
              normalizationFactors.used_year_clamp ? 'warning' : 'success'
            "
            variant="subtle"
          >
            {{
              normalizationFactors.used_year_clamp ? "Applied" : "Not Applied"
            }}
          </UBadge>
        </div>
      </div>
    </div>
  </UCard>
</template>

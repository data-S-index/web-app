<!-- eslint-disable @typescript-eslint/no-explicit-any -->
<script setup lang="ts">
const props = defineProps<{
  /** Either { FT, CTw, MTw, n_year_gap, method } or { ft, ctw, mtw, topicIdUsed, yearUsed, ... } */
  normalizationFactors: any;
}>();

function num(key: string, altKey?: string) {
  const v =
    props.normalizationFactors?.[key] ??
    (altKey && props.normalizationFactors?.[altKey]);

  return typeof v === "number" ? v.toFixed(2) : "N/A";
}
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
            {{ num("FT", "ft") }}
          </div>
        </div>

        <div class="flex flex-col items-center text-center">
          <p class="mb-2 text-sm font-medium">CTw</p>

          <div
            class="text-primary-600 dark:text-primary-400 text-2xl font-bold"
          >
            {{ num("CTw", "ctw") }}
          </div>
        </div>

        <div class="flex flex-col items-center text-center">
          <p class="mb-2 text-sm font-medium">MTw</p>

          <div
            class="text-primary-600 dark:text-primary-400 text-2xl font-bold"
          >
            {{ num("MTw", "mtw") }}
          </div>
        </div>
      </div>
    </div>
  </UCard>
</template>

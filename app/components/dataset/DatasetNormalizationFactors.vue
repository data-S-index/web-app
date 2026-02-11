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

function str(key: string, altKey?: string) {
  const v =
    props.normalizationFactors?.[key] ??
    (altKey && props.normalizationFactors?.[altKey]);

  return v != null ? String(v) : "N/A";
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

      <div class="space-y-2 border-t border-gray-200 pt-3 dark:border-gray-700">
        <div
          v-if="normalizationFactors.method != null"
          class="flex items-center justify-between text-sm"
        >
          <span class="text-gray-500 dark:text-gray-400">Method</span>

          <span class="text-sm font-medium text-gray-900 dark:text-gray-100">
            {{ normalizationFactors.method }}
          </span>
        </div>

        <div
          v-if="normalizationFactors.n_year_gap !== undefined"
          class="flex items-center justify-between text-sm"
        >
          <span class="text-gray-500 dark:text-gray-400">Year gap</span>

          <span class="text-sm font-medium text-gray-900 dark:text-gray-100">
            {{ normalizationFactors.n_year_gap }}
          </span>
        </div>

        <div class="flex items-center justify-between text-sm">
          <span class="text-gray-500 dark:text-gray-400">Topic Used</span>

          <span class="text-sm font-medium text-gray-900 dark:text-gray-100">
            {{ str("topicIdUsed", "topic_id_used") }}
          </span>
        </div>

        <div class="flex items-center justify-between text-sm">
          <span class="text-gray-500 dark:text-gray-400">Year Used</span>

          <span class="text-sm font-medium text-gray-900 dark:text-gray-100">
            {{ str("yearUsed", "year_used") }}
          </span>
        </div>

        <div
          v-if="
            normalizationFactors.yearRequested != null ||
            normalizationFactors.year_requested != null
          "
          class="flex items-center justify-between text-sm"
        >
          <span class="text-gray-500 dark:text-gray-400">Year Requested</span>

          <span class="text-sm font-medium text-gray-900 dark:text-gray-100">
            {{ str("yearRequested", "year_requested") }}
          </span>
        </div>

        <div
          v-if="
            normalizationFactors.usedYearClamp !== undefined ||
            normalizationFactors.used_year_clamp !== undefined
          "
          class="flex items-center justify-between text-sm"
        >
          <span class="text-gray-500 dark:text-gray-400">Year Clamp</span>

          <UBadge
            :color="
              (normalizationFactors.usedYearClamp ??
              normalizationFactors.used_year_clamp)
                ? 'warning'
                : 'success'
            "
            variant="subtle"
          >
            {{
              (normalizationFactors.usedYearClamp ??
              normalizationFactors.used_year_clamp)
                ? "Applied"
                : "Not Applied"
            }}
          </UBadge>
        </div>
      </div>
    </div>
  </UCard>
</template>

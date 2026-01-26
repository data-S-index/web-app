<script setup lang="ts">
defineProps<{
  sindex: number;
  datasetCount: number;
}>();
</script>

<template>
  <UCard class="mb-6">
    <template #header>
      <h3 class="text-lg font-semibold">S-Index Interpretation</h3>
    </template>

    <div class="space-y-3 text-sm text-gray-700 dark:text-gray-300">
      <p>
        The <strong>S-Index</strong> (Scholar Index) is a comprehensive metric
        that represents the cumulative impact of all your datasets. It is
        calculated as the sum of D-Index scores across all your claimed
        datasets.
      </p>

      <p>
        <strong>What it means:</strong>
      </p>

      <ul class="ml-6 list-disc space-y-1">
        <li>
          A higher S-Index indicates greater overall impact across your dataset
          portfolio
        </li>

        <li>
          The S-Index grows as you add more datasets or as existing datasets
          gain more citations and improve their FAIR scores
        </li>

        <li>
          It provides a single number to track your research data impact over
          time
        </li>
      </ul>

      <p>
        <strong>Current S-Index:</strong> {{ Math.round(sindex) }} (sum of
        {{ datasetCount }} dataset{{ datasetCount !== 1 ? "s" : "" }}
        D-Index scores)
      </p>
    </div>
  </UCard>
</template>

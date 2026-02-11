<script setup lang="ts">
defineProps<{
  sindex: number;
  datasetCount: number;
}>();
</script>

<template>
  <CardCollapsibleContent title="S-Index Interpretation" class="mb-6" collapse>
    <div class="space-y-3 text-sm text-gray-700 dark:text-gray-300">
      <p>
        The <strong>S-Index</strong> (Sharing Index) is a comprehensive metric
        that represents the cumulative impact of all your datasets. It is
        calculated as the sum of D-Index scores across all your claimed
        datasets.
      </p>

      <p>
        <strong>What it means:</strong>
      </p>

      <ul class="ml-6 list-disc space-y-1">
        <li>
          A higher S-index indicates greater overall impact of your datasets
          relative to typical datasets in their fields of research
        </li>

        <li>
          The S-Index grows as you add more datasets or as existing datasets
          gain more citations and mentions
        </li>

        <li>
          It provides a single number to track your research data impact over
          time
        </li>
      </ul>

      <p>
        <strong>Current S-Index:</strong> {{ sindex.toFixed(1) }} (sum of
        {{ datasetCount }} dataset{{ datasetCount !== 1 ? "s" : "" }}
        D-Index scores)
      </p>

      <p>
        More information
        <NuxtLink
          to="https://github.com/data-S-index/resources"
          class="text-primary hover:text-primary-600 transition-all"
          >here</NuxtLink
        >.
      </p>
    </div>
  </CardCollapsibleContent>
</template>

<!-- eslint-disable @typescript-eslint/no-explicit-any -->
<script setup lang="ts">
defineProps<{
  dataset: any;
}>();

const tabItems = [
  {
    label: "Dataset Index",
    icon: "tabler:circle-dotted-letter-d",
    slot: "d-index",
  },
  {
    label: "Citations ",
    icon: "flowbite:quote-solid",
    slot: "citations",
  },
  {
    label: "Mentions",
    icon: "ci:mention",
    slot: "mentions",
  },
];
</script>

<template>
  <UTabs :items="tabItems" color="primary">
    <template #d-index>
      <UCard v-if="dataset.dindices && dataset.dindices.length > 0">
        <DatasetDIndexPlot
          :dindices="dataset.dindices"
          :published-at="dataset.publishedAt"
        />
      </UCard>
    </template>

    <template #citations>
      <UCard v-if="dataset.citations && dataset.citations.length > 0">
        <DatasetCitationsCumulativePlot
          :citations="dataset.citations"
          :published-at="dataset.publishedAt"
        />
      </UCard>
    </template>

    <template #mentions>
      <!-- Cumulative Mentions Plot -->
      <UCard v-if="dataset.mentions && dataset.mentions.length > 0">
        <DatasetMentionsCumulativePlot
          :mentions="dataset.mentions"
          :published-at="dataset.publishedAt"
        />
      </UCard>
    </template>
  </UTabs>
</template>

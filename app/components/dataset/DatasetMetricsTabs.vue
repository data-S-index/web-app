<!-- eslint-disable @typescript-eslint/no-explicit-any -->
<script setup lang="ts">
defineProps<{
  dataset: any;
}>();

const tabItems = [
  {
    label: "Dataset Index",

    slot: "d-index",
  },
  {
    label: "Citations ",

    slot: "citations",
  },
  {
    label: "Mentions",

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

      <div v-else class="flex h-full items-center justify-center">
        <UAlert
          title="No citation data available for this dataset"
          description="Citations will appear as we identify them in our search pipelines."
          color="warning"
          variant="subtle"
        />
      </div>
    </template>

    <template #mentions>
      <!-- Cumulative Mentions Plot -->
      <UCard v-if="dataset.mentions && dataset.mentions.length > 0">
        <DatasetMentionsCumulativePlot
          :mentions="dataset.mentions"
          :published-at="dataset.publishedAt"
        />
      </UCard>

      <div v-else class="flex h-full items-center justify-center">
        <UAlert
          title="No mention data available for this dataset"
          description="Mentions will appear as we identify them in our search pipelines."
          color="warning"
          variant="subtle"
        />
      </div>
    </template>
  </UTabs>
</template>

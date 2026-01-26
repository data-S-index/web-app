<script setup lang="ts">
defineProps<{
  sindex: number;
  datasetCount: number;
  sindexOverTime: {
    dates: string[];
    scores: number[];
    earliestDate: Date | null;
    endDate: Date | null;
  };
  cumulativeCitations: {
    dates: string[];
    rawValues: number[];
    weightedValues: number[];
    earliestDate: Date | null;
    endDate: Date | null;
  };
  cumulativeMentions: {
    dates: string[];
    rawValues: number[];
    weightedValues: number[];
    earliestDate: Date | null;
    endDate: Date | null;
  };
}>();
</script>

<template>
  <UCollapsible class="mb-6 flex flex-col gap-2">
    <UButton
      label="Metrics and Trends Over Time"
      color="neutral"
      variant="subtle"
      trailing-icon="i-lucide-chevron-down"
      class="group"
      block
    />

    <template #content>
      <div class="space-y-6 px-1 pt-4">
        <UserSIndexInterpretation
          :sindex="sindex"
          :dataset-count="datasetCount"
        />

        <UserSIndexPlot :sindex-over-time="sindexOverTime" />

        <UserCumulativeCitationsPlot
          :cumulative-citations="cumulativeCitations"
        />

        <UserCumulativeMentionsPlot :cumulative-mentions="cumulativeMentions" />
      </div>
    </template>
  </UCollapsible>
</template>

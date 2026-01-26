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
  <div class="flex flex-col gap-2">
    <UserSIndexInterpretation :sindex="sindex" :dataset-count="datasetCount" />

    <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <UserSIndexPlot :sindex-over-time="sindexOverTime" />

      <UserCumulativeCitationsPlot
        :cumulative-citations="cumulativeCitations"
      />

      <UserCumulativeMentionsPlot :cumulative-mentions="cumulativeMentions" />
    </div>
  </div>
</template>

<script setup lang="ts">
import UserSIndexInterpretation from "~/components/user/UserSIndexInterpretation.vue";
import UserSIndexPlot from "~/components/user/UserSIndexPlot.vue";
import UserCumulativeCitationsPlot from "~/components/user/UserCumulativeCitationsPlot.vue";
import UserCumulativeMentionsPlot from "~/components/user/UserCumulativeMentionsPlot.vue";

defineProps<{
  sindex: number;
  datasetCount: number;
  totalCitations: number;
  totalMentions: number;
  averageFairScore: number;
  showRanking?: boolean;
  sindexOverTime: {
    years: number[];
    scores: number[];
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
    <UserSIndexInterpretation
      :sindex="sindex"
      :dataset-count="datasetCount"
      :total-citations="totalCitations"
      :total-mentions="totalMentions"
      :average-fair-score="averageFairScore"
      :show-ranking="showRanking"
    />

    <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <UserSIndexPlot :sindex-over-time="sindexOverTime" />

      <UserCumulativeCitationsPlot
        :cumulative-citations="cumulativeCitations"
      />

      <UserCumulativeMentionsPlot :cumulative-mentions="cumulativeMentions" />
    </div>
  </div>
</template>

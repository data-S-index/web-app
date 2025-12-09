<script setup lang="ts">
// Fetch fuji score percentage (client-side only)
const { data: fujiScoreData, status: fujiScoreStatus } = await useFetch<{
  percentage: number;
  totalDatasets: number;
  datasetsWithFujiScore: number;
  jobsDoneLast10Minutes: number;
}>("/api/datasets/fuji-score-percentage", {
  server: false,
});

// Calculate dots to fill visible space
const containerRef = ref<HTMLElement | null>(null);
const dotsPerRow = ref(0);
const dotsPerCol = ref(0);
const filledDotsCount = ref(0);

const calculateDots = () => {
  if (!containerRef.value) return;

  const container = containerRef.value;
  const containerWidth = container.clientWidth;
  const containerHeight = container.clientHeight;

  // Calculate how many 1px dots can fit (with 1px spacing between them)
  const dotSize = 1;
  const spacing = 1;
  const totalSize = dotSize + spacing; // 2px per dot (1px dot + 1px spacing)

  dotsPerRow.value = Math.floor(containerWidth / totalSize);
  dotsPerCol.value = Math.floor(containerHeight / totalSize);
  const totalDots = dotsPerRow.value * dotsPerCol.value;

  // Calculate how many dots should be filled based on percentage
  const percentage = fujiScoreData.value?.percentage || 0;
  filledDotsCount.value = Math.floor((totalDots * percentage) / 100);
};

// Recalculate on mount and window resize
onMounted(() => {
  nextTick(() => {
    calculateDots();
    window.addEventListener("resize", calculateDots);
  });
});

onUnmounted(() => {
  window.removeEventListener("resize", calculateDots);
});

// Recalculate when data changes
watch(
  () => fujiScoreData.value?.percentage,
  () => {
    nextTick(() => {
      calculateDots();
    });
  },
);
</script>

<template>
  <div
    class="relative h-[calc(100vh-var(--ui-header-height))] w-full overflow-hidden"
  >
    <div
      ref="containerRef"
      class="absolute inset-0 grid gap-[1px] p-0"
      :style="{
        gridTemplateColumns:
          dotsPerRow > 0 ? `repeat(${dotsPerRow}, 1px)` : 'none',
        gridTemplateRows:
          dotsPerCol > 0 ? `repeat(${dotsPerCol}, 1px)` : 'none',
      }"
    >
      <template v-if="dotsPerRow > 0 && dotsPerCol > 0">
        <div
          v-for="index in dotsPerRow * dotsPerCol"
          :key="index"
          class="h-[1px] w-[1px]"
          :class="
            index <= filledDotsCount
              ? 'bg-primary-500 dark:bg-primary-400'
              : 'bg-gray-300 dark:bg-gray-700'
          "
        />
      </template>
    </div>

    <!-- Overlay with stats -->
    <div class="absolute inset-0 z-10 flex items-center justify-center">
      <div
        class="rounded-lg bg-white/90 p-8 text-center shadow-lg dark:bg-gray-900/90"
      >
        <h1 class="mb-4 text-4xl font-bold">Fuji Score Progress</h1>

        <div v-if="fujiScoreStatus === 'pending'" class="text-gray-500">
          Loading...
        </div>

        <div v-else-if="fujiScoreData" class="space-y-2">
          <div class="text-primary-500 text-6xl font-bold">
            {{ fujiScoreData.percentage.toFixed(6) }}%
          </div>

          <div class="text-sm text-gray-600 dark:text-gray-400">
            {{ fujiScoreData.datasetsWithFujiScore.toLocaleString() }} of
            {{ fujiScoreData.totalDatasets.toLocaleString() }} datasets
          </div>

          <div class="text-xs text-gray-500 dark:text-gray-500">
            {{ fujiScoreData.jobsDoneLast10Minutes }} jobs done in the last 10
            minutes
          </div>
        </div>

        <div v-else class="text-red-500">:)</div>
      </div>
    </div>
  </div>
</template>

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

// Canvas ref and drawing state
const canvasRef = ref<HTMLCanvasElement | null>(null);
const containerRef = ref<HTMLElement | null>(null);

const drawDots = () => {
  if (!canvasRef.value || !containerRef.value) return;

  const canvas = canvasRef.value;
  const container = containerRef.value;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // Set canvas size to match container
  const containerWidth = container.clientWidth;
  const containerHeight = container.clientHeight;
  canvas.width = containerWidth;
  canvas.height = containerHeight;

  // Clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Calculate how many 1px dots can fit (with 1px spacing between them)
  const dotSize = 1;
  const spacing = 1;
  const totalSize = dotSize + spacing; // 2px per dot (1px dot + 1px spacing)

  const dotsPerRow = Math.floor(containerWidth / totalSize);
  const dotsPerCol = Math.floor(containerHeight / totalSize);
  const totalDots = dotsPerRow * dotsPerCol;

  // Calculate how many dots should be filled based on percentage
  const percentage = fujiScoreData.value?.percentage || 0;
  const filledDotsCount = Math.floor((totalDots * percentage) / 100);

  // Get theme colors (you may need to adjust these based on your theme)
  const isDark = document.documentElement.classList.contains("dark");
  const filledColor = isDark ? "#60a5fa" : "#3b82f6"; // primary-400 or primary-500
  const emptyColor = isDark ? "#374151" : "#d1d5db"; // gray-700 or gray-300

  // Draw dots
  let dotIndex = 0;
  for (let row = 0; row < dotsPerCol; row++) {
    for (let col = 0; col < dotsPerRow; col++) {
      dotIndex++;
      const x = col * totalSize;
      const y = row * totalSize;

      ctx.fillStyle = dotIndex <= filledDotsCount ? filledColor : emptyColor;
      ctx.fillRect(x, y, dotSize, dotSize);
    }
  }
};

// Draw on mount and window resize
onMounted(() => {
  nextTick(() => {
    drawDots();
    window.addEventListener("resize", drawDots);
  });
});

onUnmounted(() => {
  window.removeEventListener("resize", drawDots);
});

// Redraw when data changes
watch(
  () => fujiScoreData.value?.percentage,
  () => {
    nextTick(() => {
      drawDots();
    });
  },
);
</script>

<template>
  <div
    ref="containerRef"
    class="relative h-[calc(100vh-var(--ui-header-height))] w-full overflow-hidden"
  >
    <canvas ref="canvasRef" class="absolute inset-0" />

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

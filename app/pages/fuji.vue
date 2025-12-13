<script setup lang="ts">
// Fetch fuji score percentage (client-side only)
const {
  data: fujiScoreData,
  status: fujiScoreStatus,
  refresh: refreshFujiScore,
} = await useFetch<{
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

  // Create array of all dot positions
  const dotPositions: Array<{ x: number; y: number }> = [];
  for (let row = 0; row < dotsPerCol; row++) {
    for (let col = 0; col < dotsPerRow; col++) {
      dotPositions.push({
        x: col * totalSize,
        y: row * totalSize,
      });
    }
  }

  // Shuffle array randomly (Fisher-Yates shuffle)
  for (let i = dotPositions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = dotPositions[i]!;
    dotPositions[i] = dotPositions[j]!;
    dotPositions[j] = temp;
  }

  // Create a Set of filled positions for quick lookup
  const filledPositions = new Set<string>();
  for (let i = 0; i < filledDotsCount; i++) {
    const pos = dotPositions[i];
    if (pos) {
      filledPositions.add(`${pos.x},${pos.y}`);
    }
  }

  // Draw dots
  for (let row = 0; row < dotsPerCol; row++) {
    for (let col = 0; col < dotsPerRow; col++) {
      const x = col * totalSize;
      const y = row * totalSize;
      const isFilled = filledPositions.has(`${x},${y}`);

      ctx.fillStyle = isFilled ? filledColor : emptyColor;
      ctx.fillRect(x, y, dotSize, dotSize);
    }
  }
};

// Draw on mount and window resize
let refreshInterval: ReturnType<typeof setInterval> | null = null;

onMounted(() => {
  nextTick(() => {
    drawDots();
    window.addEventListener("resize", drawDots);
  });

  // Refresh data every 7 seconds instead of reloading the page
  refreshInterval = setInterval(() => {
    refreshFujiScore();
  }, 7000);
});

onUnmounted(() => {
  window.removeEventListener("resize", drawDots);
  if (refreshInterval) {
    clearInterval(refreshInterval);
  }
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

        <div v-if="fujiScoreData" class="space-y-2">
          <div class="text-primary-500 text-6xl font-bold">
            <UiNumberTicker
              :value="fujiScoreData.percentage"
              :decimal-places="7"
            />%
          </div>

          <div class="text-sm text-gray-600 dark:text-gray-400">
            <UiNumberTicker
              :value="fujiScoreData.datasetsWithFujiScore"
              :decimal-places="0"
            />
            of {{ fujiScoreData.totalDatasets.toLocaleString() }} datasets
          </div>

          <div class="text-xs text-gray-500 dark:text-gray-500">
            <UiNumberTicker
              :value="fujiScoreData.jobsDoneLast10Minutes"
              :decimal-places="0"
            />
            jobs done in the last 10 minutes
          </div>
        </div>

        <div
          :class="{
            'text-red-500':
              fujiScoreStatus !== 'success' && fujiScoreStatus !== 'pending',
            'text-gray-500': fujiScoreStatus === 'pending',
            'opacity-0': fujiScoreStatus === 'success',
            'opacity-100':
              fujiScoreStatus !== 'success' && fujiScoreStatus !== 'pending',
            'opacity-90': fujiScoreStatus === 'pending',
          }"
        >
          <Icon name="svg-spinners:3-dots-fade" class="h-10 w-10" />
        </div>
      </div>
    </div>
  </div>
</template>

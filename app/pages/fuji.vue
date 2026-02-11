<script setup lang="ts">
useSeoMeta({
  title: "Fuji Score",
  description:
    "FAIR assessment and machine stats for datasets on Scholar Data.",
});

defineOgImageComponent("Pergel", {
  headline: "Fuji Score",
});

// Fetch fuji score percentage and machine stats (client-side only)
const {
  data: fujiScoreData,
  status: fujiScoreStatus,
  refresh: refreshFujiScore,
} = await useFetch<{
  percentage: number;
  totalDatasets: number;
  datasetsWithFujiScore: number;
  jobsDoneLast10Minutes: number;
  jobsCount: number;
  machineStats?: {
    timeWindow: string;
    totalMachines: number;
    stats: Array<{
      machineName: string;
      totalRequests: number;
      totalResults: number;
    }>;
  };
  // When machineName query param is provided
  machineName?: string;
  totalRequests?: number;
  totalResults?: number;
  requests?: Array<{
    count: number;
  }>;
}>("/api/datasets/fuji-score-percentage", {
  server: false,
});

// Canvas ref and drawing state
const canvasRef = ref<HTMLCanvasElement | null>(null);
const containerRef = ref<HTMLElement | null>(null);

interface DotInfo {
  x: number;
  y: number;
  isFilled: boolean;
  fillIndex: number; // Index used for deterministic filling order
}

let dotInfos: DotInfo[] = [];
let containerDimensions: { width: number; height: number } | null = null;

// Simple seeded random function for deterministic randomness
const seededRandom = (seed: number) => {
  const x = Math.sin(seed) * 10000;

  return x - Math.floor(x);
};

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
  const dotSize = 3;
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
  const backgroundColor = isDark ? "#374151" : "#d1d5db"; // gray-700 or gray-300 - base color for all dots
  const primaryColor = isDark ? "#60a5fa" : "#3b82f6"; // primary-400 or primary-500 - color for filled dots

  // Check if we need to recalculate dot positions (container size changed)
  const dimensionsChanged =
    !containerDimensions ||
    containerDimensions.width !== containerWidth ||
    containerDimensions.height !== containerHeight;

  if (dimensionsChanged) {
    containerDimensions = { width: containerWidth, height: containerHeight };

    // Create array of all dot positions in grid order
    const dotPositions: Array<{ x: number; y: number; index: number }> = [];
    for (let row = 0; row < dotsPerCol; row++) {
      for (let col = 0; col < dotsPerRow; col++) {
        dotPositions.push({
          x: col * totalSize,
          y: row * totalSize,
          index: row * dotsPerRow + col,
        });
      }
    }

    // Shuffle once using seeded random for deterministic but random-looking order
    // Use a fixed seed based on grid dimensions for consistency
    const seed = dotsPerRow * 1000 + dotsPerCol;
    for (let i = dotPositions.length - 1; i > 0; i--) {
      const j = Math.floor(seededRandom(seed + i) * (i + 1));
      const temp = dotPositions[i]!;
      dotPositions[i] = dotPositions[j]!;
      dotPositions[j] = temp;
    }

    // Initialize dot infos with static positions
    dotInfos = dotPositions.map((pos, shuffledIndex) => ({
      x: pos.x,
      y: pos.y,
      isFilled: false, // Will be updated based on percentage
      fillIndex: shuffledIndex, // Used to determine which dots are filled
    }));
  }

  // Update which dots are filled based on current percentage
  // Dots with lower fillIndex are filled first
  dotInfos = dotInfos.map((dot) => ({
    ...dot,
    isFilled: dot.fillIndex < filledDotsCount,
  }));

  // Draw dots immediately in their final state
  for (const dot of dotInfos) {
    if (dot.isFilled) {
      ctx.fillStyle = primaryColor;
    } else {
      ctx.fillStyle = backgroundColor;
    }
    ctx.fillRect(dot.x, dot.y, dotSize, dotSize);
  }
};

// Draw on mount and window resize
let isRefreshing = false;
let shouldContinueRefreshing = true;

const handleResize = () => {
  // Reset positions on resize (dimensions changed)
  containerDimensions = null;
  dotInfos = [];
  drawDots();
};

const scheduleNextRefresh = async () => {
  if (!shouldContinueRefreshing || isRefreshing) return;

  isRefreshing = true;
  try {
    await refreshFujiScore();
  } finally {
    isRefreshing = false;
    // Schedule next refresh after current one completes
    if (shouldContinueRefreshing) {
      scheduleNextRefresh();
    }
  }
};

onMounted(() => {
  nextTick(() => {
    drawDots();
    window.addEventListener("resize", handleResize);
  });

  // Start sequential refresh: when one request returns, submit the next one
  scheduleNextRefresh();
});

onUnmounted(() => {
  window.removeEventListener("resize", handleResize);
  shouldContinueRefreshing = false;
});

// Redraw when data changes - update grid immediately without animation
watch(
  () => fujiScoreData.value?.percentage,
  () => {
    nextTick(() => {
      drawDots();
    });
  },
);

// Calculate ETA based on jobsDoneLast10Minutes
const etaMinutes = computed(() => {
  if (!fujiScoreData.value) return null;

  const { totalDatasets, datasetsWithFujiScore, jobsDoneLast10Minutes } =
    fujiScoreData.value;
  const remainingDatasets = totalDatasets - datasetsWithFujiScore;

  // If no jobs done in last 10 minutes, can't calculate ETA
  if (jobsDoneLast10Minutes === 0 || remainingDatasets <= 0) return null;

  // Calculate rate: jobs per minute
  const jobsPerMinute = jobsDoneLast10Minutes / 10;

  // Calculate ETA in minutes
  return remainingDatasets / jobsPerMinute;
});

// Format ETA nicely
const formattedEta = computed(() => {
  const minutes = etaMinutes.value;
  if (minutes === null || minutes === undefined) return null;

  if (minutes < 60) {
    return `${Math.round(minutes)} minute${Math.round(minutes) !== 1 ? "s" : ""}`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = Math.round(minutes % 60);

  if (hours < 24) {
    if (remainingMinutes === 0) {
      return `${hours} hour${hours !== 1 ? "s" : ""}`;
    }

    return `${hours} hour${hours !== 1 ? "s" : ""} ${remainingMinutes} minute${remainingMinutes !== 1 ? "s" : ""}`;
  }

  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;

  if (remainingHours === 0) {
    return `${days} day${days !== 1 ? "s" : ""}`;
  }

  return `${days} day${days !== 1 ? "s" : ""} ${remainingHours} hour${remainingHours !== 1 ? "s" : ""}`;
});
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
            {{ fujiScoreData.percentage.toFixed(7) }}%
          </div>

          <div class="text-sm text-gray-600 dark:text-gray-400">
            {{ fujiScoreData.datasetsWithFujiScore.toLocaleString() }} of
            {{ fujiScoreData.totalDatasets.toLocaleString() }} datasets
          </div>

          <div class="text-xs text-gray-500 dark:text-gray-500">
            {{ fujiScoreData.jobsDoneLast10Minutes.toLocaleString() }}
            datasets have been scored in the last 10 minutes ({{
              fujiScoreData.jobsCount.toLocaleString()
            }}
            seeds left)
          </div>

          <div
            v-if="formattedEta"
            class="text-primary-600 dark:text-primary-400 mt-4 text-sm font-semibold"
          >
            ETA: {{ formattedEta }}
          </div>
        </div>
      </div>
    </div>

    <!-- Machine Stats - Minimal display in bottom right -->
    <div
      v-if="
        fujiScoreData?.machineStats &&
        fujiScoreData.machineStats.stats &&
        fujiScoreData.machineStats.stats.length > 0
      "
      class="absolute right-4 bottom-4 z-10 rounded-lg bg-white/90 p-3 text-xs shadow-lg dark:bg-gray-900/90"
    >
      <div class="mb-1 font-semibold">
        Machine Processing ({{ fujiScoreData.machineStats.timeWindow }})
      </div>

      <div class="space-y-1">
        <div
          v-for="stat in fujiScoreData.machineStats.stats"
          :key="stat.machineName"
          class="flex items-center justify-between gap-3"
        >
          <span class="text-gray-600 dark:text-gray-400">
            {{ stat.machineName }}
          </span>

          <span class="font-medium"
            >{{ stat.totalResults.toLocaleString() }} ({{
              stat.totalRequests.toLocaleString()
            }}
            requests)</span
          >
        </div>
      </div>
    </div>
  </div>
</template>

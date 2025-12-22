<script setup lang="ts">
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
let animationFrameId: number | null = null;
let animationStartTime: number | null = null;
let isReverseAnimation = false; // Track if we're in reverse animation mode
const ANIMATION_DURATION = 5000; // 5 seconds in milliseconds
const REVERSE_ANIMATION_DURATION = 2000; // 2 seconds for reverse animation

interface DotInfo {
  x: number;
  y: number;
  isFilled: boolean;
  animationDelay: number; // Delay in milliseconds (0 to ANIMATION_DURATION)
  fillIndex: number; // Index used for deterministic filling order
}

let dotInfos: DotInfo[] = [];
let previousDotInfos: DotInfo[] = []; // Store previous state for reverse animation
let containerDimensions: { width: number; height: number } | null = null;

// Simple seeded random function for deterministic randomness
const seededRandom = (seed: number) => {
  const x = Math.sin(seed) * 10000;

  return x - Math.floor(x);
};

const drawDots = (timestamp?: number) => {
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

    // Initialize dot infos with static positions and random animation delays
    dotInfos = dotPositions.map((pos, shuffledIndex) => ({
      x: pos.x,
      y: pos.y,
      isFilled: false, // Will be updated based on percentage
      animationDelay: seededRandom(pos.index) * (ANIMATION_DURATION - 1000),
      fillIndex: shuffledIndex, // Used to determine which dots are filled
    }));
  }

  // Store previous state before updating (for reverse animation)
  if (!isReverseAnimation && dotInfos.length > 0) {
    previousDotInfos = dotInfos.map((dot) => ({ ...dot }));
  }

  // Update which dots are filled based on current percentage
  // Dots with lower fillIndex are filled first
  dotInfos = dotInfos.map((dot) => ({
    ...dot,
    isFilled: dot.fillIndex < filledDotsCount,
  }));

  // Start animation if not already started
  if (animationStartTime === null && timestamp !== undefined) {
    animationStartTime = timestamp;
  }

  // Calculate elapsed time
  const currentTime = timestamp || performance.now();
  const elapsed =
    animationStartTime !== null ? currentTime - animationStartTime : 0;

  // Parse colors once
  const bgR = parseInt(backgroundColor.slice(1, 3), 16);
  const bgG = parseInt(backgroundColor.slice(3, 5), 16);
  const bgB = parseInt(backgroundColor.slice(5, 7), 16);
  const primaryR = parseInt(primaryColor.slice(1, 3), 16);
  const primaryG = parseInt(primaryColor.slice(3, 5), 16);
  const primaryB = parseInt(primaryColor.slice(5, 7), 16);

  // Draw dots
  if (isReverseAnimation && previousDotInfos.length > 0) {
    // Reverse animation: transition filled dots back to background color
    const maxElapsed = REVERSE_ANIMATION_DURATION;
    const reverseProgress = Math.min(1, elapsed / maxElapsed);

    for (const dot of previousDotInfos) {
      if (dot.isFilled) {
        // Dots that were filled transition from primary back to background
        // Use reverseProgress directly for smooth transition
        const r = Math.round(primaryR + (bgR - primaryR) * reverseProgress);
        const g = Math.round(primaryG + (bgG - primaryG) * reverseProgress);
        const b = Math.round(primaryB + (bgB - primaryB) * reverseProgress);

        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        ctx.fillRect(dot.x, dot.y, dotSize, dotSize);
      } else {
        // Empty dots stay at background color
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(dot.x, dot.y, dotSize, dotSize);
      }
    }

    // Continue reverse animation if not complete
    if (elapsed < REVERSE_ANIMATION_DURATION) {
      animationFrameId = requestAnimationFrame(drawDots);
    } else {
      // Reverse animation complete, reset and prepare for forward animation
      isReverseAnimation = false;
      animationStartTime = null;
    }
  } else {
    // Forward animation: all start with background color, filled ones transition to primary color
    for (const dot of dotInfos) {
      if (dot.isFilled) {
        // Filled dots transition from background color to primary color
        const timeSinceDelay = elapsed - dot.animationDelay;
        const progress = Math.max(0, Math.min(1, timeSinceDelay / 1000)); // Transition over 1 second per dot

        if (progress > 0) {
          // Interpolate between background color and primary color
          const r = Math.round(bgR + (primaryR - bgR) * progress);
          const g = Math.round(bgG + (primaryG - bgG) * progress);
          const b = Math.round(bgB + (primaryB - bgB) * progress);

          ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
          ctx.fillRect(dot.x, dot.y, dotSize, dotSize);
        } else {
          // Not started yet, use background color
          ctx.fillStyle = backgroundColor;
          ctx.fillRect(dot.x, dot.y, dotSize, dotSize);
        }
      } else {
        // Empty dots use background color at full opacity
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(dot.x, dot.y, dotSize, dotSize);
      }
    }

    // Continue animation if not complete
    if (elapsed < ANIMATION_DURATION) {
      animationFrameId = requestAnimationFrame(drawDots);
    }
  }
};

// Draw on mount and window resize
let refreshInterval: ReturnType<typeof setInterval> | null = null;

const startAnimation = () => {
  // Reset animation state
  animationStartTime = null;
  isReverseAnimation = false;

  // Cancel any existing animation
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId);
  }

  // Start new animation
  requestAnimationFrame(drawDots);
};

const startReverseAnimation = () => {
  // Set reverse animation mode
  isReverseAnimation = true;
  animationStartTime = null;

  // Cancel any existing animation
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId);
  }

  // Start reverse animation
  requestAnimationFrame(drawDots);
};

const handleResize = () => {
  // Reset positions on resize (dimensions changed)
  containerDimensions = null;
  dotInfos = [];
  startAnimation();
};

onMounted(() => {
  nextTick(() => {
    startAnimation();
    window.addEventListener("resize", handleResize);
  });

  // Refresh data every 15 seconds, with reverse animation before refresh
  // Start reverse animation 2 seconds before refresh
  refreshInterval = setInterval(() => {
    // Start reverse animation
    startReverseAnimation();

    // Wait for reverse animation to complete, then refresh
    setTimeout(() => {
      refreshFujiScore();
    }, REVERSE_ANIMATION_DURATION);
  }, 15000);
});

onUnmounted(() => {
  window.removeEventListener("resize", handleResize);
  if (refreshInterval) {
    clearInterval(refreshInterval);
  }
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId);
  }
});

// Redraw when data changes - restart animation so newly filled dots can fade in
watch(
  () => fujiScoreData.value?.percentage,
  () => {
    nextTick(() => {
      // Only restart animation, don't reset positions
      startAnimation();
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
            jobs done in the last 10 minutes
          </div>

          <div
            v-if="formattedEta"
            class="text-primary-600 dark:text-primary-400 mt-4 text-sm font-semibold"
          >
            ETA: {{ formattedEta }}
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

          <span class="font-medium">{{ stat.totalResults }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

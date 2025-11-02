<script setup lang="ts">
interface AuroraBackgroundProps {
  class?: string;
  radialGradient?: boolean;
}

const props = withDefaults(defineProps<AuroraBackgroundProps>(), {
  class: "",
  radialGradient: true,
});

const styles = computed(() => {
  return {
    "--animate-aurora": "aurora 60s linear infinite",
    "--aurora":
      "repeating-linear-gradient(100deg,#0e7490_10%,#0891b2_15%,#047857_20%,#059669_25%,#065f46_30%)",
    "--black": "#000",

    "--blue-300": "#047857",
    "--blue-400": "#0e7490",
    "--blue-500": "#059669",
    "--dark-gradient":
      "repeating-linear-gradient(100deg,#000_0%,#000_7%,transparent_10%,transparent_12%,#000_16%)",
    "--indigo-300": "#0891b2",
    "--transparent": "transparent",
    "--violet-200": "#065f46",
    "--white": "#0e7490",
    "--white-gradient":
      "repeating-linear-gradient(100deg,#fff_0%,#fff_7%,transparent_10%,transparent_12%,#fff_16%)",
  };
});
</script>

<template>
  <div
    v-bind="props"
    :class="
      cn(
        'transition-bg relative flex h-[100vh] flex-col items-center justify-center bg-zinc-50 text-slate-950 dark:bg-zinc-900',
        props.class,
      )
    "
  >
    <div :style="styles" class="absolute inset-0 overflow-hidden">
      <div
        :class="
          cn(
            `after:animate-aurora pointer-events-none absolute -inset-[10px] [background-image:var(--white-gradient),var(--aurora)] [background-size:300%,_200%] [background-position:50%_50%,50%_50%] opacity-50 blur-[10px] invert filter will-change-transform [--aurora:repeating-linear-gradient(100deg,var(--blue-500)_10%,var(--indigo-300)_15%,var(--blue-300)_20%,var(--violet-200)_25%,var(--blue-400)_30%)] [--dark-gradient:repeating-linear-gradient(100deg,var(--black)_0%,var(--black)_7%,var(--transparent)_10%,var(--transparent)_12%,var(--black)_16%)] [--white-gradient:repeating-linear-gradient(100deg,var(--white)_0%,var(--white)_7%,var(--transparent)_10%,var(--transparent)_12%,var(--white)_16%)] after:absolute after:inset-0 after:[background-image:var(--white-gradient),var(--aurora)] after:[background-size:200%,_100%] after:[background-attachment:fixed] after:mix-blend-difference after:content-[''] dark:[background-image:var(--dark-gradient),var(--aurora)] dark:invert-0 after:dark:[background-image:var(--dark-gradient),var(--aurora)]`,
            props.radialGradient &&
              `[mask-image:radial-gradient(ellipse_at_100%_0%,black_10%,var(--transparent)_70%)]`,
          )
        "
      />
    </div>

    <slot />
  </div>
</template>

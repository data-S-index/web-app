<script setup lang="ts">
defineProps({
  title: {
    default: "Scholar Data",
    type: String,
  },
  description: {
    default: "",
    type: String,
  },
});

const themeColor = "34, 197, 94";
</script>

<template>
  <div
    class="relative flex h-full w-full flex-col items-center justify-center bg-white p-10 text-neutral-900 lg:p-[60px] dark:bg-neutral-900 dark:text-neutral-50"
  >
    <!-- Gradient background -->
    <div
      class="absolute top-0 right-0 bottom-0 left-0"
      :style="{
        backgroundImage: `radial-gradient(at 100% 100%, rgba(${themeColor}, 0.15), transparent)`,
      }"
    />

    <div
      class="absolute top-0 right-0 bottom-0 left-0"
      :style="{
        backgroundImage: `radial-gradient(at 0% 0%, rgba(${themeColor}, 0.1), transparent)`,
      }"
    />

    <div class="relative flex flex-col items-center gap-5 text-center lg:gap-8">
      <!-- Logo -->
      <div class="flex items-center gap-3">
        <svg class="h-10 w-10 lg:h-13 lg:w-13" viewBox="0 0 16 16">
          <path
            fill="#00bc7d"
            fill-rule="evenodd"
            d="M7 6.5a2 2 0 1 0 0-4a2 2 0 0 0 0 4M7 8a3.5 3.5 0 1 0 0-7a3.5 3.5 0 0 0 0 7m-.5 1.299c0-.43-.36-.774-.785-.724C2.473 8.955 0 10.728 0 12.5A2.5 2.5 0 0 0 2.5 15h3.25a.75.75 0 0 0 0-1.5H2.5a1 1 0 0 1-1-1c0-.205.22-.809 1.32-1.459c.765-.452 1.792-.813 2.969-.964c.397-.051.711-.378.711-.778m6.373 5.201l1.406-2.5l-1.406-2.5h-2.746L8.721 12l1.406 2.5zm2.713-1.765a1.5 1.5 0 0 0 0-1.47l-1.406-2.5A1.5 1.5 0 0 0 12.873 8h-2.746a1.5 1.5 0 0 0-1.307.765l-1.406 2.5a1.5 1.5 0 0 0 0 1.47l1.406 2.5a1.5 1.5 0 0 0 1.307.765h2.746a1.5 1.5 0 0 0 1.307-.765zM12.5 12a1 1 0 1 1-2 0a1 1 0 0 1 2 0"
            clip-rule="evenodd"
          />
        </svg>

        <span class="text-[32px] font-bold tracking-tight lg:text-[42px]">
          Scholar Data
        </span>
      </div>

      <div class="w-full items-center justify-center">
        <!-- Title -->
        <h1
          class="m-0 max-w-[700px] text-[48px] leading-tight font-bold lg:max-w-[1000px] lg:text-[80px]"
          style="
            display: block;
            line-clamp: 3;
            text-overflow: ellipsis;
            text-wrap: balance;
          "
        >
          {{ title }}
        </h1>
      </div>

      <!-- Description -->
      <p
        v-if="description"
        class="max-w-[650px] text-[24px] leading-relaxed opacity-70 lg:max-w-[900px] lg:text-[32px]"
      >
        {{ description }}
      </p>
    </div>
  </div>
</template>

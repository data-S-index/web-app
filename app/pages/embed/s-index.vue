<script setup lang="ts">
definePageMeta({
  layout: false,
});

// Force light mode for embed (e.g. iframes)
const colorMode = useColorMode();
colorMode.preference = "light";

useHead({
  htmlAttrs: { class: "embed-iframe light" },
  bodyAttrs: { class: "embed-iframe" },
  style: [
    {
      textContent: `
        html.embed-iframe, body.embed-iframe {
          margin: 0;
          padding: 0;
          overflow: hidden;
        }
        html.embed-iframe {
          color-scheme: light;
        }
      `,
    },
  ],
});

const route = useRoute();
const config = useRuntimeConfig().public;
const userId = computed(() => (route.query.id as string) || "");

const { data, error, status } = await useFetch(
  () =>
    `/api/v1/researchers/by-id?id=${encodeURIComponent(userId.value || "")}`,
  { watch: [userId] },
);

const sIndex = computed(() => {
  const s = data.value?.currentSIndex;

  return s != null ? s.toFixed(1) : null;
});
const datasetCount = computed(() => data.value?.datasetCount ?? null);
const totalCitations = computed(() => data.value?.totalCitations ?? null);
const totalMentions = computed(() => data.value?.totalMentions ?? null);

const profileUrl = computed(() => {
  if (!userId.value) return "#";
  const base = (config.baseUrl as string) || "";
  const path = `/users/${userId.value}`;

  return base ? `${base.replace(/\/$/, "")}${path}` : path;
});
</script>

<template>
  <div
    class="flex min-h-[200px] w-full flex-col items-center justify-center p-0 text-sm"
  >
    <!-- No ID provided -->
    <UCard
      v-if="status === 'pending' && !userId"
      variant="subtle"
      :ui="{ root: 'max-w-[280px]' }"
    >
      <p class="text-xs text-gray-500">
        Add
        <code class="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[11px]">
          ?id=YOUR_PROFILE_ID
        </code>
        to the URL
      </p>
    </UCard>

    <!-- Loading skeleton -->
    <UCard
      v-else-if="status === 'pending'"
      :ui="{ root: 'max-w-[280px] min-h-[200px]' }"
    >
      <div class="grid grid-cols-2 gap-x-4 gap-y-2.5">
        <USkeleton class="h-5 w-full" />

        <USkeleton class="h-5 w-full" />

        <USkeleton class="h-5 w-full" />

        <USkeleton class="h-5 w-full" />
      </div>
    </UCard>

    <!-- Error -->
    <UCard
      v-else-if="error || !data"
      variant="subtle"
      :ui="{ root: 'max-w-[280px]' }"
    >
      <p class="text-xs text-gray-500">
        {{ !userId ? "Profile ID is required" : "Researcher not found" }}
      </p>
    </UCard>

    <!-- Success: metrics card -->
    <UCard
      v-else
      :ui="{ root: 'max-w-[280px]' }"
      variant="soft"
      title="Scholar Index"
    >
      <div>
        <div class="grid grid-cols-2 gap-x-4 gap-y-2.5 text-center">
          <div class="flex flex-col items-center gap-0.5">
            <span
              class="text-[10px] font-medium tracking-wide text-gray-500 uppercase"
            >
              Scholar Index
            </span>

            <span class="text-base font-semibold text-emerald-700">
              {{ sIndex != null ? sIndex : "-" }}
            </span>
          </div>

          <div class="flex flex-col items-center gap-0.5">
            <span
              class="text-[10px] font-medium tracking-wide text-gray-500 uppercase"
            >
              Datasets
            </span>

            <span class="text-base font-semibold text-emerald-700">
              {{ datasetCount != null ? datasetCount.toLocaleString() : "-" }}
            </span>
          </div>

          <div class="flex flex-col items-center gap-0.5">
            <span
              class="text-[10px] font-medium tracking-wide text-gray-500 uppercase"
            >
              Citations
            </span>

            <span
              class="text-base font-semibold"
              :class="{
                'text-emerald-700': totalCitations,
                'text-gray-500': !totalCitations,
              }"
            >
              {{ (totalCitations ?? 0).toLocaleString() }}
            </span>
          </div>

          <div class="flex flex-col items-center gap-0.5">
            <span
              class="text-[10px] font-medium tracking-wide text-gray-500 uppercase"
            >
              Mentions
            </span>

            <span
              class="text-base font-semibold"
              :class="{
                'text-emerald-700': totalMentions,
                'text-gray-500': !totalMentions,
              }"
            >
              {{ (totalMentions ?? 0).toLocaleString() }}
            </span>
          </div>
        </div>
      </div>

      <template #footer>
        <div class="flex justify-center">
          <a
            :href="profileUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 no-underline hover:text-emerald-700 hover:underline"
          >
            View profile on Scholar Data
            <UIcon name="i-heroicons-arrow-right" />
          </a>
        </div>
      </template>
    </UCard>
  </div>
</template>

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
const doi = computed(() => (route.query.doi as string) || "");

const { data, error, status } = await useFetch(
  () => `/api/v1/datasets/by-doi?doi=${encodeURIComponent(doi.value || "")}`,
  { watch: [doi] },
);

const dIndex = computed(() => {
  const s = data.value?.latestDIndex?.score;

  return s != null ? s.toFixed(1) : null;
});
const totalCitations = computed(() => data.value?.totalCitations ?? null);
const totalMentions = computed(() => data.value?.totalMentions ?? null);
const fairScore = computed(() => data.value?.fujiScore?.score ?? null);
const datasetId = computed(() => data.value?.datasetId ?? null);

const detailsUrl = computed(() => {
  if (!datasetId.value) return "#";
  const base = (config.baseUrl as string) || "";
  const path = `/datasets/${datasetId.value}`;

  return base ? `${base.replace(/\/$/, "")}${path}` : path;
});
</script>

<template>
  <div
    class="flex min-h-[200px] w-full flex-col items-center justify-center p-0 text-sm"
  >
    <!-- Loading: no DOI -->
    <UCard
      v-if="status === 'pending' && !doi"
      variant="subtle"
      :ui="{ root: 'max-w-[280px]' }"
    >
      <p class="text-xs text-gray-500">
        Add
        <code class="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[11px]">
          ?doi=10.1234/example
        </code>
        to the URL
      </p>
    </UCard>

    <!-- Loading: skeleton -->
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

    <!-- Error (missing DOI, 404, etc.) -->
    <UCard
      v-else-if="error || !data"
      variant="subtle"
      :ui="{ root: 'max-w-[280px]' }"
    >
      <p class="text-xs text-gray-500">
        {{ !doi ? "DOI is required" : "Dataset not found" }}
      </p>
    </UCard>

    <!-- Success: metrics card -->
    <UCard
      v-else
      :ui="{ root: 'max-w-[280px]' }"
      variant="soft"
      title="Dataset Index"
    >
      <div>
        <div class="grid grid-cols-2 gap-x-4 gap-y-2.5 text-center">
          <div class="flex flex-col items-center gap-0.5">
            <span
              class="text-[10px] font-medium tracking-wide text-gray-500 uppercase"
            >
              Dataset Index
            </span>

            <span class="text-base font-semibold text-emerald-700">
              {{ dIndex != null ? dIndex : "—" }}
            </span>
          </div>

          <div class="flex flex-col items-center gap-0.5">
            <span
              class="text-[10px] font-medium tracking-wide text-gray-500 uppercase"
            >
              FAIR score
            </span>

            <span class="text-base font-semibold text-emerald-700">
              {{ fairScore != null ? `${Math.round(fairScore)}%` : "—" }}
            </span>
          </div>

          <div class="flex flex-col items-center gap-0.5">
            <span
              class="text-[10px] font-medium tracking-wide text-gray-500 uppercase"
            >
              Citations
            </span>

            <span
              class="text-base font-semibold text-emerald-700"
              :class="{
                'text-emerald-700': totalCitations,
                'text-gray-500': !totalCitations,
              }"
            >
              {{ totalCitations }}
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
              {{ totalMentions }}
            </span>
          </div>
        </div>

        <p
          class="mt-3 flex items-center justify-center gap-1 text-xs text-yellow-500"
        >
          <UIcon name="i-heroicons-exclamation-triangle" />
          Platform is currently in beta
        </p>
      </div>

      <template #footer>
        <div class="flex justify-center">
          <a
            :href="detailsUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 no-underline hover:text-emerald-700 hover:underline"
          >
            View more details on Scholar Data
            <UIcon name="i-heroicons-arrow-right" />
          </a>
        </div>
      </template>
    </UCard>
  </div>
</template>

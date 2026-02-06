<script setup lang="ts">
useSeoMeta({
  title: "Integrations",
  description:
    "Embed dataset index widgets or use our API to show D-Index and metrics on your platform.",
});

defineOgImageComponent("Pergel", {
  headline: "Integrations",
});

const config = useRuntimeConfig().public;
const baseUrl = computed(
  () =>
    (config.baseUrl as string) ||
    (typeof window !== "undefined" ? window.location.origin : ""),
);

const defaultDoi = "10.13026/kpb9-mt58";
const doiInput = ref(defaultDoi);
const currentDoi = computed(() =>
  (doiInput.value?.trim() || defaultDoi).replace(/^https?:\/\//i, "").trim(),
);

const embedUrl = computed(
  () =>
    `${baseUrl.value}/embed/d-index?doi=${encodeURIComponent(currentDoi.value)}`,
);
const apiByDoiUrl = computed(
  () =>
    `${baseUrl.value}/api/v1/datasets/by-doi?doi=${encodeURIComponent(currentDoi.value)}`,
);
const badgeSvgUrl = computed(
  () => `${baseUrl.value}/api/v1/shields/badge/d-index/${currentDoi.value}.svg`,
);
const shieldsDataUrl = computed(
  () => `${baseUrl.value}/api/v1/shields/data/d-index/${currentDoi.value}`,
);

// Live API responses for the current DOI
const {
  data: byDoiData,
  pending: byDoiPending,
  error: byDoiError,
} = useFetch(
  () => `/api/v1/datasets/by-doi?doi=${encodeURIComponent(currentDoi.value)}`,
  { watch: [currentDoi] },
);
const {
  data: shieldsData,
  pending: shieldsPending,
  error: shieldsError,
} = useFetch(() => `/api/v1/shields/data/d-index/${currentDoi.value}`, {
  watch: [currentDoi],
});

const apiByDoiExample = computed(() => {
  if (byDoiPending.value) return "Loading…";

  if (byDoiError.value || !byDoiData.value)
    return `{
  "error": "Dataset not found or invalid DOI"
}`;

  return JSON.stringify(byDoiData.value, null, 2);
});

const shieldsDataExample = computed(() => {
  if (shieldsPending.value) return "Loading…";

  if (shieldsError.value || !shieldsData.value)
    return `{
  "error": "Dataset not found or invalid DOI"
}`;

  return JSON.stringify(shieldsData.value, null, 2);
});

const embedSnippet = computed(
  () =>
    `<iframe
  src="${embedUrl.value}"
  title="Dataset Index"
  width="320"
  height="260"
  frameborder="0"
></iframe>`,
);
</script>

<template>
  <div class="mx-auto flex w-full max-w-screen-xl flex-col gap-8 px-6 py-8">
    <UPageCTA
      title="Integrations"
      description="Use the embedded widget or API to show dataset index and metrics on your own platform—repositories, lab sites, or dashboards."
      variant="naked"
    />

    <UCard variant="subtle">
      <div class="flex flex-col gap-2 sm:flex-row sm:items-end sm:gap-4">
        <div class="min-w-0 flex-1">
          <label
            for="integrations-doi"
            class="text-muted mb-1 block text-sm font-medium"
          >
            Try with your DOI
          </label>

          <UInput
            id="integrations-doi"
            v-model="doiInput"
            placeholder="10.13026/kpb9-mt58"
            size="md"
            class="font-mono"
          />
        </div>

        <p class="text-muted shrink-0 text-xs">
          All examples below update as you type.
        </p>
      </div>
    </UCard>

    <!-- Embed -->
    <section class="space-y-4">
      <h2 class="text-xl font-semibold">Embed widget</h2>

      <p class="text-muted max-w-2xl text-sm">
        Embed a small card showing D-Index, FAIR score, citations, and mentions
        for any dataset by DOI. Use an iframe and pass the
        <code
          class="rounded bg-gray-200 px-1.5 py-0.5 font-mono text-xs dark:bg-gray-700"
          >doi</code
        >
        query parameter.
      </p>

      <UCard variant="subtle" :ui="{ body: 'font-mono text-sm' }">
        <pre class="overflow-x-auto break-all whitespace-pre-wrap">{{
          embedSnippet
        }}</pre>
      </UCard>

      <p class="text-muted text-xs">
        Replace the
        <code class="rounded bg-gray-200 px-1 py-0.5 font-mono dark:bg-gray-700"
          >doi</code
        >

        value with your dataset’s DOI (e.g.
        <code class="rounded bg-gray-200 px-1 py-0.5 font-mono dark:bg-gray-700"
          >10.1234/your-dataset</code
        >).
      </p>

      <div class="space-y-2">
        <h3 class="text-sm font-medium">Live example</h3>

        <div
          class="inline-block rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800"
        >
          <iframe
            :src="embedUrl"
            title="Dataset Index embed example"
            width="320"
            height="260"
            class="rounded border-0"
          />
        </div>
      </div>
    </section>

    <!-- API -->
    <section class="space-y-4">
      <h2 class="text-xl font-semibold">API</h2>

      <p class="text-muted max-w-2xl text-sm">
        Fetch dataset metrics as JSON or use our badge endpoints for READMEs and
        dashboards.
      </p>

      <div class="grid gap-6 md:grid-cols-1">
        <UCard>
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon name="i-heroicons-document-arrow-down" class="size-5" />

              <span>Dataset by DOI (JSON)</span>
            </div>
          </template>

          <p class="text-muted mb-3 text-sm">
            Returns dataset id, total citations, total mentions, latest FAIR
            score, and latest D-Index.
          </p>

          <code
            class="mb-3 block rounded-lg bg-gray-100 p-3 font-mono text-xs dark:bg-gray-800"
          >
            GET {{ apiByDoiUrl }}
          </code>

          <div class="space-y-1">
            <span class="text-muted text-xs font-medium">
              Example response
            </span>

            <pre
              class="max-h-48 overflow-auto rounded-lg bg-gray-100 p-3 font-mono text-xs dark:bg-gray-800"
              >{{ apiByDoiExample }}</pre
            >
          </div>
        </UCard>

        <UCard>
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon name="i-heroicons-shield-check" class="size-5" />

              <span>Badge (SVG)</span>
            </div>
          </template>

          <p class="text-muted mb-3 text-sm">
            SVG badge with the D-Index score. Use in READMEs or docs. Use the
            DOI in the path (e.g.
            <code
              class="rounded bg-gray-200 px-1 py-0.5 font-mono dark:bg-gray-700"
              >10.13026/kpb9-mt58</code
            >).
          </p>

          <code
            class="mb-3 block rounded-lg bg-gray-100 p-3 font-mono text-xs dark:bg-gray-800"
          >
            GET {{ badgeSvgUrl }}
          </code>

          <div class="space-y-1">
            <span class="text-muted text-xs font-medium"> Example </span>

            <img
              :src="badgeSvgUrl"
              alt="Dataset Index badge example"
              class="inline-block"
            />
          </div>
        </UCard>

        <UCard>
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon name="i-heroicons-circle-stack" class="size-5" />

              <span>Shields-style data (JSON)</span>
            </div>
          </template>

          <p class="text-muted mb-3 text-sm">
            JSON for badge builders (e.g. Shields.io). Same path convention as
            the SVG badge.
          </p>

          <code
            class="mb-3 block rounded-lg bg-gray-100 p-3 font-mono text-xs dark:bg-gray-800"
          >
            GET {{ shieldsDataUrl }}
          </code>

          <div class="space-y-1">
            <span class="text-muted text-xs font-medium">
              Example response
            </span>

            <pre
              class="max-h-40 overflow-auto rounded-lg bg-gray-100 p-3 font-mono text-xs dark:bg-gray-800"
              >{{ shieldsDataExample }}</pre
            >
          </div>
        </UCard>
      </div>
    </section>

    <!-- Custom / support CTA -->
    <UCard class="border-primary/30 bg-primary/5" variant="soft">
      <div
        class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <h3 class="font-semibold">Custom widgets &amp; support</h3>

          <p class="text-muted mt-1 text-sm">
            Need custom styled widgets, white-label embeds, or additional API
            support? Reach out and we’ll help you integrate dataset index on
            your platform.
          </p>
        </div>

        <UButton
          to="https://github.com/data-S-index/web-app"
          target="_blank"
          rel="noopener noreferrer"
          color="primary"
          trailing-icon="i-heroicons-arrow-top-right-on-square"
        >
          Contact / GitHub
        </UButton>
      </div>
    </UCard>
  </div>
</template>

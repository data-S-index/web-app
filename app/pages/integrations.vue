<script setup lang="ts">
useSeoMeta({
  title: "Integrations",
  description:
    "Embed Dataset Index or S-index widgets, or use our API to show metrics on your platform.",
});

defineOgImage("NuxtSeo.takumi", {
  title: "Integrations",
  description:
    "Embed Dataset Index or S-index widgets, or use our API to show metrics on your platform.",
});

const doiSpinner = ref(false);
const userSpinner = ref(false);

const tabs = [
  {
    label: "Data Repositories",
    icon: "i-heroicons-circle-stack",
    slot: "datasets",
  },
  {
    label: "Researchers",
    icon: "i-heroicons-user-circle",
    slot: "researchers",
  },
];

const config = useRuntimeConfig().public;
const baseUrl = computed(
  () =>
    (config.baseUrl as string) ||
    (typeof window !== "undefined" ? window.location.origin : ""),
);

// --- Dataset Index (D-index) ---
const defaultDoi = "10.13026/kpb9-mt58";
const doiInput = ref(defaultDoi);
const appliedDoi = ref(defaultDoi);

function normalizeDoiInput(value: string): string {
  return (value?.trim() || defaultDoi).replace(/^https?:\/\//i, "").trim();
}

function generateDoi() {
  appliedDoi.value = normalizeDoiInput(doiInput.value);
  doiSpinner.value = true;
  setTimeout(() => {
    doiSpinner.value = false;
  }, 1000);
}

const embedUrl = computed(
  () =>
    `${baseUrl.value}/embed/d-index?doi=${encodeURIComponent(appliedDoi.value)}`,
);
const apiByDoiUrl = computed(
  () =>
    `${baseUrl.value}/api/v1/datasets/by-doi?doi=${encodeURIComponent(appliedDoi.value)}`,
);
const badgeSvgUrl = computed(
  () => `${baseUrl.value}/api/v1/shields/badge/d-index/${appliedDoi.value}.svg`,
);
const shieldsDataUrl = computed(
  () => `${baseUrl.value}/api/v1/shields/data/d-index/${appliedDoi.value}`,
);

const {
  data: byDoiData,
  pending: byDoiPending,
  error: byDoiError,
} = useFetch(
  () => `/api/v1/datasets/by-doi?doi=${encodeURIComponent(appliedDoi.value)}`,
  { watch: [appliedDoi] },
);
const {
  data: shieldsData,
  pending: shieldsPending,
  error: shieldsError,
} = useFetch(() => `/api/v1/shields/data/d-index/${appliedDoi.value}`, {
  watch: [appliedDoi],
});

const apiByDoiExample = computed(() => {
  if (byDoiPending.value) return "Loading…";
  if (byDoiError.value || !byDoiData.value)
    return "{\n  'error': 'Dataset not found or invalid DOI'\n}";

  return JSON.stringify(byDoiData.value, null, 2);
});

const shieldsDataExample = computed(() => {
  if (shieldsPending.value) return "Loading…";
  if (shieldsError.value || !shieldsData.value)
    return "{\n  'error': 'Dataset not found or invalid DOI'\n}";

  return JSON.stringify(shieldsData.value, null, 2);
});

const embedSnippet = computed(
  () =>
    `<iframe
  src="${embedUrl.value}"
  title="Dataset Index"
  width="320"
  height="240"
  frameborder="0"
></iframe>`,
);

// --- S-index ---
const defaultUserId = "01KM74851RBVMZ7N7R85BMEVTK";
const userIdInput = ref(defaultUserId);
const appliedUserId = ref(defaultUserId);

function generateUser() {
  appliedUserId.value = userIdInput.value?.trim() || "";
  userSpinner.value = true;
  setTimeout(() => {
    userSpinner.value = false;
  }, 1000);
}

const sEmbedUrl = computed(
  () =>
    `${baseUrl.value}/embed/s-index?id=${encodeURIComponent(appliedUserId.value)}`,
);
const apiByIdUrl = computed(
  () =>
    `${baseUrl.value}/api/v1/researchers/by-id?id=${encodeURIComponent(appliedUserId.value)}`,
);
const sBadgeSvgUrl = computed(
  () =>
    `${baseUrl.value}/api/v1/shields/badge/s-index/${appliedUserId.value}.svg`,
);
const sShieldsDataUrl = computed(
  () => `${baseUrl.value}/api/v1/shields/data/s-index/${appliedUserId.value}`,
);

const {
  data: byIdData,
  pending: byIdPending,
  error: byIdError,
} = useFetch(
  () =>
    `/api/v1/researchers/by-id?id=${encodeURIComponent(appliedUserId.value || "")}`,
  { watch: [appliedUserId] },
);
const {
  data: sShieldsData,
  pending: sShieldsPending,
  error: sShieldsError,
} = useFetch(
  () => `/api/v1/shields/data/s-index/${appliedUserId.value || ""}`,
  { watch: [appliedUserId] },
);

const apiByIdExample = computed(() => {
  if (!appliedUserId.value)
    return "{\n  'hint': 'Enter your profile ID above and click Generate'\n}";
  if (byIdPending.value) return "Loading…";
  if (byIdError.value || !byIdData.value)
    return "{\n  'error': 'Researcher not found'\n}";

  return JSON.stringify(byIdData.value, null, 2);
});

const sShieldsDataExample = computed(() => {
  if (!appliedUserId.value)
    return "{\n  'hint': 'Enter your profile ID above and click Generate'\n}";
  if (sShieldsPending.value) return "Loading…";
  if (sShieldsError.value || !sShieldsData.value)
    return "{\n  'error': 'Researcher not found'\n}";

  return JSON.stringify(sShieldsData.value, null, 2);
});

const sEmbedSnippet = computed(
  () =>
    `<iframe
  src="${sEmbedUrl.value}"
  title="S-index"
  width="320"
  height="240"
  frameborder="0"
></iframe>`,
);
</script>

<template>
  <div
    class="mx-auto flex w-full max-w-screen-xl flex-col gap-8 px-4 py-10 sm:px-6 lg:py-12"
  >
    <UPageCTA
      title="Integrations"
      description="Data repositories and researchers can use the embedded widget or API to display Dataset Index and S-index metrics on their own platforms — dataset pages, lab sites, or personal websites"
      variant="naked"
      :ui="{ container: '!py-5' }"
    />

    <!-- Tabs -->
    <UTabs :items="tabs" :ui="{ list: 'mb-8', trigger: 'cursor-pointer' }">
      <!-- ── Data Repositories tab ── -->
      <template #datasets>
        <div class="flex flex-col gap-8">
          <p class="text-muted text-sm">
            Add a live metrics card to your dataset pages with a single iframe
            without any backend changes required. It displays Dataset Index,
            FAIR score, citations, and mentions, giving researchers instant
            visibility into how their data is being used. Need more flexibility?
            Use the API to pull metrics as JSON or add a badge to READMEs and
            dashboards.
          </p>

          <!-- DOI input -->
          <UCard>
            <template #header>
              <span class="text-sm font-medium">Try with your DOI</span>
            </template>

            <div class="flex gap-3">
              <UInput
                v-model="doiInput"
                size="lg"
                class="font-mono"
                placeholder="Paste a DOI or DOI URL"
                @keydown.enter="generateDoi"
              />

              <UButton
                :loading="doiSpinner"
                size="lg"
                class="shrink-0"
                icon="oui:generate"
                :disabled="!doiInput"
                @click="generateDoi"
              >
                Generate
              </UButton>
            </div>
          </UCard>

          <!-- Embed widget -->
          <section class="space-y-5">
            <div class="flex items-center gap-3">
              <div
                class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 dark:bg-emerald-500/20"
              >
                <UIcon
                  name="i-heroicons-square-3-stack-3d"
                  class="size-5 text-emerald-600 dark:text-emerald-400"
                />
              </div>

              <div>
                <h2 class="text-lg font-semibold tracking-tight">
                  Embed widget
                </h2>

                <p class="text-muted text-sm">
                  Drop a live metrics card into any page with an iframe.
                </p>
              </div>
            </div>

            <UCard>
              <template #header>
                <div class="flex items-center gap-3">
                  <div
                    class="flex size-9 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800"
                  >
                    <UIcon name="i-heroicons-sparkles" />
                  </div>

                  <span class="font-medium">How it works</span>
                </div>
              </template>

              <div class="space-y-5">
                <p class="text-sm">
                  Embed a small card showing Dataset Index, FAIR score,
                  citations, and mentions for any dataset by DOI. Use an iframe
                  and pass the
                  <code
                    class="rounded bg-gray-200 px-1.5 py-0.5 font-mono text-xs dark:bg-gray-700"
                    >doi</code
                  >
                  query parameter. Replace with your dataset's DOI (e.g.
                  <code
                    class="rounded bg-gray-200 px-1 py-0.5 font-mono dark:bg-gray-700"
                    >10.1234/your-dataset</code
                  >).
                </p>

                <div
                  class="rounded-xl border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/60"
                >
                  <div
                    class="flex items-center justify-between border-b border-gray-200 px-4 py-2 dark:border-gray-700"
                  >
                    <span
                      class="text-muted text-xs font-medium tracking-wider uppercase"
                      >Snippet</span
                    >
                  </div>

                  <pre
                    class="overflow-x-auto p-4 font-mono text-xs leading-relaxed break-all whitespace-pre-wrap"
                    >{{ embedSnippet }}</pre
                  >
                </div>
              </div>

              <template #footer>
                <div class="flex flex-col justify-center space-y-5">
                  <span class="text-muted text-xs font-medium"
                    >Live preview</span
                  >

                  <iframe
                    :src="embedUrl"
                    title="Dataset Index embed example"
                    width="245"
                    height="240"
                  />
                </div>
              </template>
            </UCard>
          </section>

          <!-- API -->
          <section class="space-y-5">
            <div class="flex items-center gap-3">
              <div
                class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/15 dark:bg-violet-500/20"
              >
                <UIcon
                  name="i-heroicons-cpu-chip"
                  class="size-5 text-violet-600 dark:text-violet-400"
                />
              </div>

              <div>
                <h2 class="text-lg font-semibold tracking-tight">API</h2>

                <p class="text-muted text-sm">
                  Fetch metrics as JSON or use badge endpoints for READMEs and
                  dashboards.
                </p>
              </div>
            </div>

            <div class="grid gap-5 sm:grid-cols-1 lg:gap-6">
              <UCard
                :ui="{
                  root: 'ring-1 ring-gray-200/80 dark:ring-gray-700/50 overflow-hidden',
                  header: 'border-b border-gray-200/80 dark:border-gray-700/50',
                  body: 'flex flex-col gap-4 p-5 sm:p-6',
                }"
              >
                <template #header>
                  <div class="flex items-center gap-3">
                    <div
                      class="flex size-9 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800"
                    >
                      <UIcon
                        name="i-heroicons-document-arrow-down"
                        class="size-4 text-gray-600 dark:text-gray-400"
                      />
                    </div>

                    <div>
                      <span class="font-medium">Dataset by DOI</span>

                      <span class="text-muted ml-2 text-xs">JSON</span>
                    </div>
                  </div>
                </template>

                <p class="text-muted text-sm">
                  Returns dataset id, total citations, total mentions, latest
                  FAIR score, and latest Dataset Index.
                </p>

                <div class="space-y-1.5">
                  <span class="text-muted text-xs font-medium">Request</span>

                  <div
                    class="overflow-hidden rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 font-mono text-xs dark:border-gray-700 dark:bg-gray-800/80"
                  >
                    <span class="text-emerald-600 dark:text-emerald-400"
                      >GET</span
                    >
                    {{ " " }}
                    <span class="break-all">{{ apiByDoiUrl }}</span>
                  </div>
                </div>

                <div class="space-y-1.5">
                  <span class="text-muted text-xs font-medium">Response</span>

                  <pre
                    class="max-h-44 min-h-[6rem] overflow-auto rounded-lg border border-gray-200 bg-gray-50 p-3 font-mono text-xs dark:border-gray-700 dark:bg-gray-800/80"
                    >{{ apiByDoiExample }}</pre
                  >
                </div>

                <div
                  class="flex flex-col gap-1 border-t border-gray-200/80 pt-3 text-xs sm:flex-row sm:items-center sm:justify-between dark:border-gray-700/50"
                >
                  <span class="text-muted"
                    >Rate limited to 30 requests/minute per IP.</span
                  >

                  <NuxtLink
                    to="/contact"
                    class="text-primary-600 dark:text-primary-400 font-medium hover:underline"
                  >
                    Need a higher limit? Contact us
                  </NuxtLink>
                </div>
              </UCard>

              <UCard>
                <template #header>
                  <div class="flex items-center gap-3">
                    <div
                      class="flex size-9 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800"
                    >
                      <UIcon
                        name="i-heroicons-shield-check"
                        class="size-4 text-gray-600 dark:text-gray-400"
                      />
                    </div>

                    <div>
                      <span class="font-medium">Badge</span>

                      <span class="text-muted ml-2 text-xs">SVG</span>
                    </div>
                  </div>
                </template>

                <p class="text-muted text-sm">
                  SVG badge with the D-Index score for READMEs or docs. Use the
                  DOI in the path (e.g.
                  <code
                    class="rounded bg-gray-200 px-1 py-0.5 font-mono dark:bg-gray-700"
                    >10.13026/kpb9-mt58</code
                  >).
                </p>

                <div class="space-y-1.5">
                  <span class="text-muted text-xs font-medium">Request</span>

                  <div
                    class="overflow-hidden rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 font-mono text-xs dark:border-gray-700 dark:bg-gray-800/80"
                  >
                    <span class="text-emerald-600 dark:text-emerald-400"
                      >GET</span
                    >
                    {{ " " }}
                    <span class="break-all">{{ badgeSvgUrl }}</span>
                  </div>
                </div>

                <div class="space-y-1.5">
                  <span class="text-muted text-xs font-medium">Preview</span>

                  <div
                    class="flex min-h-[2.5rem] items-center rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-800/80"
                  >
                    <img
                      :src="badgeSvgUrl"
                      alt="Dataset Index badge"
                      class="inline-block"
                    />
                  </div>
                </div>
              </UCard>

              <UCard>
                <template #header>
                  <div class="flex items-center gap-3">
                    <div
                      class="flex size-9 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800"
                    >
                      <UIcon
                        name="i-heroicons-circle-stack"
                        class="size-4 text-gray-600 dark:text-gray-400"
                      />
                    </div>

                    <div>
                      <span class="font-medium">Shields-style data</span>

                      <span class="text-muted ml-2 text-xs">JSON</span>
                    </div>
                  </div>
                </template>

                <p class="text-muted text-sm">
                  JSON for badge builders (e.g. Shields.io). Same path
                  convention as the SVG badge.
                </p>

                <div class="space-y-1.5">
                  <span class="text-muted text-xs font-medium">Request</span>

                  <div
                    class="overflow-hidden rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 font-mono text-xs dark:border-gray-700 dark:bg-gray-800/80"
                  >
                    <span class="text-emerald-600 dark:text-emerald-400"
                      >GET</span
                    >
                    {{ " " }}
                    <span class="break-all">{{ shieldsDataUrl }}</span>
                  </div>
                </div>

                <div class="space-y-1.5">
                  <span class="text-muted text-xs font-medium">Response</span>

                  <pre
                    class="max-h-40 min-h-[5rem] overflow-auto rounded-lg border border-gray-200 bg-gray-50 p-3 font-mono text-xs dark:border-gray-700 dark:bg-gray-800/80"
                    >{{ shieldsDataExample }}</pre
                  >
                </div>
              </UCard>
            </div>
          </section>
        </div>
      </template>

      <!-- ── Researchers tab ── -->
      <template #researchers>
        <div class="flex flex-col gap-8">
          <p class="text-muted text-sm">
            Add a live S-index card to your personal website, GitHub profile, or
            lab page with a single iframe without any backend changes required.
            It displays your S-index, dataset count, citations, and mentions,
            giving visitors a clear picture of your data sharing impact. Prefer
            a lightweight option? Add a badge to your README or pull your
            metrics as JSON to build your own display.
          </p>

          <!-- Profile ID input -->
          <UCard>
            <template #header>
              <span class="text-sm font-medium">Try with your profile ID</span>
            </template>

            <div class="flex gap-3">
              <UInput
                v-model="userIdInput"
                size="lg"
                class="font-mono"
                placeholder="Paste your profile ID"
                @keydown.enter="generateUser"
              />

              <UButton
                :loading="userSpinner"
                size="lg"
                class="shrink-0"
                icon="oui:generate"
                :disabled="!userIdInput"
                @click="generateUser"
              >
                Generate
              </UButton>
            </div>

            <p class="text-muted mt-3 text-xs">
              Find your profile ID in the URL of your Scholar Data profile page
              (e.g.
              <code
                class="rounded bg-gray-200 px-1 py-0.5 font-mono dark:bg-gray-700"
                >scholardata.io/users/YOUR_ID</code
              >).
            </p>
          </UCard>

          <!-- Embed widget -->
          <section class="space-y-5">
            <div class="flex items-center gap-3">
              <div
                class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 dark:bg-emerald-500/20"
              >
                <UIcon
                  name="i-heroicons-user-circle"
                  class="size-5 text-emerald-600 dark:text-emerald-400"
                />
              </div>

              <div>
                <h2 class="text-lg font-semibold tracking-tight">
                  Embed widget
                </h2>

                <p class="text-muted text-sm">
                  Drop a live S-index card into any page with an iframe.
                </p>
              </div>
            </div>

            <UCard>
              <template #header>
                <div class="flex items-center gap-3">
                  <div
                    class="flex size-9 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800"
                  >
                    <UIcon name="i-heroicons-sparkles" />
                  </div>

                  <span class="font-medium">How it works</span>
                </div>
              </template>

              <div class="space-y-5">
                <p class="text-sm">
                  Embed a small card showing S-index, dataset count, citations,
                  and mentions for your researcher profile. Use an iframe and
                  pass your profile
                  <code
                    class="rounded bg-gray-200 px-1.5 py-0.5 font-mono text-xs dark:bg-gray-700"
                    >id</code
                  >
                  as a query parameter.
                </p>

                <div
                  class="rounded-xl border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/60"
                >
                  <div
                    class="flex items-center justify-between border-b border-gray-200 px-4 py-2 dark:border-gray-700"
                  >
                    <span
                      class="text-muted text-xs font-medium tracking-wider uppercase"
                      >Snippet</span
                    >
                  </div>

                  <pre
                    class="overflow-x-auto p-4 font-mono text-xs leading-relaxed break-all whitespace-pre-wrap"
                    >{{ sEmbedSnippet }}</pre
                  >
                </div>
              </div>

              <template #footer>
                <div class="flex flex-col justify-center space-y-5">
                  <span class="text-muted text-xs font-medium"
                    >Live preview</span
                  >

                  <iframe
                    v-if="appliedUserId"
                    :src="sEmbedUrl"
                    title="S-index embed example"
                    width="245"
                    height="240"
                  />

                  <p v-else class="text-muted text-xs">
                    Enter your profile ID above and click Generate to see a
                    preview.
                  </p>
                </div>
              </template>
            </UCard>
          </section>

          <!-- API -->
          <section class="space-y-5">
            <div class="flex items-center gap-3">
              <div
                class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/15 dark:bg-violet-500/20"
              >
                <UIcon
                  name="i-heroicons-cpu-chip"
                  class="size-5 text-violet-600 dark:text-violet-400"
                />
              </div>

              <div>
                <h2 class="text-lg font-semibold tracking-tight">API</h2>

                <p class="text-muted text-sm">
                  Fetch S-index metrics as JSON or use badge endpoints for
                  READMEs and dashboards.
                </p>
              </div>
            </div>

            <div class="grid gap-5 sm:grid-cols-1 lg:gap-6">
              <UCard
                :ui="{
                  root: 'ring-1 ring-gray-200/80 dark:ring-gray-700/50 overflow-hidden',
                  header: 'border-b border-gray-200/80 dark:border-gray-700/50',
                  body: 'flex flex-col gap-4 p-5 sm:p-6',
                }"
              >
                <template #header>
                  <div class="flex items-center gap-3">
                    <div
                      class="flex size-9 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800"
                    >
                      <UIcon
                        name="i-heroicons-document-arrow-down"
                        class="size-4 text-gray-600 dark:text-gray-400"
                      />
                    </div>

                    <div>
                      <span class="font-medium">Researcher by ID</span>

                      <span class="text-muted ml-2 text-xs">JSON</span>
                    </div>
                  </div>
                </template>

                <p class="text-muted text-sm">
                  Returns S-index, dataset count, total citations, and total
                  mentions for a researcher profile.
                </p>

                <div class="space-y-1.5">
                  <span class="text-muted text-xs font-medium">Request</span>

                  <div
                    class="overflow-hidden rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 font-mono text-xs dark:border-gray-700 dark:bg-gray-800/80"
                  >
                    <span class="text-emerald-600 dark:text-emerald-400"
                      >GET</span
                    >
                    {{ " " }}
                    <span class="break-all">{{ apiByIdUrl }}</span>
                  </div>
                </div>

                <div class="space-y-1.5">
                  <span class="text-muted text-xs font-medium">Response</span>

                  <pre
                    class="max-h-44 min-h-[6rem] overflow-auto rounded-lg border border-gray-200 bg-gray-50 p-3 font-mono text-xs dark:border-gray-700 dark:bg-gray-800/80"
                    >{{ apiByIdExample }}</pre
                  >
                </div>
              </UCard>

              <UCard>
                <template #header>
                  <div class="flex items-center gap-3">
                    <div
                      class="flex size-9 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800"
                    >
                      <UIcon
                        name="i-heroicons-shield-check"
                        class="size-4 text-gray-600 dark:text-gray-400"
                      />
                    </div>

                    <div>
                      <span class="font-medium">Badge</span>

                      <span class="text-muted ml-2 text-xs">SVG</span>
                    </div>
                  </div>
                </template>

                <p class="text-muted text-sm">
                  SVG badge with the S-index score for READMEs or docs. Use your
                  profile ID in the path.
                </p>

                <div class="space-y-1.5">
                  <span class="text-muted text-xs font-medium">Request</span>

                  <div
                    class="overflow-hidden rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 font-mono text-xs dark:border-gray-700 dark:bg-gray-800/80"
                  >
                    <span class="text-emerald-600 dark:text-emerald-400"
                      >GET</span
                    >
                    {{ " " }}
                    <span class="break-all">{{ sBadgeSvgUrl }}</span>
                  </div>
                </div>

                <div class="space-y-1.5">
                  <span class="text-muted text-xs font-medium">Preview</span>

                  <div
                    class="flex min-h-[2.5rem] items-center rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-800/80"
                  >
                    <img
                      v-if="appliedUserId"
                      :src="sBadgeSvgUrl"
                      alt="S-index badge"
                      class="inline-block"
                    />

                    <span v-else class="text-muted text-xs">
                      Enter your profile ID above to preview the badge.
                    </span>
                  </div>
                </div>
              </UCard>

              <UCard>
                <template #header>
                  <div class="flex items-center gap-3">
                    <div
                      class="flex size-9 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800"
                    >
                      <UIcon
                        name="i-heroicons-circle-stack"
                        class="size-4 text-gray-600 dark:text-gray-400"
                      />
                    </div>

                    <div>
                      <span class="font-medium">Shields-style data</span>

                      <span class="text-muted ml-2 text-xs">JSON</span>
                    </div>
                  </div>
                </template>

                <p class="text-muted text-sm">
                  JSON for badge builders (e.g. Shields.io). Same path
                  convention as the SVG badge.
                </p>

                <div class="space-y-1.5">
                  <span class="text-muted text-xs font-medium">Request</span>

                  <div
                    class="overflow-hidden rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 font-mono text-xs dark:border-gray-700 dark:bg-gray-800/80"
                  >
                    <span class="text-emerald-600 dark:text-emerald-400"
                      >GET</span
                    >
                    {{ " " }}
                    <span class="break-all">{{ sShieldsDataUrl }}</span>
                  </div>
                </div>

                <div class="space-y-1.5">
                  <span class="text-muted text-xs font-medium">Response</span>

                  <pre
                    class="max-h-40 min-h-[5rem] overflow-auto rounded-lg border border-gray-200 bg-gray-50 p-3 font-mono text-xs dark:border-gray-700 dark:bg-gray-800/80"
                    >{{ sShieldsDataExample }}</pre
                  >
                </div>
              </UCard>
            </div>
          </section>
        </div>
      </template>
    </UTabs>

    <!-- Custom / support CTA -->
    <UCard
      class="ring-primary-200/50 dark:ring-primary-800/50 overflow-hidden ring-1"
      :ui="{
        root: 'bg-gradient-to-br from-primary-50 to-primary-100/50 dark:from-primary-950/50 dark:to-primary-900/30 shadow-sm',
        body: 'p-5 sm:p-6',
      }"
    >
      <div
        class="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between"
      >
        <div class="flex gap-4">
          <div
            class="bg-primary-500/20 dark:bg-primary-500/25 flex size-12 shrink-0 items-center justify-center rounded-xl"
          >
            <UIcon
              name="i-heroicons-sparkles"
              class="text-primary-600 dark:text-primary-400 size-6"
            />
          </div>

          <div>
            <h3 class="font-semibold">Custom widgets &amp; support</h3>

            <p class="text-muted mt-1 text-sm">
              Need custom styled widgets, white-label embeds, or additional API
              support? Reach out and we'll help you integrate Scholar Data on
              your platform.
            </p>
          </div>
        </div>

        <UButton
          to="https://github.com/data-S-index/web-app"
          target="_blank"
          rel="noopener noreferrer"
          color="primary"
          size="lg"
          class="shrink-0"
          trailing-icon="i-heroicons-arrow-top-right-on-square"
        >
          Contact / GitHub
        </UButton>
      </div>
    </UCard>
  </div>
</template>

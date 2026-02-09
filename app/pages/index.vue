<script setup lang="ts">
import { useColorMode } from "@vueuse/core";
import { computed } from "vue";

// Force light mode
useColorMode().value = "light";

useSeoMeta({
  title: "Scholar Data",
  description:
    "Get credit for the data you share - clearly, fairly, and publicly.",
});

defineOgImageComponent("Pergel", {
  headline: "Launching soon 🚀",
});

const links = ref([
  {
    label: "Find your S-Index",
    to: "/login",
    size: "xl" as const,
    trailingIcon: "ic:outline-saved-search",
  },
  {
    label: "Evaluate a Dataset",
    to: "/evaluate",
    size: "xl" as const,
    variant: "subtle" as const,
    trailingIcon: "i-heroicons-arrow-path",
  },
]);

const features = ref([
  {
    title: "FAIR Assessment",
    description:
      "See how Findable, Accessible, Interoperable, and Reusable your datasets really are - with transparent scores you can improve over time.",
    icon: "i-heroicons-check-badge",
    buttonTitles: [
      {
        label: "Evaluate a Dataset",
        to: "/evaluate",
      },
    ],
  },
  {
    title: "S-Index & D-Index",
    description:
      "A dataset-first impact metric. Each dataset earns a D-Index (FAIRness, citations, and mentions), and your S-Index rolls them up into one clear score you can actually explain.",
    icon: "i-heroicons-chart-bar-square",
    buttonTitles: [
      {
        label: "View Platform Metrics",
        to: "/metrics",
      },
    ],
  },
  {
    title: "Dataset Discovery",
    description:
      "Find datasets by topic, DOI, or keyword. Track citations and attention over time - and spot real-world reuse across the community.",
    icon: "i-heroicons-magnifying-glass-circle",
    buttonTitles: [
      {
        label: "Search Datasets",
        to: "/search/datasets",
      },
    ],
  },
  {
    title: "Authors & Organizations",
    description:
      "Look up researchers and institutions in seconds. See S-Index scores, claimed datasets, and data-sharing footprint in one place.",
    icon: "i-heroicons-user-group",
    buttonTitles: [
      {
        label: "Search Authors",
        to: "/search/au",
      },
      {
        label: "Search Organizations",
        to: "/search/ao",
      },
    ],
  },
  {
    title: "Claim Your Datasets",
    description:
      "Connect DOIs and URLs to your profile and start building measurable credit for the data you publish - not just the papers.",
    icon: "i-heroicons-link",
    buttonTitles: [
      {
        label: "Claim Your Datasets",
        to: "/login",
      },
    ],
  },
  {
    title: "Resolve & Enrich",
    description:
      "Turn a DOI or URL into rich dataset metadata: citations, mentions, normalization, and domain context - so you know what's landing and why.",
    icon: "i-heroicons-arrow-path",
    buttonTitles: [
      {
        label: "Resolve a DOI or URL",
        to: "/resolve",
      },
    ],
  },
]);

const isDark = computed(() => useColorMode().value === "dark");
</script>

<template>
  <section>
    <UPageHero
      title="Give your datasets the credit they deserve."
      description="Scholar Data helps you measure, improve, and showcase the impact of what you share - beyond publications."
      headline="Launching soon 🚀"
      :ui="{ container: '!pb-10' }"
    />

    <UPageSection :ui="{ container: '!pt-10' }">
      <template #body>
        <div class="grid w-full grid-cols-1 gap-4 md:grid-cols-3">
          <div
            v-for="(feature, index) in features"
            :key="index"
            class="flex h-[500px] w-full flex-col gap-4 lg:h-[250px] lg:flex-row"
          >
            <CardSpotlight
              :gradient-color="isDark ? '#4ade80' : '#86efac'"
              slot-class="flex size-full flex-col justify-between p-5"
            >
              <div class="flex flex-col gap-3">
                <UIcon
                  :name="feature.icon"
                  class="size-8 shrink-0 text-emerald-400 dark:text-emerald-300"
                />

                <h3
                  class="text-lg font-semibold tracking-tight text-gray-900 dark:text-gray-100"
                >
                  {{ feature.title }}
                </h3>

                <p
                  class="text-sm leading-relaxed text-gray-600 dark:text-gray-400"
                >
                  {{ feature.description }}
                </p>
              </div>

              <div class="flex gap-2">
                <NuxtLink
                  v-for="button in feature.buttonTitles"
                  :key="button.label"
                  :to="button.to as string"
                >
                  <UButton
                    color="primary"
                    variant="solid"
                    size="sm"
                    trailing-icon="i-heroicons-arrow-right"
                  >
                    {{ button?.label }}
                  </UButton>
                </NuxtLink>
              </div>
            </CardSpotlight>
          </div>
        </div>
      </template>
    </UPageSection>

    <UPageSection
      headline="Evaluate a Dataset"
      title="On-demand dataset metrics, computed in real time"
      description="Paste a DOI or dataset URL to get fresh, on-demand metrics. The D-Index is calculated at request time - not pulled from a static index - so you always see the latest citations, mentions, FAIR score, and normalized results in one place."
      icon="i-heroicons-arrow-path"
      :links="[
        {
          label: 'Evaluate a Dataset',
          to: '/evaluate',
          icon: 'i-heroicons-arrow-right',
        },
      ]"
    />

    <UPageSection
      headline="Why it matters"
      title="Publications aren't the whole story - datasets drive discovery."
      description="Traditional metrics reward papers. The S-Index rewards shared datasets: how findable they are, how often they're cited or mentioned, and how they're reused. It's simple to interpret, field-sensitive, and built on tools researchers already use."
      orientation="horizontal"
      reverse
    >
      <div
        class="ring-default flex flex-col gap-4 rounded-xl bg-gray-50 p-6 ring dark:bg-gray-900/50"
      >
        <div class="flex items-center gap-3">
          <UIcon
            name="i-heroicons-cube-transparent"
            class="text-primary size-8 shrink-0"
          />

          <div>
            <p class="font-semibold text-gray-900 dark:text-gray-100">
              Dataset-first
            </p>

            <p class="text-sm text-gray-600 dark:text-gray-400">
              Every dataset earns a D-Index; your S-Index reflects your full
              sharing footprint.
            </p>
          </div>
        </div>

        <div class="flex items-center gap-3">
          <UIcon
            name="i-heroicons-scale"
            class="text-primary size-8 shrink-0"
          />

          <div>
            <p class="font-semibold text-gray-900 dark:text-gray-100">
              Fair across fields
            </p>

            <p class="text-sm text-gray-600 dark:text-gray-400">
              Context and normalization help comparisons stay meaningful across
              disciplines.
            </p>
          </div>
        </div>

        <div class="flex items-center gap-3">
          <UIcon name="i-heroicons-bolt" class="text-primary size-8 shrink-0" />

          <div>
            <p class="font-semibold text-gray-900 dark:text-gray-100">
              Built on reuse + FAIR
            </p>

            <p class="text-sm text-gray-600 dark:text-gray-400">
              FAIRness, citations, and attention - combined into one
              transparent, improvable score.
            </p>
          </div>
        </div>
      </div>
    </UPageSection>
  </section>
</template>

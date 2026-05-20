<script setup lang="ts">
import { useColorMode } from "@vueuse/core";
import type { ButtonProps } from "@nuxt/ui";

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

const links = ref<ButtonProps[]>([
  {
    label: "Create your profile",
    to: "/signup",
    icon: "i-heroicons-user-plus",
  },
]);

const features = ref([
  {
    title: "Get your S-index",
    description:
      "Create a profile, add your datasets, and track your S-index, citations to your datasets, FAIR scores, and other metrics.",
    icon: "i-heroicons-link",
    buttonTitles: [
      {
        label: "Create a profile",
        to: "/signup",
      },
    ],
  },
  {
    title: "Browse profiles",
    description:
      "We auto-generated 1M+ author profiles for demo purpose based on our preliminary large scale testing of the S-index with 49M datasets. You can find and view an author's profile along with their S-index and other data impact metrics.",
    icon: "i-heroicons-user-group",
    buttonTitles: [
      {
        label: "View Profiles",
        to: "/search/au",
      },
    ],
  },
  {
    title: "Browse datasets",
    description:
      "You can also browse the impact pages of the 49M datasets we already processed. Find a dataset and checkout its Dataset Index and other impact metrics.",
    icon: "i-heroicons-magnifying-glass-circle",
    buttonTitles: [
      {
        label: "View Datasets",
        to: "/search/datasets",
      },
    ],
  },
  {
    title: "Evaluate datasets",
    description:
      "Are you not able to find a dataset? No worries! Just drop the DOI or URL of the dataset and we will generate its impact page live.",
    icon: "i-heroicons-check-badge",
    buttonTitles: [
      {
        label: "Evaluate Dataset",
        to: "/evaluate",
      },
    ],
  },
  {
    title: "Integrate with Scholar Data",
    description:
      "Are you a repository maintainer who wants to display the impact of their datasets? We provide simple ways to showcase the Dataset Index and other impact metrics of a dataset directly in your repository.",
    icon: "i-heroicons-arrow-path",
    buttonTitles: [
      {
        label: "Integrate",
        to: "/integrations",
      },
    ],
  },
  {
    title: "View platform metrics",
    description:
      "Curious about how many datasets we have tracked, how many citations and mentions we have found, how many dataset FAIR scores we have computed? There is a page just for that!",
    icon: "i-heroicons-chart-bar-square",
    buttonTitles: [
      {
        label: "View Metrics",
        to: "/metrics",
      },
    ],
  },
]);

const isDark = computed(() => useColorMode().value === "dark");

const { data: platformMetrics } = await useFetch<{
  userCount: number;
}>("/api/metrics");

const AUTOMATED_PROFILE_COUNT = 4093652;

const actualProfilesDisplay = computed(() => {
  const count = platformMetrics.value?.userCount ?? 0;

  return count - (count % 5);
});

const totalProfilesDisplay = computed(() => AUTOMATED_PROFILE_COUNT);
</script>

<template>
  <section>
    <UPageHero
      description="Scholar Data helps you measure, improve, and showcase the impact of your datasets, similarly to how you track publication impact on Google Scholar."
      :ui="{ container: '!pb-10' }"
      :links="links"
    >
      <template #title>
        <h1
          class="text-highlighted text-5xl font-bold tracking-tight text-pretty sm:text-7xl"
        >
          Give your datasets <br />
          the credit they deserve.
        </h1>
      </template>

      <div class="relative mt-10 w-full">
        <div
          class="from-primary/0 via-primary/40 to-primary/0 absolute top-5 left-0 hidden h-px w-full bg-gradient-to-r md:block"
        />

        <div class="grid grid-cols-1 gap-10 md:grid-cols-3">
          <div class="flex flex-col items-center text-center">
            <div
              class="bg-primary relative z-10 mb-5 flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white ring-4 ring-white dark:ring-gray-950"
            >
              01
            </div>

            <UIcon
              name="i-heroicons-user-circle"
              class="text-primary mb-3 h-6 w-6"
            />

            <h3 class="mb-2 text-lg font-semibold">Create your profile</h3>

            <p class="text-muted text-sm leading-relaxed">
              Sign up and tell us about your research focus and affiliations.
            </p>
          </div>

          <div class="flex flex-col items-center text-center">
            <div
              class="bg-primary relative z-10 mb-5 flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white ring-4 ring-white dark:ring-gray-950"
            >
              02
            </div>

            <UIcon
              name="i-heroicons-circle-stack"
              class="text-primary mb-3 h-6 w-6"
            />

            <h3 class="mb-2 text-lg font-semibold">Claim your datasets</h3>

            <p class="text-muted text-sm leading-relaxed">
              Find your datasets from our index of 49 million datasets and add
              them to your profile.
            </p>
          </div>

          <div class="flex flex-col items-center text-center">
            <div
              class="bg-primary relative z-10 mb-5 flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white ring-4 ring-white dark:ring-gray-950"
            >
              03
            </div>

            <UIcon
              name="i-heroicons-chart-bar"
              class="text-primary mb-3 h-6 w-6"
            />

            <h3 class="mb-2 text-lg font-semibold">Track your S-index</h3>

            <p class="text-muted text-sm leading-relaxed">
              Showcase this new metric that measures your data sharing impact,
              the way the h-index measures your publications.
            </p>
          </div>
        </div>
      </div>
    </UPageHero>

    <UPageSection :ui="{ container: '!pt-10' }">
      <template #body>
        <div
          class="border-primary-200 bg-primary-50/50 dark:border-primary-800 dark:bg-primary-950/30 mt-6 mb-15 flex flex-col gap-1 rounded-xl border p-6 text-center text-lg"
        >
          <h2 class="mb-3 text-center text-3xl font-semibold">About</h2>

          <p class="text-balance">
            As part of an
            <NuxtLink
              to="https://www.nei.nih.gov/research-and-training/research-news/nih-challenge-aimed-incentivizing-data-sharing-recognizes-phase-1-winners"
              target="_blank"
              class="text-primary hover:text-primary-600 transition-all"
              rel="noopener noreferrer"
              >NIH-organized Challenge</NuxtLink
            >, we are developing a novel metric called S-index (or Sharing
            Index) that measures the data sharing impact of a
            researcher-similarly to how the h-index measures publication impact.
          </p>

          <p class="text-balance">
            Scholar Data is intended to provide a Google Scholar-like platform
            for researchers and organizations to track their S-index.
          </p>
        </div>

        <div>
          <h2 class="mb-6 text-center text-2xl font-semibold">
            There are several features you can already try out:
          </h2>

          <div class="grid w-full grid-cols-1 gap-4 md:grid-cols-3">
            <div
              v-for="(feature, index) in features"
              :key="index"
              class="flex w-full flex-col gap-4 lg:flex-row"
            >
              <CardSpotlight
                :gradient-color="isDark ? '#4ade80' : '#86efac'"
                slot-class="flex size-full flex-col justify-between p-5 gap-3"
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
        </div>

        <section
          class="border-primary-200 bg-primary-50/50 dark:border-primary-800 dark:bg-primary-950/30 mt-15 flex items-start gap-3 rounded-xl border p-6"
          aria-label="Privacy notice"
        >
          <UIcon
            name="i-heroicons-shield-check-20-solid"
            class="text-primary-600 dark:text-primary-400 mt-0.5 size-6 shrink-0"
          />

          <div>
            <h3 class="font-semibold text-gray-900 dark:text-gray-100">
              Privacy & transparency
            </h3>

            <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Usage is fully anonymous-we do not track you. The source code is
              open in our
              <a
                href="https://github.com/data-S-index/web-app"
                target="_blank"
                rel="noopener noreferrer"
                class="text-primary-600 decoration-primary-400 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 font-medium underline underline-offset-2"
              >
                GitHub repository</a
              >.
            </p>
          </div>
        </section>
      </template>
    </UPageSection>

    <UPageSection title="What is the S-index?" :ui="{ container: '!pt-10' }">
      <template #description>
        <div
          class="text-muted mt-6 text-center text-base text-balance sm:text-lg"
        >
          Despite growing adoption of data sharing, there is still no
          standardized, transparent, and equitable way to measure and
          incentivize it. To address this gap, we propose the S-index, a metric
          that evaluates the data sharing impact of a researcher based on
          dataset-level signals of FAIRness, citations, and alternative
          mentions.
        </div>

        <div
          class="text-muted mt-6 text-center text-base text-balance sm:text-lg"
        >
          To support its calculation, we are continuously identifying datasets
          from DataCite and data repositories, calculating their FAIR scores
          using tools like F-UJI, identifying citations from sources like Make
          Data Count corpus, OpenAlex, and DataCite, and searching for
          alternative mentions in code (Software Heritage, Hugging Face),
          patents, and policies.
        </div>

        <div
          class="text-muted mt-6 text-center text-base text-balance sm:text-lg"
        >
          We refer to the resources
          <NuxtLink
            to="https://github.com/data-S-index/resources"
            class="text-primary hover:text-primary-600 transition-all"
            target="_blank"
            rel="noopener noreferrer"
            >GitHub repository</NuxtLink
          >
          for more details about the formulation and calculation of the S-index.
        </div>
      </template>
    </UPageSection>

    <UPageSection
      headline="Why it matters"
      title="Publications aren't the whole story - datasets drive discovery."
      description="Traditional metrics reward papers. The S-Index rewards shared datasets: how findable they are, how often they're cited or mentioned, and how they're reused. It's simple to interpret, field-sensitive, and built on tools researchers already use."
      orientation="horizontal"
      reverse
      :ui="{ container: '!pt-10' }"
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
              Every dataset earns a Dataset Index; your S-Index reflects your
              full sharing footprint.
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

    <UPageSection :ui="{ container: '!pt-10' }">
      <template #body>
        <div class="mt-6">
          <div class="mx-auto mb-12 max-w-screen-xl px-6 text-center">
            <h2 class="text-3xl font-bold tracking-tight sm:text-4xl">
              Trusted by a growing community of researchers
            </h2>

            <p class="text-muted mt-3 text-lg text-balance">
              Scholar Data helps researchers create, discover, and manage
              academic profiles at scale.
            </p>
          </div>

          <div
            class="mx-auto grid max-w-screen-xl grid-cols-1 gap-8 px-6 md:grid-cols-2 md:justify-items-center"
          >
            <div class="relative w-full">
              <div
                class="bg-primary/10 absolute inset-0 animate-pulse rounded-xl blur-md"
              />

              <UCard class="relative h-full w-full text-center">
                <div class="flex flex-col items-center gap-3 py-4">
                  <UIcon
                    name="i-heroicons-user-group"
                    class="h-10 w-10 text-pink-600"
                  />

                  <div class="text-5xl font-bold text-pink-600">
                    {{ actualProfilesDisplay.toLocaleString() }}+
                  </div>

                  <p class="text-lg font-semibold">Researcher Accounts</p>

                  <p class="text-muted text-sm">
                    Verified profiles created and actively managed by real
                    researchers.
                  </p>
                </div>
              </UCard>
            </div>

            <div class="relative w-full">
              <div
                class="bg-primary/10 absolute inset-0 animate-pulse rounded-xl blur-md"
              />

              <UCard class="relative h-full w-full text-center">
                <div class="flex flex-col items-center gap-3 py-4">
                  <UIcon
                    name="i-heroicons-identification"
                    class="h-10 w-10 text-pink-600"
                  />

                  <div class="text-5xl font-bold text-pink-600">
                    {{ totalProfilesDisplay.toLocaleString() }}
                  </div>

                  <p class="text-lg font-semibold">Profiles Generated</p>

                  <p class="text-muted text-sm">
                    Researcher profiles automatically generated from our
                    academic data collection pipeline.
                  </p>
                </div>
              </UCard>
            </div>
          </div>
        </div>
      </template>
    </UPageSection>
  </section>
</template>

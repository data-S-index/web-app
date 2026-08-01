<script setup lang="ts">
import { useColorMode } from "@vueuse/core";
import type { ButtonProps } from "@nuxt/ui";

// Force light mode
useColorMode().value = "light";

useSeoMeta({
  title: "Scholar Data - NIH S-Index for Data Sharing Impact",
  description:
    "Track your NIH S-index, the official metric from the NIH Data Sharing S-index Challenge. Get credit for the data you share - clearly, fairly, and publicly.",
  keywords:
    "NIH S-index, NIH S index, NIH Data Sharing S-index Challenge, S-index, data sharing metric, dataset impact score, research data metrics, h-index for data",
});

useHead({
  titleTemplate: "",
});

useSchemaOrg([
  defineWebPage({
    "@type": ["WebPage", "FAQPage"],
  }),
  defineQuestion({
    name: "What is the NIH S-index?",
    answer:
      "The NIH S-index is a metric that measures the impact of shared research datasets, similar to how the h-index measures publication impact. It was introduced through the NIH Data Sharing S-index Challenge to give researchers credit for the data they share.",
  }),
  defineQuestion({
    name: "How is the NIH S-index calculated?",
    answer:
      "Scholar Data calculates the S-index by combining three signals for each dataset: FAIRness (how findable, accessible, interoperable, and reusable it is), citations across sources like OpenAlex, Make Data Count, and DataCite, and mentions in code, patents, and policy documents.",
  }),
  defineQuestion({
    name: "Who won the NIH Data Sharing S-index Challenge?",
    answer:
      "Scholar Data was recognized as a winner of the NIH Data Sharing S-index Challenge, which aimed to develop a metric that incentivizes and rewards researchers for sharing their data.",
  }),
]);

defineOgImage("NuxtSeo.takumi", {
  title: "",
  description:
    "Track your NIH S-index. Get credit for the data you share - clearly, fairly, and publicly. \n Winner of the NIH S-index Challenge to incentivize data sharing.",
});

const links = ref<ButtonProps[]>([
  {
    label: "Create your profile",
    to: "/signup",
    icon: "i-heroicons-user-plus",
  },
]);

const faqItems = ref([
  {
    label: "What is the NIH S-index?",
    content:
      "The NIH S-index is a metric that measures the impact of shared research datasets, similar to how the h-index measures publication impact. It was introduced through the NIH Data Sharing S-index Challenge to give researchers credit for the data they share.",
  },
  {
    label: "How is the NIH S-index calculated?",
    content:
      "Scholar Data calculates the S-index by combining three signals for each dataset: FAIRness (how findable, accessible, interoperable, and reusable it is, scored via F-UJI), citations across sources like OpenAlex, Make Data Count, and DataCite, and mentions in code, patents, and policy documents.",
  },
  {
    label: "Who won the NIH Data Sharing S-index Challenge?",
    content:
      "Scholar Data was recognized as a winner of the NIH Data Sharing S-index Challenge, which aimed to develop a metric that incentivizes and rewards researchers for sharing their data.",
  },
  {
    label: "How do I get my NIH S-index score?",
    content:
      "Create a free Scholar Data profile, claim your datasets from our index of over 49 million datasets, and your NIH S-index score is calculated automatically from your data sharing impact.",
  },
]);

const features = ref([
  {
    title: "Browse profiles",
    description:
      "Find and view author profiles with their S-index, dataset impact metrics, and citation history.",
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
      "Explore the impact pages of the 49M datasets we have processed, including their Dataset Index and FAIR scores.",
    icon: "i-heroicons-magnifying-glass-circle",
    buttonTitles: [
      {
        label: "View Datasets",
        to: "/search/datasets",
      },
    ],
  },
  {
    title: "Evaluate a dataset",
    description:
      "Drop a DOI or URL and we will generate an impact page for any dataset on the fly.",
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
      "Repository maintainer? Embed Dataset Index scores and impact metrics directly in your platform.",
    icon: "i-heroicons-arrow-path",
    buttonTitles: [
      {
        label: "Integrate",
        to: "/integrations",
      },
    ],
  },
]);

const isDark = computed(() => useColorMode().value === "dark");

const platforms = [
  {
    name: "DataCite",
    url: "https://datacite.org",
    logo: "https://datacite.org/wp-content/uploads/2023/05/DataCite-Logo_secondary-bicolor-light.png",
  },
  {
    name: "OpenAlex",
    url: "https://openalex.org",
    logo: "https://i0.wp.com/blog.openalex.org/wp-content/uploads/2025/09/image-3.png",
  },
  {
    name: "Make Data Count",
    url: "https://makedatacount.org",
    logo: "https://makedatacount.org/wp-content/themes/website/assets/images/make-data-count-logo.svg",
  },
  {
    name: "F-UJI",
    url: "https://www.f-uji.net",
    logo: "https://www.f-uji.net/images/fuji_logo.png",
  },
  {
    name: "Software Heritage",
    url: "https://www.softwareheritage.org",
    logo: "https://annex.softwareheritage.org/public/logo/software-heritage-logo-title.2048px.png",
  },
  {
    name: "Hugging Face",
    url: "https://huggingface.co",
    logo: "https://huggingface.co/datasets/huggingface/brand-assets/resolve/main/hf-logo-with-title.png",
  },
  {
    name: "GitHub",
    url: "https://github.com/data-S-index/web-app",
    logo: "https://brand.github.com/_next/static/media/logo-03.cc5e5332.png",
  },
];

const { data: platformMetrics } = useFetch<{
  userCount: number;
}>("/api/metrics", { lazy: true });

const actualProfilesDisplay = computed(() => {
  const count = platformMetrics.value?.userCount ?? 0;

  return count - (count % 5);
});
</script>

<template>
  <section>
    <UPageHero
      description="Scholar Data helps you measure, improve, and showcase your NIH S-index, the new metric for data sharing impact, similarly to how you track publication impact on Google Scholar."
      :ui="{ container: '!pb-10' }"
      :links="links"
    >
      <template #title>
        <h1 class="text-highlighted text-5xl font-bold text-pretty sm:text-7xl">
          Give your datasets <br />
          the credit they deserve.
        </h1>
      </template>

      <template #headline>
        <a
          href="https://www.nih.gov/challenges/nih-data-sharing-index-s-index-challenge#winners"
          target="_blank"
          rel="noopener noreferrer"
        >
          <UBadge
            variant="soft"
            color="success"
            class="cursor-pointer"
            icon="tabler:award"
          >
            NIH Challenge Winner
          </UBadge>
        </a>
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

            <p class="text-muted text-sm">Sign up and tell us about you.</p>
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

            <p class="text-muted text-sm">
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

            <p class="text-muted text-sm">
              Showcase this new metric that measures your data sharing impact,
              the way the h-index measures your publications.
            </p>
          </div>
        </div>
      </div>
    </UPageHero>

    <UPageSection :ui="{ container: '!pt-10 !pb-0' }">
      <template #body>
        <div
          class="border-primary-200 bg-primary-50/30 dark:border-primary-800 dark:bg-primary-950/20 flex flex-col items-center gap-4 rounded-xl border p-8 text-center sm:flex-row sm:text-left"
        >
          <div class="flex-1">
            <p
              class="mb-1 text-xs font-semibold text-gray-400 uppercase dark:text-gray-500"
            >
              See it in action
            </p>

            <h2 class="text-xl font-semibold text-gray-900 dark:text-gray-100">
              Curious what your profile would look like?
            </h2>

            <p class="text-muted mt-1 text-sm">
              Browse an example profile to see how datasets, citations, FAIR
              scores, and your S-index are displayed.
            </p>
          </div>

          <NuxtLink
            to="https://scholardata.io/users/01KM74851RBVMZ7N7R85BMEVTK"
            target="_blank"
            rel="noopener noreferrer"
          >
            <UButton
              color="primary"
              variant="outline"
              trailing-icon="i-heroicons-arrow-top-right-on-square"
              size="md"
            >
              View example profile
            </UButton>
          </NuxtLink>
        </div>
      </template>
    </UPageSection>

    <UPageSection :ui="{ container: '!pt-10 !pb-10' }">
      <template #body>
        <div class="mx-auto max-w-screen-xl">
          <h2 class="mb-2 text-center text-3xl font-bold sm:text-4xl">
            Trusted by a growing community of researchers
          </h2>

          <p class="text-muted mb-8 text-center text-lg text-balance">
            Scholar Data helps researchers measure, discover, and showcase their
            data sharing impact at scale.
          </p>

          <div class="grid grid-cols-1 gap-6 md:grid-cols-3">
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
                    Profiles created and actively managed by real researchers
                    and teams.
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
                    name="i-heroicons-circle-stack"
                    class="h-10 w-10 text-pink-600"
                  />

                  <div class="text-5xl font-bold text-pink-600">49M+</div>

                  <p class="text-lg font-semibold">Datasets Indexed</p>

                  <p class="text-muted text-sm">
                    Datasets processed, scored, and tracked for citations and
                    impact across disciplines.
                  </p>
                </div>
              </UCard>
            </div>

            <div class="relative w-full">
              <div
                class="bg-primary/10 absolute inset-0 animate-pulse rounded-xl blur-md"
              />

              <NuxtLink
                to="https://www.nih.gov/challenges/nih-data-sharing-index-s-index-challenge#winners"
                target="_blank"
                rel="noopener noreferrer"
              >
                <UCard class="relative h-full w-full text-center">
                  <div class="flex flex-col items-center gap-3 py-4">
                    <UIcon
                      name="i-heroicons-trophy"
                      class="h-10 w-10 text-pink-600"
                    />

                    <div class="text-5xl font-bold text-pink-600">NIH</div>

                    <p class="text-lg font-semibold">Challenge Winner</p>

                    <p class="text-muted text-sm">
                      Recognized as the winner of the NIH S-index Challenge to
                      incentivize data sharing.
                    </p>
                  </div>
                </UCard>
              </NuxtLink>
            </div>
          </div>
        </div>
      </template>
    </UPageSection>

    <UPageSection :ui="{ container: '!pt-10' }">
      <template #description>
        <div class="mx-auto text-center">
          <p class="text-primary mb-4 text-xs font-semibold uppercase">
            Why it matters
          </p>

          <h2
            class="mb-8 text-3xl font-bold text-black sm:text-4xl dark:text-white"
          >
            Data sharing goes unrecognized and unrewarded.
          </h2>

          <div
            class="text-muted mt-6 text-center text-base text-balance sm:text-lg"
          >
            Researchers invest years collecting and sharing datasets that
            underpin reproducibility, transparency, and discovery across every
            field. Without shared data, findings can't be verified, built upon,
            or trusted. And yet, the metrics that define academic careers, such
            as citations, h-index, and impact factor, only count publications.
            Data sharing goes unrecognized and unrewarded.
          </div>

          <div
            class="text-muted mt-6 text-center text-base text-balance sm:text-lg"
          >
            This creates a broken incentive: researchers are expected to share
            data, but get no credit for doing so. The result is that data
            sharing is treated as a chore rather than a contribution.
          </div>

          <div
            class="text-muted mt-6 text-center text-base text-balance sm:text-lg"
          >
            Scholar Data and the S-index are aimed at fixing this. By measuring
            how impactful your datasets are, the S-index gives data sharing the
            same visibility and recognition as publishing, turning it from an
            obligation into a career asset.
          </div>
        </div>
      </template>
    </UPageSection>

    <USeparator />

    <UPageSection :ui="{ container: '!py-10' }">
      <template #body>
        <div class="mx-auto max-w-3xl text-center">
          <p class="text-primary mb-4 text-xs font-semibold uppercase">
            How the S-index works
          </p>

          <h2 class="mb-4 text-3xl font-bold sm:text-4xl">
            A metric built on three signals
          </h2>

          <p class="text-muted mb-10 text-base sm:text-lg">
            The S-index evaluates your data sharing impact by combining
            dataset-level signals that reflect how findable, reusable, and
            influential your datasets are across science.
          </p>

          <div class="grid grid-cols-1 gap-6 text-left sm:grid-cols-3">
            <UCard>
              <template #header>
                <div class="flex items-center gap-2">
                  <UIcon
                    name="i-heroicons-check-badge"
                    class="text-primary size-5"
                  />

                  <h3 class="font-semibold text-gray-900 dark:text-gray-100">
                    FAIRness
                  </h3>
                </div>
              </template>

              <p class="text-gray-600 dark:text-gray-400">
                How findable, accessible, interoperable, and reusable each
                dataset is, scored via F-UJI.
              </p>
            </UCard>

            <UCard>
              <template #header>
                <div class="flex items-center gap-2">
                  <UIcon
                    name="i-heroicons-document-text"
                    class="text-primary size-5"
                  />

                  <h3 class="font-semibold text-gray-900 dark:text-gray-100">
                    Citations
                  </h3>
                </div>
              </template>

              <p class="text-gray-600 dark:text-gray-400">
                Direct citations tracked across OpenAlex, Make Data Count, and
                DataCite.
              </p>
            </UCard>

            <UCard>
              <template #header>
                <div class="flex items-center gap-2">
                  <UIcon
                    name="i-heroicons-megaphone"
                    class="text-primary size-5"
                  />

                  <h3 class="font-semibold text-gray-900 dark:text-gray-100">
                    Mentions
                  </h3>
                </div>
              </template>

              <p class="text-gray-600 dark:text-gray-400">
                Alternative mentions in code (Software Heritage, Hugging Face),
                patents, and policies.
              </p>
            </UCard>
          </div>

          <div class="mt-8 flex justify-center">
            <NuxtLink
              to="https://docs.scholardata.io/s-index-guide/concepts"
              target="_blank"
              rel="noopener noreferrer"
            >
              <UButton
                color="primary"
                variant="solid"
                icon="i-heroicons-arrow-top-right-on-square"
              >
                Learn more about the concepts behind the S-index
              </UButton>
            </NuxtLink>
          </div>
        </div>
      </template>
    </UPageSection>

    <USeparator />

    <UPageSection :ui="{ container: '!py-10' }" class="hidden">
      <template #body>
        <div class="mx-auto max-w-3xl">
          <p
            class="text-primary mb-4 text-center text-xs font-semibold uppercase"
          >
            Frequently asked questions
          </p>

          <h2 class="mb-8 text-center text-3xl font-bold sm:text-4xl">
            Everything you need to know about the NIH S-index
          </h2>

          <UAccordion :items="faqItems" />
        </div>
      </template>
    </UPageSection>

    <UPageSection :ui="{ container: '!pt-10 !pb-0' }">
      <template #body>
        <div class="mx-auto max-w-3xl text-center">
          <p class="text-primary mb-4 text-xs font-semibold uppercase">
            Built openly on trusted infrastructure
          </p>

          <h2 class="mb-6 text-3xl font-bold sm:text-4xl">
            We don't reinvent the wheel.
          </h2>

          <div
            class="text-muted mb-10 flex flex-col gap-4 text-base text-balance sm:text-lg"
          >
            <p>
              Scholar Data is free to use. Our source code is open on GitHub,
              and our methodology is fully documented.
            </p>

            <p>
              We transparently aggregate signals from the infrastructure that
              the research community already relies on.
            </p>
          </div>
        </div>
      </template>
    </UPageSection>

    <UMarquee :overlay="false" pause-on-hover>
      <NuxtLink
        v-for="platform in [...platforms]"
        :key="platform.name"
        :to="platform.url"
        target="_blank"
        rel="noopener noreferrer"
        class="mx-1 flex flex-col items-center gap-2 grayscale transition-all hover:grayscale-0"
      >
        <img :src="platform.logo" :alt="platform.name" class="h-10 w-auto" />

        <!-- <span class="text-xs font-medium">
          {{ platform.name }}
        </span> -->
      </NuxtLink>
    </UMarquee>

    <div class="mt-6 flex justify-center">
      <UButton
        to="https://docs.scholardata.io/data-collection/overview"
        target="_blank"
        rel="noopener noreferrer"
        color="neutral"
        variant="link"
        size="sm"
        trailing-icon="i-heroicons-arrow-top-right-on-square"
        class="hover:text-primary-500 text-slate-400 transition-all"
      >
        Learn more about how we use these resources
      </UButton>
    </div>

    <UPageSection>
      <template #body>
        <div class="mx-auto max-w-screen-xl">
          <h2 class="mb-2 text-center text-3xl font-bold sm:text-4xl">
            Explore the platform
          </h2>

          <p class="text-muted mb-10 text-center text-lg text-balance">
            Scholar data allows you to do a lot more.
          </p>

          <div
            class="grid w-full grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4"
          >
            <div
              v-for="(feature, index) in features"
              :key="index"
              class="flex w-full flex-col"
            >
              <CardSpotlight
                :gradient-color="isDark ? '#4ade80' : '#86efac'"
                slot-class="flex size-full flex-col justify-between p-5 gap-3"
              >
                <div class="flex flex-col gap-3">
                  <UIcon
                    :name="feature.icon"
                    class="size-8 text-emerald-400 dark:text-emerald-300"
                  />

                  <h3
                    class="text-lg font-semibold text-gray-900 dark:text-gray-100"
                  >
                    {{ feature.title }}
                  </h3>

                  <p class="text-sm text-gray-600 dark:text-gray-400">
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
      </template>
    </UPageSection>
  </section>
</template>

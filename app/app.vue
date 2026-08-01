<script setup lang="ts">
const colorMode = useColorMode();

useHead({
  htmlAttrs: {
    lang: "en",
  },
  link: [
    { href: "/favicon.ico", rel: "shortcut icon" },
    { href: "/favicon-96x96.png", rel: "icon", sizes: "96x96" },
    { href: "/favicon.svg", rel: "icon", type: "image/svg+xml" },
    {
      href: "/apple-touch-icon.png",
      rel: "apple-touch-icon",
      sizes: "180x180",
    },
    { href: "/site.webmanifest", rel: "manifest" },
  ],
  meta: [
    { charset: "utf-8" },
    { name: "viewport", content: "width=device-width, initial-scale=1" },
    { name: "apple-mobile-web-app-title", content: "Scholar Data" },
    {
      name: "theme-color",
      content: colorMode.value === "dark" ? "#111827" : "white",
      key: "theme-color",
    },
  ],
  script: [
    {
      src: "https://tally.so/widgets/embed.js",
      async: true,
    },
    {
      defer: true,
      src: "https://umami.fairdataihub.org/mushroom",
      "data-website-id": "a259fbbd-af7d-4fa6-b940-408f301706f2",
      "data-exclude-search": true,
    },
  ],
});

useSeoMeta({
  titleTemplate: "%s - Scholar Data",
  description:
    "Get credit for the data you share - clearly, fairly, and publicly.",
  keywords:
    "NIH S-index, NIH S index, NIH Data Sharing S-index Challenge, data sharing metric, dataset impact score",
  twitterCard: "summary_large_image",
  ogUrl: "https://scholardata.io",
  ogSiteName: "Scholar Data",
  twitterTitle: "Scholar Data",
  twitterDescription:
    "Get credit for the data you share - clearly, fairly, and publicly.",
});

useSchemaOrg([
  defineWebSite({
    name: "Scholar Data",
  }),
  defineOrganization({
    name: "Scholar Data",
    description:
      "Scholar Data measures, improves, and showcases the impact of shared research datasets through the NIH S-index.",
    award: "Winner, NIH Data Sharing S-index Challenge",
  }),
]);
</script>

<template>
  <UApp>
    <NuxtLoadingIndicator />

    <div class="hidden bg-yellow-500 p-1 text-center text-sm text-black">
      The site is currently undergoing database migration. This may cause some
      instability and slow performance. We apologize for the inconvenience and
      appreciate your patience.
    </div>

    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>

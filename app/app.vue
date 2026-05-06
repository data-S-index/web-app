<script setup lang="ts">
const colorMode = useColorMode();

useHead({
  htmlAttrs: {
    lang: "en",
  },
  link: [
    {
      rel: "icon",
      type: "image/png",
      href: "/favicon-96x96.png",
      sizes: "96x96",
    },
    { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
    { rel: "shortcut icon", href: "/favicon.ico" },
    {
      rel: "apple-touch-icon",
      sizes: "180x180",
      href: "/apple-touch-icon.png",
    },
    { rel: "manifest", href: "/site.webmanifest" },
  ],
  meta: [
    { charset: "utf-8" },
    { name: "viewport", content: "width=device-width, initial-scale=1" },
    { name: "apple-mobile-web-app-title", content: "MyWebSite" },
    {
      name: "theme-color",
      content: colorMode.value === "dark" ? "#111827" : "white",
      key: "theme-color",
    },
  ],
});

useSeoMeta({
  titleTemplate: "%s - Scholar Data",
  description:
    "Get credit for the data you share - clearly, fairly, and publicly.",
  twitterCard: "summary_large_image",
  ogUrl: "https://scholardata.io",
  twitterTitle: "Scholar Data",
  twitterDescription:
    "Get credit for the data you share - clearly, fairly, and publicly.",
});
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

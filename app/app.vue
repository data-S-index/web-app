<script setup lang="ts">
const colorMode = useColorMode();

useHead({
  htmlAttrs: {
    lang: "en",
  },
  link: [{ href: "/favicon.ico", rel: "icon" }],
  meta: [
    { charset: "utf-8" },
    { name: "viewport", content: "width=device-width, initial-scale=1" },
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
  ogUrl: "https://beta.scholardata.io",
  twitterTitle: "Scholar Data",
  twitterDescription:
    "Get credit for the data you share - clearly, fairly, and publicly.",
});
</script>

<template>
  <UApp>
    <NuxtLoadingIndicator />

    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>

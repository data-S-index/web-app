<script setup lang="ts">
useSeoMeta({
  title: "Scholar Data",
  description: "Your most important metric as a scientist.",
});

defineOgImageComponent("Pergel", {
  headline: "Coming Soon...",
});

const links = ref([
  {
    label: "Find your S-Index Score",
    to: "/login",
    size: "xl" as const,
    trailingIcon: "ic:outline-saved-search",
  },
]);
</script>

<template>
  <section>
    <UPageHero
      title="Creating a new metric for shareable science."
      description="Your most important metric as a scientist."
      headline="Coming Soon..."
      orientation="horizontal"
      :links="links"
    >
      <img
        src="https://picsum.photos/1000/1000"
        alt="App screenshot"
        class="ring-default rounded-lg shadow-2xl ring"
      />
    </UPageHero>
  </section>
</template>

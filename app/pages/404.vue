<script setup lang="ts">
useSeoMeta({
  title: "Page Not Found",
  description: "The page you're looking for doesn't exist.",
});

defineOgImageComponent("Pergel", {
  headline: "Page Not Found",
});
</script>

<template>
  <div class="p-6">
    <h1 class="mb-4 text-2xl font-bold">404</h1>

    <p>Page not found</p>
  </div>
</template>

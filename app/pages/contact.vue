<script setup lang="ts">
useSeoMeta({
  title: "Contact Us",
});

const iframeLoaded = ref(false);
</script>

<template>
  <UContainer class="py-12">
    <div class="mb-4 text-center">
      <h1 class="mb-4 text-3xl font-bold">Contact Us</h1>

      <p class="text-lg">
        Have a question or need help? We'd love to hear from you. Send us a
        message and we'll respond as soon as possible.
      </p>
    </div>

    <UCard>
      <iframe
        data-tally-src="https://tally.so/embed/jaJR2Y?alignLeft=1&hideTitle=1&transparentBackground=1&dynamicHeight=1"
        loading="lazy"
        width="100%"
        height="324"
        title="Envision Portal Contact Form"
        @load="iframeLoaded = true"
      />

      <p class="mt-4 text-center text-xs text-slate-400 dark:text-slate-400">
        Having trouble loading the form?
        <a
          href="https://tally.so/r/jaJR2Y"
          target="_blank"
          rel="noopener noreferrer"
          class="text-primary-700 font-medium hover:underline"
        >
          Open the contact form here instead</a
        >.
      </p>
    </UCard>
  </UContainer>
</template>

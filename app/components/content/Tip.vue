<script setup lang="ts">
defineProps<{ to?: string }>();
</script>

<template>
  <component
    :is="to ? 'NuxtLink' : 'div'"
    :to="to"
    class="border-success bg-success/5 my-4 flex items-start gap-3 rounded-lg border-l-4 p-4 text-sm [&_p]:m-0"
    :class="{ 'hover:bg-success/10 transition-colors': to }"
  >
    <UIcon
      name="i-heroicons-light-bulb"
      class="text-success mt-0.5 size-5 shrink-0"
    />

    <div><slot /></div>
  </component>
</template>

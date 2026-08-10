<script setup lang="ts">
withDefaults(defineProps<{ to?: string; icon?: string }>(), {
  icon: "i-heroicons-megaphone",
});
</script>

<template>
  <component
    :is="to ? 'NuxtLink' : 'div'"
    :to="to"
    :target="to?.startsWith('http') ? '_blank' : undefined"
    :rel="to?.startsWith('http') ? 'noopener noreferrer' : undefined"
    class="border-default bg-elevated/50 my-4 flex items-start gap-3 rounded-lg border p-4 text-sm [&_p]:m-0"
    :class="{ 'hover:bg-elevated transition-colors': to }"
  >
    <UIcon :name="icon" class="text-muted mt-0.5 size-5 shrink-0" />

    <div><slot /></div>
  </component>
</template>

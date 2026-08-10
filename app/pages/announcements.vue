<script setup lang="ts">
useSeoMeta({
  title: "Announcements",
  description:
    "News, press mentions, and updates from the Scholar Data team.",
});

defineOgImage("NuxtSeo.takumi", {
  title: "Announcements",
  description:
    "News, press mentions, and updates from the Scholar Data team.",
});

interface Announcement {
  title: string;
  description: string;
  date: string;
  to?: string;
  target?: string;
}

// No announcements yet — add entries here as press mentions or
// platform updates become available.
const announcements: Announcement[] = [];
</script>

<template>
  <div class="mx-auto flex w-full max-w-screen-md flex-col gap-6 px-6 py-10">
    <UPageCTA
      title="Announcements"
      description="News, press mentions, and updates from the Scholar Data team."
      variant="naked"
      :ui="{ container: '!pb-6' }"
    />

    <div v-if="announcements.length" class="flex flex-col gap-4">
      <UCard v-for="item in announcements" :key="item.title">
        <template #header>
          <div class="flex items-center justify-between gap-4">
            <h3 class="text-lg font-semibold">{{ item.title }}</h3>

            <span class="text-muted shrink-0 text-xs">{{ item.date }}</span>
          </div>
        </template>

        <p class="text-muted text-sm">{{ item.description }}</p>

        <UButton
          v-if="item.to"
          :to="item.to"
          :target="item.target"
          variant="link"
          class="mt-2 p-0"
          trailing-icon="i-heroicons-arrow-top-right-on-square"
        >
          Read more
        </UButton>
      </UCard>
    </div>

    <UCard v-else>
      <div class="flex flex-col items-center gap-2 py-10 text-center">
        <UIcon
          name="i-heroicons-megaphone"
          class="text-muted size-8 shrink-0"
        />

        <p class="font-medium">No announcements yet</p>

        <p class="text-muted text-sm">
          We'll post news and platform updates here — check back soon.
        </p>
      </div>
    </UCard>
  </div>
</template>

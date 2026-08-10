<script setup lang="ts">
useSeoMeta({
  title: "Announcements",
  description: "News, press mentions, and updates from the Scholar Data team.",
});

defineOgImage("NuxtSeo.takumi", {
  title: "Announcements",
  description: "News, press mentions, and updates from the Scholar Data team.",
});

const { $dayjs } = useNuxtApp();

const { data: announcements } = await useAsyncData("announcements-list", () =>
  queryCollection("announcements")
    .where("sitemap", "IS NOT NULL")
    .order("date", "DESC")
    .all(),
);
</script>

<template>
  <div class="mx-auto flex w-full max-w-screen-md flex-col gap-6 px-6 py-10">
    <UPageCTA
      title="Announcements"
      description="News, press mentions, and updates from the Scholar Data team."
      variant="naked"
      :ui="{ container: '!pb-6' }"
    />

    <div v-if="announcements?.length" class="flex flex-col gap-4">
      <UPageCard
        v-for="post in announcements"
        :key="post.path"
        :to="post.path"
        :title="post.title"
        :description="post.description"
        class="hover:ring-primary transition-shadow"
      >
        <template #footer>
          <span class="text-muted text-xs">
            {{ $dayjs(post.date).format("DD MMMM YYYY") }}
          </span>
        </template>
      </UPageCard>
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

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
    .order("date", "DESC")
    .all()
    .then((posts) => posts.filter((post) => !post.draft)),
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

    <div class="flex flex-col">
      <template v-for="post in announcements" :key="post.path">
        <NuxtLink
          :to="post.externalUrl ?? post.path"
          :target="post.externalUrl ? '_blank' : undefined"
          class="group ring-primary/10 hover:ring-primary/40 -mx-4 mb-2 grid grid-cols-[4.5rem_1fr] items-start gap-4 rounded-lg border-slate-100 px-4 py-5 ring-1 transition-all hover:shadow-sm sm:grid-cols-[5.5rem_1fr] sm:gap-6"
        >
          <time class="flex flex-col pt-0.5" :datetime="post.date">
            <span
              class="text-muted text-xs font-semibold tracking-wider uppercase"
            >
              {{ $dayjs(post.date).format("MMM") }}
            </span>

            <span
              class="text-highlighted text-2xl leading-tight font-bold tabular-nums"
            >
              {{ $dayjs(post.date).format("DD") }}
            </span>

            <span class="text-muted text-xs">
              {{ $dayjs(post.date).format("YYYY") }}
            </span>
          </time>

          <div class="flex min-w-0 flex-col gap-1.5">
            <div class="flex flex-wrap items-center gap-2">
              <h2
                class="text-highlighted group-hover:text-primary font-semibold transition-colors"
              >
                {{ post.title }}
              </h2>

              <UBadge
                v-if="post.externalUrl"
                color="neutral"
                variant="subtle"
                size="sm"
                icon="i-heroicons-arrow-top-right-on-square"
              >
                External
              </UBadge>

              <UIcon
                name="i-heroicons-arrow-right"
                class="text-primary size-4 -translate-x-1 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100"
              />
            </div>

            <p class="text-muted line-clamp-2 text-sm">
              {{ post.description }}
            </p>
          </div>
        </NuxtLink>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
const route = useRoute();
const { $dayjs } = useNuxtApp();

const slug = route.params.slug as string;

const { data: post } = await useAsyncData(`announcement-${slug}`, () =>
  queryCollection("announcements").path(`/announcements/${slug}`).first(),
);

if (!post.value) {
  throw createError({
    statusCode: 404,
    statusMessage: "Announcement not found",
  });
}

useSeoMeta({
  title: post.value.title,
  description: post.value.description,
});

defineOgImage("NuxtSeo.takumi", {
  title: post.value.title,
  description: post.value.description,
});
</script>

<template>
  <div class="mx-auto flex w-full max-w-screen-md flex-col gap-6 px-6 py-10">
    <UButton
      to="/announcements"
      icon="i-heroicons-arrow-left"
      color="neutral"
      variant="link"
      class="w-fit p-0"
    >
      Back to Announcements
    </UButton>

    <div v-if="post">
      <UPageCTA
        :title="post.title"
        :description="post.description"
        variant="naked"
        :ui="{ container: '!pb-6' }"
      />

      <p class="text-muted -mt-4 text-sm">
        {{ $dayjs(post.date).format("DD MMMM YYYY") }}
      </p>

      <UCard class="mt-6">
        <ContentRenderer
          :value="post"
          class="prose prose-md dark:prose-invert max-w-none"
        />
      </UCard>
    </div>
  </div>
</template>

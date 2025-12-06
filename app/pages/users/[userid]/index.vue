<script setup lang="ts">
import { faker } from "@faker-js/faker";
import type { Author } from "#shared/types/dataset";
const { user, loggedIn } = useUserSession();

useSeoMeta({
  title: "User Profile",
});

const route = useRoute();
const toast = useToast();

const userid = (route.params.userid as string).toUpperCase();

const { data: userData, error } = await useFetch(
  `/api/users/${userid}/datasets`,
);

if (error.value) {
  toast.add({
    title: "Error fetching datasets",
    description: error.value.data?.statusMessage,
    icon: "material-symbols:error",
    color: "error",
  });
}

// Fetch user profile info
const { data: userProfile, error: userProfileError } = await useFetch(
  `/api/users/${userid}`,
);

if (userProfileError.value) {
  toast.add({
    title: "Error fetching user profile",
    description: userProfileError.value.data?.statusMessage,
    icon: "material-symbols:error",
    color: "error",
  });
}

// Generate fake affiliation with faker
const affiliation = computed(() => {
  if (!userProfile.value) return "";

  // Use userid as seed for consistent fake data
  faker.seed([...userid].reduce((acc, char) => acc + char.charCodeAt(0), 0));

  return faker.company.name();
});

// Generate avatar URL from dicebear using userid as seed
const avatarUrl = computed(() => {
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${userid}`;
});

// Get user's full name
const fullName = computed(() => {
  if (!userProfile.value) return "";

  const givenName = userProfile.value.givenName || "";
  const familyName = userProfile.value.familyName || "";

  return `${givenName} ${familyName}`.trim() || "User";
});

const getAuthorTooltipText = (author: Author): string => {
  const parts: string[] = [];

  // Add affiliations
  const affiliations = author.affiliations || [];
  if (Array.isArray(affiliations) && affiliations.length > 0) {
    parts.push(`${affiliations.join("; ")}`);
  }

  return parts.length > 0
    ? parts.join("\n")
    : "No additional information available";
};
</script>

<template>
  <UContainer>
    <UPage>
      <UPageHeader>
        <template #title>
          <div class="flex items-center gap-2">
            <UAvatar :src="avatarUrl" :alt="fullName" size="3xl" />

            <div class="flex flex-col">
              <h1
                v-if="fullName"
                class="text-2xl font-bold text-gray-900 dark:text-gray-100"
              >
                {{ fullName }}
              </h1>

              <p
                v-if="affiliation"
                class="flex items-center text-sm font-medium text-gray-500 dark:text-gray-400"
              >
                {{ affiliation }}
              </p>
            </div>
          </div>
        </template>

        <template #links />
      </UPageHeader>

      <UPageBody>
        <div class="mb-6 grid grid-cols-1 gap-6 md:grid-cols-3">
          <UCard>
            <template #header>
              <h3 class="text-lg font-semibold">Total Datasets</h3>
            </template>

            <div class="text-3xl font-bold text-pink-600">
              {{ userData?.length }}
            </div>

            <p class="mt-2 text-sm">Claimed by user</p>
          </UCard>

          <UCard>
            <template #header>
              <h3 class="text-lg font-semibold">S-Index Score</h3>
            </template>

            <div class="text-3xl font-bold text-pink-600">
              {{ faker.number.float({ min: 0, max: 100 }).toFixed(2) }}
            </div>

            <p class="mt-2 text-sm">S-Index score for the user's datasets</p>
          </UCard>

          <UCard>
            <template #header>
              <h3 class="text-lg font-semibold">Total Citations</h3>
            </template>

            <div class="text-3xl font-bold text-pink-500">
              {{
                userData?.reduce(
                  (sum: number, item: any) =>
                    sum + item.dataset.citations.length,
                  0,
                )
              }}
            </div>

            <p class="mt-2 text-sm">Total citations for the user's datasets</p>
          </UCard>
        </div>

        <USeparator />

        <div class="flex items-center justify-between">
          <h2 class="text-2xl font-bold">Datasets</h2>

          <UButton
            v-if="loggedIn && user?.id === userid"
            icon="i-heroicons-plus-20-solid"
            label="Add a dataset"
            :to="`/users/${userid}/add`"
          />
        </div>

        <div v-if="userData" class="flex flex-col gap-4">
          <UCard v-for="item in userData" :key="item.datasetId">
            <template #header>
              <div class="flex items-start justify-between gap-2">
                <NuxtLink
                  :to="`/datasets/${item.datasetId}`"
                  target="_blank"
                  class="group flex-1"
                >
                  <h3
                    class="group-hover:text-primary-600 dark:group-hover:text-primary-400 text-lg font-semibold transition-colors"
                  >
                    {{ item.dataset.title || "No title available" }}
                  </h3>
                </NuxtLink>

                <UBadge
                  color="primary"
                  variant="subtle"
                  :label="`${item.dataset.citations.length} Citation${item.dataset.citations.length !== 1 ? 's' : ''}`"
                  icon="i-heroicons-book-open-20-solid"
                />
              </div>
            </template>

            <div class="space-y-3">
              <MarkdownRenderer
                :content="
                  item.dataset.description || 'No description available'
                "
                truncate
              />

              <div>
                <p class="mb-1 text-sm font-medium">Authors</p>

                <div
                  v-if="
                    item.dataset.datasetAuthors &&
                    Array.isArray(item.dataset.datasetAuthors) &&
                    item.dataset.datasetAuthors.length > 0
                  "
                  class="flex flex-wrap gap-1 text-sm"
                >
                  <template
                    v-for="(author, index) in item.dataset
                      .datasetAuthors as Author[]"
                    :key="index"
                  >
                    <UTooltip :text="getAuthorTooltipText(author)">
                      <span
                        class="hover:text-primary-600 dark:hover:text-primary-400 cursor-help underline decoration-dotted underline-offset-2 transition-colors"
                      >
                        {{ `${author.name || ""}`.trim() }}
                      </span>
                    </UTooltip>

                    <span v-if="index < item.dataset.datasetAuthors.length - 1">
                      ,
                    </span>
                  </template>
                </div>

                <p v-else class="text-sm text-gray-500 dark:text-gray-400">
                  No authors available
                </p>
              </div>

              <div
                class="flex flex-wrap items-center gap-2 border-t border-gray-200 pt-2 dark:border-gray-700"
              >
                <UTooltip
                  :text="`Published on ${$dayjs(item.dataset.publishedAt)
                    .format('DD MMMM YYYY HH:mm:ss')
                    .toString()}`"
                >
                  <UBadge
                    color="neutral"
                    variant="subtle"
                    class="cursor-help"
                    :label="
                      $dayjs(item.dataset.publishedAt).format('MMMM YYYY ')
                    "
                    icon="i-heroicons-calendar-20-solid"
                  />
                </UTooltip>

                <a
                  v-if="(item.dataset as any).identifierType === 'doi'"
                  :href="`https://doi.org/${(item.dataset as any).identifier}`"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="inline-block"
                >
                  <UBadge
                    color="success"
                    variant="subtle"
                    :label="(item.dataset as any).identifier"
                    icon="i-heroicons-link-20-solid"
                    class="cursor-pointer"
                  />
                </a>

                <UBadge
                  v-if="(item.dataset as any).version"
                  color="info"
                  variant="subtle"
                  :label="(item.dataset as any).version"
                  icon="i-heroicons-tag-20-solid"
                  class="cursor-pointer"
                />
              </div>
            </div>
          </UCard>
        </div>
      </UPageBody>
    </UPage>
  </UContainer>
</template>

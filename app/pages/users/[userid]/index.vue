<script setup lang="ts">
import type { Author } from "#shared/types/dataset";
const { user, loggedIn } = useUserSession();

useSeoMeta({
  title: "User Profile",
});

const route = useRoute();
const toast = useToast();

const userid = (route.params.userid as string).toUpperCase();

const isCurrentUser = computed(() => {
  return loggedIn.value && user.value?.id === userid;
});

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

// Generate avatar URL from dicebear using userid as seed
const avatarUrl = computed(() => {
  return `https://api.dicebear.com/9.x/thumbs/svg?seed=${userid}`;
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

const copyToClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text);
    toast.add({
      title: "Copied to clipboard",
      description: text,
      icon: "i-heroicons-check-circle-20-solid",
      color: "success",
    });
  } catch {
    toast.add({
      title: "Failed to copy",
      description: "Could not copy to clipboard",
      icon: "i-heroicons-x-circle-20-solid",
      color: "error",
    });
  }
};

const removeDataset = async (datasetId: number) => {
  try {
    await $fetch("/api/user/datasets/", {
      method: "DELETE",
      body: {
        datasetId,
      },
    });

    toast.add({
      title: "Dataset removed successfully",
      description: "The dataset has been removed from your collection",
      icon: "i-heroicons-check-circle-20-solid",
      color: "success",
    });

    // Reload the page
    window.location.reload();
  } catch (error: unknown) {
    const errorMessage =
      (error as { data?: { statusMessage?: string } })?.data?.statusMessage ||
      "Failed to remove dataset";
    toast.add({
      title: "Error removing dataset",
      description: errorMessage,
      icon: "material-symbols:error",
      color: "error",
    });
  }
};
</script>

<template>
  <UContainer>
    <UPage>
      <UPageHeader
        :ui="{
          container: 'flex w-full flex-1',
        }"
      >
        <template #title>
          <div class="flex w-full items-center gap-2">
            <UAvatar :src="avatarUrl" :alt="fullName" size="3xl" />

            <div class="flex flex-col">
              <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {{ userProfile?.username || "Unknown User" }}
              </h1>

              <p
                class="flex items-center text-sm font-medium text-gray-500 dark:text-gray-400"
              >
                {{ "Unknown Affiliation" }}
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

          <UCard>
            <template #header>
              <h3 class="text-lg font-semibold">S-Index Score</h3>
            </template>

            <div class="text-3xl font-bold text-pink-600">
              {{
                userData
                  ?.reduce(
                    (sum: number, item: any) =>
                      sum + item.dataset.dindices?.[0]?.score || 0,
                    0,
                  )
                  .toFixed(0)
              }}
            </div>

            <p class="mt-2 text-sm">S-Index score for the user's datasets</p>
          </UCard>
        </div>

        <USeparator />

        <div class="flex items-center justify-between">
          <h2 class="text-2xl font-bold">Datasets</h2>

          <UButton
            v-if="isCurrentUser"
            icon="i-heroicons-plus-20-solid"
            label="Add a dataset"
            :to="`/users/${userid}/add`"
          />
        </div>

        <div v-if="userData" class="flex flex-col gap-4">
          <UCard v-for="item in userData" :key="item.datasetId">
            <template #header>
              <div class="flex items-start justify-between gap-2">
                <h3
                  class="group-hover:text-primary-600 dark:group-hover:text-primary-400 text-lg font-semibold transition-colors"
                >
                  {{ item.dataset.title || "No title available" }}
                </h3>

                <div class="flex items-center gap-2">
                  <NuxtLink
                    :to="`/datasets/${item.datasetId}`"
                    target="_blank"
                    class="group flex-1"
                  >
                    <UTooltip text="View Dataset">
                      <UButton
                        color="primary"
                        variant="solid"
                        size="sm"
                        icon="i-heroicons-arrow-top-right-on-square-20-solid"
                      />
                    </UTooltip>
                  </NuxtLink>

                  <UPopover v-if="isCurrentUser" arrow>
                    <UTooltip text="Remove Dataset">
                      <UButton
                        color="error"
                        variant="solid"
                        size="sm"
                        icon="i-heroicons-trash-20-solid"
                      />
                    </UTooltip>

                    <template #content>
                      <div class="space-y-3 p-4">
                        <p class="text-sm font-medium">
                          Are you sure you want to remove this dataset?
                        </p>

                        <p class="text-xs text-gray-500 dark:text-gray-400">
                          This dataset will be removed from your collection.
                        </p>

                        <div class="flex justify-end gap-2">
                          <UButton
                            color="neutral"
                            variant="ghost"
                            size="sm"
                            label="Cancel"
                          />

                          <UButton
                            color="error"
                            variant="solid"
                            size="sm"
                            label="Remove"
                            icon="i-heroicons-trash-20-solid"
                            @click="removeDataset(item.datasetId)"
                          />
                        </div>
                      </div>
                    </template>
                  </UPopover>
                </div>
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

                <ul
                  v-if="
                    item.dataset.datasetAuthors &&
                    Array.isArray(item.dataset.datasetAuthors) &&
                    item.dataset.datasetAuthors.length > 0
                  "
                  class="flex list-none flex-wrap gap-1 text-sm"
                >
                  <li
                    v-for="(author, index) in item.dataset
                      .datasetAuthors as Author[]"
                    :key="index"
                  >
                    <UTooltip :text="getAuthorTooltipText(author)">
                      <span
                        class="hover:text-primary-600 dark:hover:text-primary-400 cursor-help underline decoration-dotted underline-offset-2 transition-colors"
                      >
                        {{ `${author.name || ""}`.trim() }}</span
                      >
                    </UTooltip>

                    <span v-if="index < item.dataset.datasetAuthors.length - 1"
                      >;
                    </span>
                  </li>
                </ul>

                <p v-else class="text-sm text-gray-500 dark:text-gray-400">
                  No authors available
                </p>
              </div>

              <div
                class="flex flex-wrap items-center justify-between gap-2 border-t border-gray-200 pt-3 dark:border-gray-700"
              >
                <div class="flex flex-wrap gap-2">
                  <UBadge
                    color="neutral"
                    size="sm"
                    variant="subtle"
                    :label="`${item.dataset.citations.length} Citation${item.dataset.citations.length !== 1 ? 's' : ''}`"
                    icon="i-heroicons-book-open-20-solid"
                  />

                  <UBadge
                    color="neutral"
                    size="sm"
                    variant="subtle"
                    :label="`${item.dataset.mentions.length} Mention${item.dataset.mentions.length !== 1 ? 's' : ''}`"
                    icon="i-heroicons-chat-bubble-bottom-center-text-20-solid"
                  />

                  <UTooltip
                    text="This score is calculated using the F-UJI automated FAIR data assessment tool"
                  >
                    <UBadge
                      color="neutral"
                      size="sm"
                      variant="subtle"
                      class="cursor-help"
                      :label="
                        item.dataset.fujiScore?.score
                          ? `${(item.dataset.fujiScore?.score || 0).toFixed(0)}% FAIR`
                          : 'FAIR Score processing...'
                      "
                      :icon="
                        item.dataset.fujiScore?.score
                          ? 'i-heroicons-star-20-solid'
                          : 'svg-spinners:90-ring'
                      "
                    />
                  </UTooltip>

                  <UBadge
                    color="neutral"
                    size="sm"
                    variant="subtle"
                    :label="
                      item.dataset.dindices?.[0]?.score
                        ? `${(item.dataset.dindices?.[0]?.score || 0).toFixed(2)} D-Index Score`
                        : 'D-Index Score processing...'
                    "
                    :icon="
                      item.dataset.dindices?.[0]?.score
                        ? 'i-heroicons-star-20-solid'
                        : 'svg-spinners:90-ring'
                    "
                  />
                </div>

                <div class="flex flex-wrap gap-2">
                  <UTooltip :text="`Version ${item.dataset.version}`">
                    <UBadge
                      v-if="item.dataset.version"
                      color="neutral"
                      variant="subtle"
                      :label="item.dataset.version"
                      icon="i-heroicons-tag-20-solid"
                      class="cursor-help"
                    />
                  </UTooltip>

                  <UTooltip text="Click to copy identifier">
                    <UBadge
                      color="neutral"
                      variant="outline"
                      :label="item.dataset.identifier"
                      icon="i-heroicons-link-20-solid"
                      class="cursor-pointer"
                      @click="copyToClipboard(item.dataset.identifier)"
                    />
                  </UTooltip>

                  <UTooltip
                    :text="`Published on ${$dayjs(item.dataset.publishedAt)
                      .format('DD MMMM YYYY HH:mm:ss')
                      .toString()}`"
                  >
                    <UBadge
                      color="info"
                      variant="subtle"
                      class="cursor-help"
                      :label="
                        $dayjs(item.dataset.publishedAt).format('MMMM YYYY ')
                      "
                      icon="i-heroicons-calendar-20-solid"
                    />
                  </UTooltip>
                </div>
              </div>
            </div>
          </UCard>
        </div>
      </UPageBody>
    </UPage>
  </UContainer>
</template>

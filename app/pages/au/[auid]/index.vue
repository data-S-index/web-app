<script setup lang="ts">
const route = useRoute();
const toast = useToast();

const auid = computed(() => (route.params.auid as string) ?? "");

const {
  data: user,
  error,
  pending,
} = await useFetch(() => `/api/au/${auid.value}`, {
  key: () => `au-${auid.value}`,
});

if (error.value) {
  toast.add({
    title: "Error loading user",
    description: error.value.data?.statusMessage,
    icon: "material-symbols:error",
    color: "error",
  });
}

useSeoMeta({
  title: () => (user.value ? `${user.value.name} | User` : "User"),
  description: () =>
    user.value
      ? `View automated user: ${user.value.name}`
      : "Automated user profile",
});

const avatarUrl = computed(() => {
  const seed = user.value?.id || user.value?.name || "user";

  return `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(seed)}`;
});

const displayName = computed(
  () => user.value?.name || user.value?.id || "User",
);
</script>

<template>
  <UContainer>
    <UPage>
      <UPageHeader
        v-if="user"
        :ui="{
          container: 'flex w-full flex-1',
        }"
      >
        <template #title>
          <div class="flex w-full items-center gap-2">
            <UAvatar :src="avatarUrl" :alt="displayName" size="3xl" />

            <div class="flex flex-col">
              <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {{ displayName }}
              </h1>

              <p
                class="flex items-center text-sm font-medium text-gray-500 dark:text-gray-400"
              >
                Automated User · {{ user.id }}
              </p>
            </div>
          </div>
        </template>

        <template #links />
      </UPageHeader>

      <UPageBody v-if="user">
        <div class="space-y-6">
          <div v-if="user.nameIdentifiers?.length" class="space-y-2">
            <h2 class="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Name identifiers
            </h2>

            <ul
              class="list-inside list-disc space-y-1 text-sm text-gray-600 dark:text-gray-400"
            >
              <li v-for="(id, i) in user.nameIdentifiers" :key="i">
                {{ id }}
              </li>
            </ul>
          </div>

          <div v-if="user.affiliations?.length" class="space-y-2">
            <h2 class="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Affiliations
            </h2>

            <ul
              class="list-inside list-disc space-y-1 text-sm text-gray-600 dark:text-gray-400"
            >
              <li v-for="(aff, i) in user.affiliations" :key="i">
                {{ aff }}
              </li>
            </ul>
          </div>

          <p
            v-if="!user.nameIdentifiers?.length && !user.affiliations?.length"
            class="text-gray-600 dark:text-gray-400"
          >
            User profile. More details and metrics can be added here.
          </p>
        </div>
      </UPageBody>

      <UPageBody v-else-if="error">
        <div class="py-12 text-center">
          <p class="text-base text-gray-500 dark:text-gray-400">
            User not found or failed to load.
          </p>

          <UButton to="/search/au" color="primary" variant="soft" class="mt-4">
            Search users
          </UButton>
        </div>
      </UPageBody>

      <UPageBody v-else-if="pending">
        <div class="py-12 text-center">
          <Icon
            name="i-heroicons-arrow-path-20-solid"
            class="text-primary-500 mx-auto h-10 w-10 animate-spin"
          />

          <p class="mt-2 text-base text-gray-500 dark:text-gray-400">
            Loading user...
          </p>
        </div>
      </UPageBody>
    </UPage>
  </UContainer>
</template>

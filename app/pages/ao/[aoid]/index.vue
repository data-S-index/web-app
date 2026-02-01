<script setup lang="ts">
const route = useRoute();
const toast = useToast();

const aoid = computed(() => (route.params.aoid as string) ?? "");

const {
  data: org,
  error,
  pending,
} = await useFetch(() => `/api/ao/${aoid.value}`, {
  key: () => `ao-${aoid.value}`,
});

if (error.value) {
  toast.add({
    title: "Error loading organization",
    description: error.value.data?.statusMessage,
    icon: "material-symbols:error",
    color: "error",
  });
}

useSeoMeta({
  title: () =>
    org.value ? `${org.value.name} | Organization` : "Organization",
  description: () =>
    org.value
      ? `View automated organization: ${org.value.name}`
      : "Automated organization profile",
});

const avatarUrl = computed(() => {
  const seed = org.value?.id || org.value?.name || "org";

  return `https://api.dicebear.com/9.x/shapes/svg?seed=${encodeURIComponent(seed)}`;
});

const displayName = computed(
  () => org.value?.name || org.value?.id || "Organization",
);
</script>

<template>
  <UContainer>
    <UPage>
      <UPageHeader
        v-if="org"
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
                Automated Organization · {{ org.id }}
              </p>
            </div>
          </div>
        </template>

        <template #links />
      </UPageHeader>

      <UPageBody v-if="org">
        <div class="space-y-6">
          <p class="text-gray-600 dark:text-gray-400">
            Organization profile. More details and metrics can be added here.
          </p>
        </div>
      </UPageBody>

      <UPageBody v-else-if="error">
        <div class="py-12 text-center">
          <p class="text-base text-gray-500 dark:text-gray-400">
            Organization not found or failed to load.
          </p>

          <UButton to="/search/ao" color="primary" variant="soft" class="mt-4">
            Search organizations
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
            Loading organization...
          </p>
        </div>
      </UPageBody>
    </UPage>
  </UContainer>
</template>

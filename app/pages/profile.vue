<script setup lang="ts">
import { z } from "zod";
import type { FormSubmitEvent } from "#ui/types";

definePageMeta({
  middleware: ["auth"],
});

useSeoMeta({
  title: "Profile",
  description: "Manage your Scholar Data profile and preferences.",
});

defineOgImageComponent("Pergel", {
  headline: "Your Profile",
});

const toast = useToast();
const loading = ref(false);

const { data: userData, refresh: refreshUser } = await useFetch("/api/user");

const schema = z.object({
  givenName: z.string(),
  familyName: z.string(),
  additionalNamesStr: z.string(),
  affiliation: z.string(),
  homePage: z.string(),
  areasOfInterestStr: z.string(),
});

type Schema = z.output<typeof schema>;

const state = reactive<Schema>({
  givenName: "",
  familyName: "",
  additionalNamesStr: "",
  affiliation: "",
  homePage: "",
  areasOfInterestStr: "",
});

watch(
  () => userData.value,
  (u) => {
    if (u) {
      state.givenName = u.givenName ?? "";
      state.familyName = u.familyName ?? "";
      state.additionalNamesStr = (u.additionalNames ?? []).join(", ");
      state.affiliation = u.affiliation ?? "";
      state.homePage = u.homePage ?? "";
      state.areasOfInterestStr = (u.areasOfInterest ?? []).join(", ");
    }
  },
  { immediate: true },
);

function parseCommaList(s: string): string[] {
  return s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

async function onSubmit(event: FormSubmitEvent<Schema>) {
  const body = {
    givenName: event.data.givenName,
    familyName: event.data.familyName,
    additionalNames: parseCommaList(event.data.additionalNamesStr),
    affiliation: event.data.affiliation || null,
    homePage: event.data.homePage || "",
    areasOfInterest: parseCommaList(event.data.areasOfInterestStr),
  };

  loading.value = true;
  try {
    await $fetch("/api/user", {
      method: "PATCH",
      body,
    });
    await refreshUser();
    toast.add({
      title: "Profile updated",
      color: "success",
      icon: "i-heroicons-check-circle",
    });
  } catch (err: unknown) {
    const message =
      err && typeof err === "object" && "data" in err
        ? (err as { data?: { statusMessage?: string } }).data?.statusMessage
        : "Failed to update profile";
    toast.add({
      title: "Update failed",
      description: message,
      color: "error",
      icon: "i-heroicons-exclamation-circle",
    });
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
    <UContainer>
      <UPage>
        <UPageHeader
          :ui="{
            container: 'flex w-full flex-1',
          }"
        >
          <template #title>
            <div class="flex min-w-full gap-4">
              <UAvatar
                :src="`https://api.dicebear.com/9.x/thumbs/svg?seed=${userData?.id}`"
                alt="User avatar"
                size="3xl"
                class="squircle rounded-none"
              />

              <div class="flex w-full min-w-0 flex-1 flex-col gap-1">
                <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {{
                    userData?.givenName || userData?.familyName
                      ? `${userData?.givenName} ${userData?.familyName}`
                      : userData?.username
                  }}
                </h1>

                <div
                  class="flex flex-wrap items-center gap-x-5 text-sm text-gray-500 dark:text-gray-400"
                >
                  <NuxtLink
                    v-if="userData?.id"
                    :to="`/users/${userData.id}`"
                    class="text-primary-500 inline-block text-sm hover:underline"
                  >
                    View public profile →
                  </NuxtLink>
                </div>
              </div>
            </div>
          </template>
        </UPageHeader>

        <UPageBody>
          <div class="space-y-6">
            <!-- Edit Profile Form -->
            <UCard>
              <h2
                class="mb-6 text-xl font-semibold text-gray-900 dark:text-white"
              >
                Edit profile
              </h2>

              <UForm
                :schema="schema"
                :state="state"
                class="space-y-6"
                @submit="onSubmit"
              >
                <div class="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <UFormField label="First name" name="givenName">
                    <UInput
                      v-model="state.givenName"
                      type="text"
                      placeholder="e.g. Jane"
                    />
                  </UFormField>

                  <UFormField label="Last name" name="familyName">
                    <UInput
                      v-model="state.familyName"
                      type="text"
                      placeholder="e.g. Smith"
                    />
                  </UFormField>
                </div>

                <UFormField
                  label="Additional names"
                  name="additionalNamesStr"
                  description="Comma-separated (e.g. middle name, nickname)"
                >
                  <UInput
                    v-model="state.additionalNamesStr"
                    type="text"
                    placeholder="e.g. Marie, MJ"
                  />
                </UFormField>

                <UFormField
                  label="Affiliation"
                  name="affiliation"
                  description="Institution or organization"
                >
                  <UInput
                    v-model="state.affiliation"
                    type="text"
                    placeholder="e.g. University of Example"
                  />
                </UFormField>

                <UFormField
                  label="Home page"
                  name="homePage"
                  description="Personal or lab website URL"
                >
                  <UInput
                    v-model="state.homePage"
                    type="url"
                    placeholder="https://"
                  />
                </UFormField>

                <UFormField
                  label="Areas of interest"
                  name="areasOfInterestStr"
                  description="Comma-separated (e.g. machine learning, open science)"
                >
                  <UInput
                    v-model="state.areasOfInterestStr"
                    type="text"
                    placeholder="e.g. machine learning, open science"
                  />
                </UFormField>

                <div class="flex items-center gap-4">
                  <UButton type="submit" :loading="loading" color="primary">
                    Save changes
                  </UButton>

                  <p class="text-sm text-gray-500 dark:text-gray-400">
                    Last updated:
                    {{
                      userData?.updated
                        ? new Date(userData.updated).toLocaleString()
                        : "—"
                    }}
                  </p>
                </div>
              </UForm>
            </UCard>

            <!-- Account info (read-only) -->
            <UCard>
              <h2
                class="mb-4 text-lg font-semibold text-gray-900 dark:text-white"
              >
                Account
              </h2>

              <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label
                    class="block text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    Username
                  </label>

                  <p class="mt-1 text-gray-900 dark:text-white">
                    {{ userData?.username }}
                  </p>
                </div>

                <div>
                  <label
                    class="block text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    Account created
                  </label>

                  <p class="mt-1 text-gray-900 dark:text-white">
                    {{
                      userData?.created
                        ? new Date(userData.created).toLocaleDateString()
                        : "—"
                    }}
                  </p>
                </div>
              </div>
            </UCard>

            <!-- Actions -->
            <UCard>
              <h2
                class="mb-4 text-lg font-semibold text-gray-900 dark:text-white"
              >
                Account actions
              </h2>

              <div class="flex flex-wrap gap-4">
                <UButton
                  color="primary"
                  variant="solid"
                  label="Change password"
                  icon="i-heroicons-key"
                />

                <UButton
                  color="error"
                  variant="soft"
                  label="Delete account"
                  icon="i-heroicons-trash"
                />
              </div>
            </UCard>
          </div>
        </UPageBody>
      </UPage>
    </UContainer>
  </div>
</template>

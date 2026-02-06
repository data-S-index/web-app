<script setup lang="ts">
import { z } from "zod";
import type { FormSubmitEvent } from "#ui/types";
import { generateUsername } from "unique-username-generator";

const config = useRuntimeConfig();
const { loggedIn, user } = useUserSession();

if (loggedIn.value) {
  const userId = user.value?.id;
  if (userId) {
    await navigateTo(`/users/${userId}`);
  } else {
    await navigateTo("/");
  }
}

definePageMeta({
  layout: "auth",
});

useSeoMeta({
  title: "Sign Up",
  description: "Create your Scholar Data account and get credit for your data.",
});

defineOgImageComponent("Pergel", {
  headline: "Join Scholar Data",
});

const toast = useToast();
const loading = ref(false);

const showPassword = ref(false);

const schema = z.object({
  username: z.string().min(3, "Must be at least 3 characters"),
  password: z.string().min(8, "Must be at least 8 characters"),
});

type Schema = z.output<typeof schema>;

const state = reactive({
  username: "",
  password: "",
});

async function onSubmit(event: FormSubmitEvent<Schema>) {
  const body = {
    username: event.data.username,
    password: event.data.password,
  };

  loading.value = true;

  await $fetch("/api/auth/signup", {
    body,
    method: "POST",
  })
    .then(() => {
      toast.add({
        title: "Account created successfully",
        color: "info",
        description: "You can now log in to your account.",
        icon: "material-symbols:mail-outline",
      });

      navigateTo("/login");
    })
    .catch((error) => {
      console.error(error.data);
      toast.add({
        title: "Registration failed",
        color: "error",
        description: error.data.statusMessage,
        icon: "material-symbols:error",
      });
    })
    .finally(() => {
      loading.value = false;
    });
}

onMounted(() => {
  state.username = generateUsername();
  state.password = "12345678";
});
</script>

<template>
  <UCard class="w-full max-w-sm bg-white/75 backdrop-blur dark:bg-white/5">
    <div class="w-full max-w-sm p-1">
      <div class="flex flex-col items-center justify-center">
        <h2 class="my-1 text-2xl font-bold">Create an account</h2>

        <p class="font-medium text-slate-600">
          Already have an account?
          <NuxtLink to="/login" class="text-primary-500 font-medium">
            Login
          </NuxtLink>
        </p>
      </div>

      <UForm
        :schema="schema"
        :state="state"
        class="mt-6 space-y-4"
        @submit="onSubmit"
      >
        <UAlert
          color="warning"
          variant="subtle"
          icon="i-heroicons-exclamation-triangle-20-solid"
          title="Accounts generated on this platform are temporary and may be deleted
          at any time. All interactions are anonymous."
        />

        <UFormField
          label="Username"
          name="username"
          description="Your username was automatically generated."
        >
          <UInput v-model="state.username" type="text" />
        </UFormField>

        <UFormField label="Password" name="password">
          <UInput
            v-model="state.password"
            :type="showPassword ? 'text' : 'password'"
          >
            <template #trailing>
              <Icon
                name="solar:eye-linear"
                size="16"
                class="cursor-pointer text-slate-400 transition-colors hover:text-slate-600"
                @mousedown="showPassword = true"
                @mouseup="showPassword = false"
              />
            </template>
          </UInput>
        </UFormField>

        <UButton
          type="submit"
          class="flex w-full justify-center"
          :loading="loading"
        >
          Create account
        </UButton>
      </UForm>
    </div>

    <!-- <template #footer>
      <p class="text-center text-sm">
        By signing up, you agree to our
        <NuxtLink to="/terms" class="text-primary-500 text-sm font-medium">
          Terms of Service</NuxtLink
        >.
      </p>
    </template> -->
  </UCard>
</template>

<script setup lang="ts">
import { z } from "zod";
import type { FormSubmitEvent } from "#ui/types";
import { generateUsername } from "unique-username-generator";

const config = useRuntimeConfig();
const { environment } = config.public;

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
  temporary: z.boolean().default(false),
  login: z.string(),
  password: z.string().min(8, "Must be at least 8 characters"),
  givenName: z.string().optional(),
  familyName: z.string().optional(),
  affiliation: z.string().optional(),
  orcid: z.string().optional(),
});

type Schema = z.output<typeof schema>;

const state = reactive({
  temporary: false,
  login: "",
  password: "",
  givenName: "",
  familyName: "",
  affiliation: "",
  orcid: "",
});

async function onSubmit(event: FormSubmitEvent<Schema>) {
  // if not a temporary account, validate email format
  if (!event.data.temporary) {
    const l = z.email().safeParse(event.data.login);

    if (!l.success) {
      toast.add({
        title: "Invalid email address",
        color: "error",
        description: "Please enter a valid email address.",
        icon: "material-symbols:error",
      });

      return;
    }
  } else {
    // if temporary account, ensure login is not empty
    if (event.data.login.trim() === "" || event.data.login.length < 3) {
      toast.add({
        title: "Invalid username",
        color: "error",
        description: "Username must be at least 3 characters.",
        icon: "material-symbols:error",
      });

      return;
    }
  }

  const body = {
    temporary: event.data.temporary,
    login: event.data.login,
    password: event.data.password,
    givenName: event.data.givenName,
    familyName: event.data.familyName,
    affiliation: event.data.affiliation,
    orcid: event.data.orcid,
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

      navigateTo({ path: "/login", query: { login: event.data.login } });
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

const autoGenerateUsername = () => {
  if (state.temporary) {
    state.login = generateUsername();
    state.password = environment === "development" ? "12345678" : "";
  }
};
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
          v-if="state.temporary"
          color="warning"
          variant="subtle"
          icon="i-heroicons-exclamation-triangle-20-solid"
          title="Accounts generated via this feature are temporary and may be deleted
          at any time. All interactions are anonymous."
        />

        <UFormField
          :label="state.temporary ? 'Username' : 'Email'"
          :name="state.temporary ? 'username' : 'email'"
          :description="
            state.temporary
              ? 'Your username was automatically generated.'
              : 'Your email address will be used to log in.'
          "
          required
        >
          <div class="flex items-center gap-2">
            <UInput
              v-model="state.login"
              type="text"
              :placeholder="
                state.temporary ? 'myusername' : 'hello@scholardata.org'
              "
            />

            <UTooltip
              v-if="state.temporary"
              text="Autogenerate a random username"
            >
              <UButton
                type="button"
                variant="outline"
                size="sm"
                icon="streamline-flex:magic-wand-1-solid"
                @click="autoGenerateUsername"
              />
            </UTooltip>
          </div>
        </UFormField>

        <UFormField label="Password" name="password" required>
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

        <div v-show="!state.temporary" class="flex items-center gap-4">
          <UFormField label="Given Name" name="givenName">
            <UInput
              v-model="state.givenName"
              type="text"
              placeholder="Giselle"
            />
          </UFormField>

          <UFormField label="Family Name" name="familyName">
            <UInput
              v-model="state.familyName"
              type="text"
              placeholder="Garcia"
            />
          </UFormField>
        </div>

        <UFormField
          v-show="!state.temporary"
          label="Affiliation"
          name="affiliation"
        >
          <UInput
            v-model="state.affiliation"
            type="text"
            placeholder="University of California, Berkeley"
          />
        </UFormField>

        <UFormField v-show="!state.temporary" label="ORCID" name="orcid">
          <UInput
            v-model="state.orcid"
            type="text"
            placeholder="0000-0002-1825-0097"
          />
        </UFormField>

        <USwitch
          v-model="state.temporary"
          label="Create a temporary account (no email required)"
        />

        <UButton
          type="submit"
          class="flex w-full justify-center"
          :loading="loading"
          :disabled="loading || !state.login || !state.password"
        >
          Create account
        </UButton>
      </UForm>
    </div>

    <template #footer>
      <p class="text-center text-sm">
        By signing up, you agree to our
        <NuxtLink to="/terms" class="text-primary-500 text-sm font-medium">
          Terms of Service</NuxtLink
        >.
      </p>
    </template>
  </UCard>
</template>

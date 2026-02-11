<script setup lang="ts">
import type { NavigationMenuItem } from "@nuxt/ui";

const { clear, user, loggedIn: loggedInSession } = useUserSession();
const route = useRoute();

const logout = async () => {
  clear();
  await navigateTo("/login");
};

const headerItems = computed<NavigationMenuItem[]>(() => [
  {
    label: "My Profile",
    to:
      loggedInSession.value && user.value?.id
        ? `/users/${user.value?.id}`
        : "/login",
    active: route.path.startsWith(`/users/${user.value?.id}`),
  },
  {
    label: "Browse Profiles",
    active:
      route.path.startsWith("/search/au") ||
      route.path.startsWith("/search/ao"),
    to: "/search/au",
    children: [
      {
        label: "Users",
        to: "/search/au",
        icon: "mingcute:user-search-fill",
        description: "Find users by name or identifiers",
        active: route.path.startsWith("/search/au"),
      },
      {
        label: "Organizations",
        to: "/search/ao",
        icon: "gis:search-poi",
        description: "Find organizations by name",
        active: route.path.startsWith("/search/ao"),
      },
    ],
  },
  {
    label: "Browse Datasets",
    active: route.path.startsWith("/search/datasets"),
    to: "/search/datasets",
  },
  {
    label: "Evaluate Datasets",
    to: "/evaluate",
    active: route.path.startsWith("/evaluate"),
  },
  {
    label: "Integrate",
    to: "/integrations",
    active: route.path.startsWith("/integrations"),
  },
  {
    label: "Platform Metrics",
    to: "/metrics",
    active: route.path.startsWith("/metrics"),
  },
]);

const footerMiddleItems: NavigationMenuItem[] = [
  {
    label: "Made with ♥ by the S-Index Team",
  },
];

const footerRightItems: NavigationMenuItem[] = [
  {
    label: "GitHub",
    to: "https://github.com/data-S-index/web-app",
    target: "_blank",
    icon: "i-simple-icons-github",
  },
];
</script>

<template>
  <div class="relative">
    <UiAuroraBackground class="absolute inset-0 -z-10 h-full" />

    <UHeader>
      <template #title>
        <NuxtLink to="/" class="flex text-2xl font-bold">
          Scholar Data
        </NuxtLink>
      </template>

      <UNavigationMenu :items="headerItems" />

      <template #right>
        <UColorModeButton />

        <AuthState v-slot="{ loggedIn }">
          <div v-if="loggedIn" class="flex items-center justify-center gap-3">
            <NuxtLink to="/profile">
              <UTooltip text="View your account settings">
                <UAvatar
                  :src="`https://api.dicebear.com/9.x/thumbs/svg?seed=${user?.id}`"
                  :alt="user?.username"
                  class="squircle cursor-pointer rounded-none"
                />
              </UTooltip>
            </NuxtLink>

            <UButton color="neutral" variant="outline" @click="logout">
              Logout
            </UButton>
          </div>

          <div v-else class="flex items-center justify-center gap-3">
            <UButton to="/login" variant="outline"> Sign in </UButton>

            <UButton to="/signup">
              <template #trailing>
                <Icon name="i-heroicons-arrow-right-20-solid" size="20" />
              </template>
              Sign up
            </UButton>
          </div>
        </AuthState>
      </template>
    </UHeader>

    <UMain>
      <slot />
    </UMain>

    <UFooter>
      <template #left>
        <p class="text-muted text-sm">
          Copyright © {{ new Date().getFullYear() }}
        </p>
      </template>

      <UNavigationMenu
        :items="footerMiddleItems"
        variant="link"
        color="primary"
      />

      <template #right>
        <UColorModeButton />

        <UNavigationMenu
          :items="footerRightItems"
          variant="link"
          color="primary"
        />
      </template>
    </UFooter>
  </div>
</template>

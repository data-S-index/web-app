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
    label: "S-Index Metrics",
    to: "/metrics",
    active: route.path.startsWith("/metrics"),
  },
  {
    label: "Search",
    active: route.path.startsWith("/search"),
    children: [
      {
        label: "Datasets",
        to: "/search/datasets",
        icon: "hugeicons:file-search",
        description: "Find datasets by title, identifier, or author",
        active: route.path.startsWith("/search/datasets"),
      },
      {
        label: "Users",
        to: "/search/au",
        icon: "mingcute:user-search-fill",
        description: "Find users by name, identifiers, or affiliations",
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
    label: "Resolver",
    to: "/resolve",
    active: route.path.startsWith("/resolve"),
  },
  {
    label: "GitHub",
    to: "https://github.com/data-S-index/web-app",
    target: "_blank",
  },
]);

const footerItems: NavigationMenuItem[] = [
  {
    label: "Made with ♥ by the S-Index Team",
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
          <UButton
            v-if="loggedIn"
            color="neutral"
            variant="outline"
            @click="logout"
          >
            Logout
          </UButton>

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

      <UNavigationMenu :items="footerItems" variant="link" color="primary" />

      <template #right>
        <UColorModeButton />

        <UButton
          icon="i-simple-icons-github"
          color="neutral"
          variant="ghost"
          to="https://github.com/data-S-index/web-app"
          target="_blank"
          aria-label="GitHub"
        />
      </template>
    </UFooter>
  </div>
</template>

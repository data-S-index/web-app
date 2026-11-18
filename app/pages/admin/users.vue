<script setup lang="ts">
import { definePageMeta } from "#app/composables/pages";
import { useSeoMeta, useFetch } from "#app";
import { computed } from "vue";
import {
  UPageHeader,
  UTable,
  UCard,
  UPageBody,
  UPage,
  UContainer,
} from "#components";

definePageMeta({
  middleware: ["admin"],
});

useSeoMeta({
  title: "Users",
  robots: "noindex, nofollow",
});

interface AdminUser {
  id: string;
  login: string;
  givenName: string;
  familyName: string;
  created: string;
}

const { data: users, status } = await useFetch<AdminUser[]>("/api/admin/users");

const columns = [
  { accessorKey: "name", header: "Name" },
  { accessorKey: "login", header: "Email" },
  { accessorKey: "created", header: "Joined" },
];

const rows = computed(
  () =>
    users.value?.map((u) => ({
      name: `${u.givenName} ${u.familyName}`.trim() || "-",
      login: u.login,
      created: new Date(u.created).toLocaleDateString(),
    })) ?? [],
);
</script>

<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
    <UContainer>
      <UPage>
        <UPageHeader
          title="Users"
          :description="`${users?.length ?? 0} registered users`"
        />

        <UPageBody>
          <UCard>
            <UTable
              :data="rows"
              :columns="columns"
              :loading="status === 'pending'"
            />
          </UCard>
        </UPageBody>
      </UPage>
    </UContainer>
  </div>
</template>

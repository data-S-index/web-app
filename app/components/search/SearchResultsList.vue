<script setup lang="ts">
const formatter = Intl.NumberFormat("en", { notation: "compact" });

type UserResult = {
  id: number;
  name: string;
  nameIdentifiers?: string[];
  affiliations?: string[];
  sIndex: number;
  datasetCount: number;
};

type OrgResult = {
  id: number;
  name: string;
  datasetCount: number;
  sIndex: number;
};

defineProps<{
  results: (UserResult | OrgResult)[];
  type: "user" | "org";
}>();

const getAvatarUrl = (item: UserResult | OrgResult, type: "user" | "org") => {
  const seed = item.id || item.name || type;
  const style = type === "user" ? "thumbs" : "shapes";

  return `https://api.dicebear.com/9.x/${style}/svg?seed=${encodeURIComponent(seed)}`;
};

const linkTo = (id: number, type: "user" | "org") =>
  type === "user" ? `/au/${id}` : `/ao/${id}`;
</script>

<template>
  <div class="space-y-3">
    <NuxtLink
      v-for="result in results"
      :key="result.id"
      :to="linkTo(result.id, type)"
      class="hover:border-primary-400 dark:hover:border-primary-500 relative flex items-center gap-4 rounded-lg border-2 border-gray-200 bg-white p-4 transition-all hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50 dark:hover:bg-gray-800"
    >
      <div
        v-if="type === 'user'"
        class="flex h-full flex-col items-start gap-2 self-start"
      >
        <UAvatar
          :src="getAvatarUrl(result, type)"
          :alt="result.name"
          size="xl"
          class="squircle rounded-none"
        />
      </div>

      <UAvatar
        v-else
        :src="getAvatarUrl(result, type)"
        :alt="result.name"
        size="xl"
        class="squircle rounded-none"
      />

      <div class="min-w-0 flex-1">
        <h3
          :class="[
            'line-clamp-1 text-gray-900 dark:text-gray-100',
            type === 'user'
              ? 'text-lg font-semibold'
              : 'text-base font-semibold',
          ]"
        >
          {{ result.name || result.id }}
        </h3>

        <!-- User: identifiers, affiliations, badges -->
        <div v-if="type === 'user'" class="flex flex-col gap-2">
          <div
            v-if="(result as UserResult).nameIdentifiers?.length"
            class="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1"
          >
            <span class="text-sm font-medium text-gray-500 dark:text-gray-400">
              Identifiers:
            </span>

            <UBadge
              v-for="id in (result as UserResult).nameIdentifiers"
              :key="id"
              size="sm"
              variant="subtle"
              color="neutral"
              :icon="
                id.includes('orcid') ? 'simple-icons:orcid' : 'mdi:identifier'
              "
              :label="id"
            />
          </div>

          <div
            v-if="(result as UserResult).affiliations?.length"
            class="flex flex-wrap items-center gap-3"
          >
            <span class="text-sm font-medium text-gray-500 dark:text-gray-400">
              Affiliations:
            </span>

            <UBadge
              v-for="aff in (result as UserResult).affiliations"
              :key="aff"
              size="sm"
              variant="subtle"
              color="primary"
              :label="aff"
            />
          </div>

          <div class="flex items-center gap-2">
            <UBadge
              color="info"
              variant="soft"
              size="sm"
              :label="`S-Index: ${formatter.format((result as UserResult).sIndex)}`"
            />

            <UBadge
              color="info"
              variant="soft"
              size="sm"
              :label="`Dataset Count: ${formatter.format(result.datasetCount)}`"
            />

            <UBadge
              color="info"
              variant="soft"
              size="sm"
              :label="`Average Dataset Index: ${formatter.format((result as UserResult).sIndex / result.datasetCount)}`"
            />
          </div>
        </div>

        <!-- Org: three badges (same as user) -->
        <div v-else class="mt-1 flex items-center gap-2">
          <UBadge
            color="info"
            variant="soft"
            size="sm"
            :label="`S-Index: ${formatter.format((result as OrgResult).sIndex)}`"
          />

          <UBadge
            color="info"
            variant="soft"
            size="sm"
            :label="`Dataset Count: ${formatter.format(result.datasetCount)}`"
          />

          <UBadge
            color="info"
            variant="soft"
            size="sm"
            :label="`Average Dataset Index: ${formatter.format((result as OrgResult).datasetCount ? (result as OrgResult).sIndex / (result as OrgResult).datasetCount : 0)}`"
          />
        </div>
      </div>

      <UButton
        icon="i-heroicons-arrow-right-20-solid"
        color="primary"
        variant="soft"
        size="sm"
        :aria-label="type === 'user' ? 'View user' : 'View organization'"
      />
    </NuxtLink>
  </div>
</template>

<script setup lang="ts">
useSeoMeta({
  title: "Search Users",
  description: "Search for researchers by name, identifiers, or affiliations.",
});

defineOgImageComponent("Pergel", {
  headline: "Search Users",
});

type SearchResult = {
  id: string;
  name: string;
  nameIdentifiers: string[];
  affiliations: string[];
  datasetCount: number;
};

const toast = useToast();
const searchTerm = ref("");
const searchLoading = ref(false);
const searchResults = ref<SearchResult[]>([]);
const searchPage = ref(1);
const searchTotal = ref(-1);
const searchDuration = ref<string>("0ms");
const hasSearched = ref(false);

// Populate via query; placeholder data for layout only
const defaultSearchResults = ref<SearchResult[]>([
  {
    id: "01KGEVZX9W665ASX0NQN3FZS52",
    name: "Larsson, Karl-Henrik",
    nameIdentifiers: [],
    affiliations: [],
    datasetCount: 3200946,
  },
  {
    id: "01KGEW2FVG5ZDZCQ8252WN7S0T",
    name: "TOKUZAWA, Tokihiko",
    nameIdentifiers: [
      "https://orcid.org/0000-0001-5473-2109",
      "https://nrid.nii.ac.jp/nrid/1000090311208/",
      "https://jglobal.jst.go.jp/detail/?JGLOBAL_ID=201901009150229858",
      "https://www.webofscience.com/wos/author/record/16251071",
      "https://www.scopus.com/authid/detail.uri?authorId=7006299212",
      "https://researchmap.jp/tt2020",
    ],
    affiliations: ["National Institute for Fusion Science (NIFS)"],
    datasetCount: 2649646,
  },
  {
    id: "01KGEW2FXXVVBMCJ362Z817F6G",
    name: "TANAKA, Kenji",
    nameIdentifiers: [
      "https://nrid.nii.ac.jp/nrid/1000050260047/",
      "https://jglobal.jst.go.jp/detail?JGLOBAL_ID=200901013739373061",
      "https://www.webofscience.com/wos/author/record/KMW-6413-2024",
      "https://www.scopus.com/authid/detail.uri?authorId=55628544225",
      "https://researchmap.jp/read0083357",
    ],
    affiliations: ["National Institute for Fusion Science"],
    datasetCount: 2217518,
  },
  {
    id: "01KGEW2GHQGNCZKY9NWJPZ0JWK",
    name: "OSAKABE, Masaki",
    nameIdentifiers: [
      "https://orcid.org/0000-0001-5220-947X",
      "https://nrid.nii.ac.jp/nrid/1000090280601/",
      "https://jglobal.jst.go.jp/detail/?JGLOBAL_ID=200901073314804118",
      "https://www.webofscience.com/wos/author/record/15879782",
      "https://www.scopus.com/authid/detail.uri?authorId=7102560835",
      "https://researchmap.jp/read0053108",
    ],
    affiliations: ["National Institute for Fusion Science"],
    datasetCount: 2187103,
  },
  {
    id: "01KGEW2FS296N712FZAZTN3M0N",
    name: "TOKUZAWA, Tokihiko",
    nameIdentifiers: [
      "https://orcid.org/0000-0001-5473-2109",
      "https://nrid.nii.ac.jp/nrid/1000090311208/",
      "https://jglobal.jst.go.jp/detail/?JGLOBAL_ID=201901009150229858",
      "https://researchmap.jp/tt2020",
    ],
    affiliations: ["National Institute for Fusion Science"],
    datasetCount: 2045816,
  },
  {
    id: "01KGEW2ZBPME8J1A2JZGRBZ8YN",
    name: "GOTO, Motoshi",
    nameIdentifiers: [
      "https://orcid.org/0000-0002-9160-682X",
      "https://nrid.nii.ac.jp/nrid/1000000290916/",
      "https://jglobal.jst.go.jp/detail?JGLOBAL_ID=202101011367280366",
      "https://www.webofscience.com/wos/author/record/8048302",
      "https://www.scopus.com/authid/detail.uri?authorId=7403505493",
    ],
    affiliations: ["National Institute for Fusion Science"],
    datasetCount: 1994879,
  },
  {
    id: "01KGEW2G1XBTAS0S6TP4DD41SG",
    name: "MASUZAKI, Suguru",
    nameIdentifiers: [
      "https://orcid.org/0000-0003-0161-0938",
      "https://nrid.nii.ac.jp/nrid/1000080280593/",
      "https://jglobal.jst.go.jp/detail/?JGLOBAL_ID=200901098125305308",
      "https://www.scopus.com/authid/detail.uri?authorId=7006350815",
      "https://researchmap.jp/MASUZAKI_Suguru",
    ],
    affiliations: ["National Institute for Fusion Science"],
    datasetCount: 1952824,
  },
  {
    id: "01KGEW2GM3J7363SV50XP5QMKM",
    name: "NAGAOKA, Kenichi",
    nameIdentifiers: [
      "https://orcid.org/0000-0002-5892-6047",
      "https://nrid.nii.ac.jp/nrid/1000020353443/",
      "https://jglobal.jst.go.jp/detail?JGLOBAL_ID=200901010090195488",
      "https://www.webofscience.com/wos/author/record/57712578",
      "https://www.scopus.com/authid/detail.uri?authorId=8575348100",
      "https://researchmap.jp/nagaokakenichi",
    ],
    affiliations: ["National Institute for Fusion Science"],
    datasetCount: 1678224,
  },
]);

const updateSearchPage = (page: number) => {
  searchForUsers(page, false);
};

const searchForUsers = async (page: number = 1, reset: boolean = false) => {
  if (reset) {
    searchPage.value = 1;
    searchTotal.value = -1;
    searchResults.value = [];
    page = 1;
  } else {
    searchPage.value = page;
  }

  searchLoading.value = true;

  await $fetch(
    `/api/search/au?q=${encodeURIComponent(searchTerm.value)}&page=${page}`,
  )
    .then(
      (response: {
        users: SearchResult[];
        total: number;
        page: number;
        queryDuration: string;
      }) => {
        searchResults.value = response.users;
        searchTotal.value = response.total;
        searchPage.value = response.page;
        searchDuration.value = response.queryDuration;
        hasSearched.value = true;
      },
    )
    .catch((error) => {
      toast.add({
        title: "Error searching for users",
        description: error.data?.statusMessage,
        icon: "material-symbols:error",
        color: "error",
      });
    })
    .finally(() => {
      searchLoading.value = false;
    });
};

const getUserAvatarUrl = (user: SearchResult) => {
  const seed = user.id || user.name || "user";

  return `https://api.dicebear.com/9.x/thumbs/svg?seed=${encodeURIComponent(seed)}`;
};
</script>

<template>
  <UContainer>
    <UPage>
      <UPageHeader
        title="Search Users"
        description="Find automated users by name."
      />

      <UPageBody>
        <div class="w-full space-y-5">
          <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
            <UInput
              v-model="searchTerm"
              icon="i-lucide-search"
              size="lg"
              variant="outline"
              placeholder="Search for users by name..."
              class="min-w-0 flex-1"
              @keyup.enter="searchForUsers(searchPage, true)"
            />

            <UButton
              icon="i-heroicons-magnifying-glass-20-solid"
              label="Search"
              size="lg"
              :disabled="!searchTerm.trim()"
              :loading="searchLoading"
              class="shrink-0"
              @click="searchForUsers(searchPage, true)"
            />
          </div>

          <div v-if="!hasSearched" class="space-y-6">
            <div
              class="border-primary-200 from-primary-50/80 to-primary-100/40 dark:border-primary-800/50 dark:from-primary-950/40 dark:to-primary-900/30 rounded-2xl border bg-gradient-to-br p-6"
            >
              <div
                class="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4"
              >
                <div
                  class="bg-primary-100 text-primary-600 dark:bg-primary-800/60 dark:text-primary-400 flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
                >
                  <Icon
                    name="i-lucide-sparkles"
                    class="h-6 w-6"
                    aria-hidden="true"
                  />
                </div>

                <div class="min-w-0 flex-1 space-y-1">
                  <h2
                    class="text-lg font-semibold tracking-tight text-gray-900 dark:text-white"
                  >
                    New here? Start exploring
                  </h2>

                  <p
                    class="text-sm leading-relaxed text-gray-600 dark:text-gray-400"
                  >
                    Not sure what to search for? Below are popular users you can
                    browse. Click any card to open it, or use the search above
                    when you have something in mind.
                  </p>
                </div>
              </div>
            </div>

            <div>
              <p
                class="mb-3 text-sm font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400"
              >
                Popular users to explore
              </p>

              <div class="space-y-3">
                <NuxtLink
                  v-for="result in defaultSearchResults"
                  :key="result.id"
                  :to="`/au/${result.id}`"
                  class="hover:border-primary-400 dark:hover:border-primary-500 relative flex items-center gap-4 rounded-lg border-2 border-gray-200 bg-white p-4 transition-all hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50 dark:hover:bg-gray-800"
                >
                  <div
                    class="flex h-full flex-col items-start gap-2 self-start"
                  >
                    <UAvatar
                      :src="getUserAvatarUrl(result)"
                      :alt="result.name"
                      size="xl"
                      class="squircle rounded-none"
                    />
                  </div>

                  <div class="min-w-0 flex-1">
                    <h3
                      class="line-clamp-1 text-lg font-semibold text-gray-900 dark:text-gray-100"
                    >
                      {{ result.name || result.id }}
                    </h3>

                    <div class="flex flex-col gap-2">
                      <div
                        v-if="result.nameIdentifiers?.length"
                        class="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1"
                      >
                        <span
                          class="text-sm font-medium text-gray-500 dark:text-gray-400"
                        >
                          Identifiers:
                        </span>

                        <UBadge
                          v-for="id in result.nameIdentifiers"
                          :key="id"
                          size="sm"
                          variant="subtle"
                          color="neutral"
                          :icon="
                            id.includes('orcid')
                              ? 'simple-icons:orcid'
                              : 'mdi:identifier'
                          "
                          :label="id"
                        />
                      </div>

                      <div
                        v-if="result.affiliations?.length"
                        class="flex flex-wrap items-center gap-3"
                      >
                        <span
                          class="text-sm font-medium text-gray-500 dark:text-gray-400"
                        >
                          Affiliations:
                        </span>

                        <UBadge
                          v-for="aff in result.affiliations"
                          :key="aff"
                          size="sm"
                          variant="subtle"
                          color="primary"
                          :label="aff"
                        />
                      </div>
                    </div>
                  </div>

                  <UButton
                    icon="i-heroicons-arrow-right-20-solid"
                    color="primary"
                    variant="soft"
                    size="sm"
                    aria-label="View user"
                  />
                </NuxtLink>
              </div>
            </div>
          </div>

          <div v-if="searchResults.length > 0" class="mt-6">
            <div class="flex flex-col gap-5">
              <div v-if="searchLoading">
                <div class="py-6 text-center">
                  <Icon
                    name="i-heroicons-arrow-path-20-solid"
                    class="text-primary-500 mx-auto h-10 w-10 animate-spin"
                  />

                  <p class="mt-2 text-base dark:text-gray-400">Searching...</p>
                </div>
              </div>

              <div v-else>
                <div
                  v-if="searchDuration !== '0ms' && !searchLoading"
                  class="flex items-center justify-between"
                >
                  <p class="text-sm text-gray-500 dark:text-gray-400">
                    Total results: {{ searchTotal }}
                  </p>

                  <UBadge
                    icon="i-heroicons-clock-20-solid"
                    color="primary"
                    variant="soft"
                    :label="searchDuration"
                  />
                </div>

                <USeparator class="my-4" />

                <div class="space-y-3">
                  <NuxtLink
                    v-for="result in searchResults"
                    :key="result.id"
                    :to="`/au/${result.id}`"
                    class="hover:border-primary-400 dark:hover:border-primary-500 relative flex items-center gap-4 rounded-lg border-2 border-gray-200 bg-white p-4 transition-all hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50 dark:hover:bg-gray-800"
                  >
                    <div
                      class="flex h-full flex-col items-start gap-2 self-start"
                    >
                      <UAvatar
                        :src="getUserAvatarUrl(result)"
                        :alt="result.name"
                        size="xl"
                        class="squircle rounded-none"
                      />
                    </div>

                    <div class="min-w-0 flex-1">
                      <h3
                        class="line-clamp-1 text-lg font-semibold text-gray-900 dark:text-gray-100"
                      >
                        {{ result.name || result.id }}
                      </h3>

                      <div class="flex flex-col gap-2">
                        <div
                          v-if="result.nameIdentifiers?.length"
                          class="mt-1 flex flex-wrap items-center gap-3"
                        >
                          <span
                            class="text-sm font-medium text-gray-500 dark:text-gray-400"
                          >
                            Identifiers:
                          </span>

                          <UBadge
                            v-for="id in result.nameIdentifiers"
                            :key="id"
                            size="sm"
                            variant="subtle"
                            color="neutral"
                            :icon="
                              id.includes('orcid')
                                ? 'simple-icons:orcid'
                                : 'mdi:identifier'
                            "
                            :label="id"
                          />
                        </div>

                        <div
                          v-if="result.affiliations?.length"
                          class="flex flex-wrap items-center gap-3"
                        >
                          <span
                            class="text-sm font-medium text-gray-500 dark:text-gray-400"
                          >
                            Affiliations:
                          </span>

                          <UBadge
                            v-for="aff in result.affiliations"
                            :key="aff"
                            size="sm"
                            variant="subtle"
                            color="primary"
                            :label="aff"
                          />
                        </div>
                      </div>
                    </div>

                    <UButton
                      icon="i-heroicons-arrow-right-20-solid"
                      color="primary"
                      variant="soft"
                      size="sm"
                      aria-label="View user"
                    />
                  </NuxtLink>
                </div>
              </div>

              <div class="flex w-full justify-center">
                <UPagination
                  v-model:page="searchPage"
                  :total="Math.min(searchTotal, 1000)"
                  :items-per-page="20"
                  :disabled="searchLoading"
                  @update:page="updateSearchPage"
                />
              </div>
            </div>
          </div>

          <div
            v-else-if="!searchLoading && hasSearched && searchTerm.trim()"
            class="py-6 text-center"
          >
            <p class="text-base text-gray-500 dark:text-gray-400">
              No users found. Try a different search term.
            </p>
          </div>
        </div>
      </UPageBody>
    </UPage>
  </UContainer>
</template>

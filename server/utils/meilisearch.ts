import { MeiliSearch } from "meilisearch";

const meilisearchClientSingleton = () => {
  const config = useRuntimeConfig();
  const apiKey = config.searchApiKey;
  const apiUrl = config.searchApiUrl;

  if (!apiKey || !apiUrl) {
    throw new Error(
      "MEILISEARCH_API_KEY and MEILISEARCH_API_URL must be set in runtimeConfig",
    );
  }

  // Remove trailing slash from URL if present
  const normalizedUrl = apiUrl.replace(/\/$/, "");

  return new MeiliSearch({
    host: normalizedUrl,
    apiKey,
  });
};

declare const globalThis: {
  meilisearchGlobal: ReturnType<typeof meilisearchClientSingleton> | undefined;
};

const meilisearch =
  globalThis.meilisearchGlobal ?? meilisearchClientSingleton();

if (process.env.NODE_ENV !== "production") {
  globalThis.meilisearchGlobal = meilisearch;
}

export default meilisearch;

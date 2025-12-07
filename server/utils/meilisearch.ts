import { MeiliSearch } from "meilisearch";

const meilisearchClientSingleton = () => {
  const MEILISEARCH_API_KEY = process.env.MEILISEARCH_API_KEY;
  const MEILISEARCH_API_URL = process.env.MEILISEARCH_API_URL;

  if (!MEILISEARCH_API_KEY || !MEILISEARCH_API_URL) {
    throw new Error(
      "MEILISEARCH_API_KEY and MEILISEARCH_API_URL must be set in environment variables",
    );
  }

  // Remove trailing slash from URL if present
  const normalizedUrl = MEILISEARCH_API_URL.replace(/\/$/, "");

  return new MeiliSearch({
    host: normalizedUrl,
    apiKey: MEILISEARCH_API_KEY,
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

import { Meilisearch } from "meilisearch";

const meilisearchClientSingleton = () => {
  const { MEILISEARCH_API_KEY, MEILISEARCH_API_URL } = process.env;

  if (!MEILISEARCH_API_KEY || !MEILISEARCH_API_URL) {
    throw new Error(
      "MEILISEARCH_API_KEY and MEILISEARCH_API_URL must be set in environment variables",
    );
  }

  // Remove trailing slash from URL if present
  const normalizedUrl = MEILISEARCH_API_URL.replace(/\/$/, "");

  return new Meilisearch({
    host: normalizedUrl,
    apiKey: MEILISEARCH_API_KEY,
  });
};

declare const globalThis: {
  meilisearchGlobal: ReturnType<typeof meilisearchClientSingleton> | undefined;
};

// Resolved lazily (on first property access) rather than at module load, so
// importing this file doesn't require the Meilisearch env vars to be set —
// e.g. during the Nitro build, which loads every server route's module graph.
function resolveMeilisearchClient() {
  if (globalThis.meilisearchGlobal) return globalThis.meilisearchGlobal;

  const client = meilisearchClientSingleton();

  if (process.env.NODE_ENV !== "production") {
    globalThis.meilisearchGlobal = client;
  }

  return client;
}

const meilisearch = new Proxy({} as Meilisearch, {
  get(_target, prop, receiver) {
    return Reflect.get(resolveMeilisearchClient(), prop, receiver);
  },
});

export default meilisearch;

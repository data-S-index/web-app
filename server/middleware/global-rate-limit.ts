// Global per-IP rate limit. Kept fully in-memory so throttled requests never
// touch Redis or the database.

// Max burst size per IP before it starts getting throttled
const BUCKET_CAPACITY = 60;
const REFILL_PER_SECOND = 2; // 120 requests/minute sustained

// Public API requests are likely legit integrations and have their own limits
const SKIPPED_PREFIXES = ["/_nuxt/", "/__nuxt", "/_ipx/", "/_og/", "/api/v1/"];

// Drop buckets that have been idle long enough to be full again
const SWEEP_INTERVAL_MS = 60 * 1000;
const IDLE_TTL_MS = (BUCKET_CAPACITY / REFILL_PER_SECOND) * 1000;

const buckets = new Map<string, { tokens: number; lastRefill: number }>();

setInterval(() => {
  const cutoff = Date.now() - IDLE_TTL_MS;
  for (const [key, bucket] of buckets) {
    if (bucket.lastRefill < cutoff) buckets.delete(key);
  }
}, SWEEP_INTERVAL_MS).unref();

// Returns null if the request should be let through, otherwise seconds until a token is available
function takeToken(key: string): number | null {
  const now = Date.now();
  const bucket = buckets.get(key) ?? {
    tokens: BUCKET_CAPACITY,
    lastRefill: now,
  };

  const elapsedSeconds = (now - bucket.lastRefill) / 1000;
  bucket.tokens = Math.min(
    BUCKET_CAPACITY,
    bucket.tokens + elapsedSeconds * REFILL_PER_SECOND,
  );
  bucket.lastRefill = now;

  if (bucket.tokens < 1) {
    buckets.set(key, bucket);
    return Math.ceil((1 - bucket.tokens) / REFILL_PER_SECOND);
  }

  bucket.tokens -= 1;
  buckets.set(key, bucket);
  return null;
}

export default defineEventHandler((event) => {
  const url = event.node.req.url ?? "";

  if (SKIPPED_PREFIXES.some((prefix) => url.startsWith(prefix))) return;

  const retryAfterSeconds = takeToken(getClientIp(event));

  if (retryAfterSeconds !== null) {
    setResponseStatus(event, 429);
    setHeader(event, "Retry-After", retryAfterSeconds);
    return "Too Many Requests";
  }
});

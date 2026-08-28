const BLOCKED_USER_AGENTS = [
  "meta-externalagent/1.1 (+https://developers.facebook.com/docs/sharing/webmasters/crawler)",
  "ClaudeBot/1.0",
  "GPTBot/1.4",
  "Googlebot/2.1",
];

// Max burst size per bot before it starts getting throttled
const BUCKET_CAPACITY = 5;
const REFILL_PER_SECOND = 3 / 8; // 3 requests every 8s (half throughput)

// One token bucket per matched bot UA, shared across all requests from that bot
const buckets = new Map<string, { tokens: number; lastRefill: number }>();

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
    // Persist the refill we just calculated even though the request is denied
    buckets.set(key, bucket);
    return Math.ceil((1 - bucket.tokens) / REFILL_PER_SECOND);
  }

  bucket.tokens -= 1;
  buckets.set(key, bucket);
  return null;
}

export default defineEventHandler((event) => {
  const ua = event.node.req.headers["user-agent"] ?? "";

  const blocked = BLOCKED_USER_AGENTS.find((b) => ua.includes(b));

  if (!blocked) return;

  // Temp block all bots (until reindexing is done)
  setResponseStatus(event, 403);
  return "Forbidden";

  // const retryAfterSeconds = takeToken(blocked);

  // if (retryAfterSeconds !== null) {
  //   setResponseStatus(event, 429);
  //   setHeader(event, "Retry-After", retryAfterSeconds);
  //   return "Too Many Requests";
  // }
});

// Admin-controlled kill switch for the /api/dataset/* endpoints. The flag lives
// in Redis so it survives restarts and is shared across instances, but is
// cached in memory so the middleware doesn't hit Redis on every request.

const REDIS_KEY = "admin:block:dataset-api";
const CACHE_TTL_MS = 5 * 1000;

let cached: { blocked: boolean; fetchedAt: number } | null = null;

export async function isDatasetApiBlocked(): Promise<boolean> {
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.blocked;
  }

  try {
    const value = await getRedisClient().get(REDIS_KEY);
    cached = { blocked: value === "1", fetchedAt: Date.now() };
  } catch (error) {
    console.error("Failed to read dataset API block flag:", error);
    // Fail open, keep whatever we last knew
    cached = { blocked: cached?.blocked ?? false, fetchedAt: Date.now() };
  }

  return cached.blocked;
}

export async function setDatasetApiBlocked(blocked: boolean) {
  const redis = getRedisClient();

  if (blocked) {
    await redis.set(REDIS_KEY, "1");
  } else {
    await redis.del(REDIS_KEY);
  }

  cached = { blocked, fetchedAt: Date.now() };
}

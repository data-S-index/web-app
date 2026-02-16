import { getRedisClient } from "../../utils/redis";

/**
 * POST /api/cache/flush
 * Flushes the current Redis database (cache). Use with care.
 */
export default defineEventHandler(async () => {
  const redis = getRedisClient();
  await redis.flushdb();

  return {
    ok: true,
    message: "Redis cache flushed successfully",
  };
});

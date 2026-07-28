import { getClientIp } from "./ip";
import { getRedisClient } from "./redis";

export interface RateLimitOptions {
  /**
   * Maximum number of requests allowed
   */
  maxRequests: number;
  /**
   * Time window in seconds
   */
  windowSeconds: number;
  /**
   * Optional prefix for the Redis key
   */
  keyPrefix?: string;
}

export interface RateLimitResult {
  /**
   * Whether the request is allowed
   */
  allowed: boolean;
  /**
   * Number of requests remaining in the current window
   */
  remaining: number;
  /**
   * Time when the rate limit window resets (Unix timestamp in seconds)
   */
  resetAt: number;
}

/**
 * Check and enforce rate limiting using Redis
 * @param identifier - Unique identifier for rate limiting (e.g., IP address, user ID)
 * @param options - Rate limiting configuration
 * @returns Rate limit result
 */
export async function checkRateLimit(
  identifier: string,
  options: RateLimitOptions,
): Promise<RateLimitResult> {
  const redis = getRedisClient();
  const key = `${options.keyPrefix || "ratelimit"}:${identifier}`;
  const { windowSeconds, maxRequests } = options;

  // Get current count
  const currentCount = await redis.get(key);
  const count = currentCount ? parseInt(currentCount, 10) : 0;

  // Check if limit exceeded
  if (count >= maxRequests) {
    // Get TTL to calculate reset time
    const ttl = await redis.ttl(key);
    const resetAt =
      Math.floor(Date.now() / 1000) + (ttl > 0 ? ttl : windowSeconds);

    return {
      allowed: false,
      remaining: 0,
      resetAt,
    };
  }

  // Increment counter
  const pipeline = redis.pipeline();
  pipeline.incr(key);
  pipeline.expire(key, windowSeconds);
  const results = await pipeline.exec();

  if (!results || results.length === 0) {
    throw new Error("Failed to execute rate limit check");
  }

  const newCount = results[0][1] as number;
  const resetAt = Math.floor(Date.now() / 1000) + windowSeconds;

  return {
    allowed: true,
    remaining: Math.max(0, maxRequests - newCount),
    resetAt,
  };
}

/**
 * Get client identifier for rate limiting
 * Prioritizes user ID if available, otherwise falls back to IP address
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getRateLimitIdentifier(event: any): Promise<string> {
  // Try to get user ID from session first
  try {
    const session = await getUserSession(event);
    if (session?.user?.id) {
      return `user:${session.user.id}`;
    }
  } catch {
    // Session might not exist, continue to IP-based identification
  }

  return getClientIp(event);
}

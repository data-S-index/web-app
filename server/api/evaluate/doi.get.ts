import { checkRateLimit, getRateLimitIdentifier } from "../../utils/rateLimit";
import { getRedisClient } from "../../utils/redis";

// Rate limit configuration: 5 requests per minute per user/IP (stricter)
const RATE_LIMIT_CONFIG = {
  maxRequests: 5,
  windowSeconds: 60, // 1 minute
  keyPrefix: "resolve:doi",
};

// Cache configuration: 1 hour expiration
const CACHE_EXPIRATION_SECONDS = 60 * 60; // 1 hour
const CACHE_KEY_PREFIX = "resolve:cache:doi";

export default defineEventHandler(async (event) => {
  // Check rate limit
  const identifier = await getRateLimitIdentifier(event);
  const rateLimitResult = await checkRateLimit(identifier, RATE_LIMIT_CONFIG);

  if (!rateLimitResult.allowed) {
    throw createError({
      statusCode: 429,
      statusMessage: "Too Many Requests",
      data: {
        message: "Rate limit exceeded. Please try again later.",
        resetAt: rateLimitResult.resetAt,
        remaining: rateLimitResult.remaining,
      },
    });
  }

  // Get DOI from query parameters
  const query = getQuery(event);
  const doi = query.doi as string | undefined;

  if (!doi) {
    throw createError({
      statusCode: 400,
      statusMessage: "Missing DOI parameter",
    });
  }

  // Normalize DOI for cache key (remove any URL encoding variations)
  const normalizedDoi = decodeURIComponent(doi).trim().toLowerCase();
  const cacheKey = `${CACHE_KEY_PREFIX}:${normalizedDoi}`;

  // Check cache first
  const redis = getRedisClient();
  const cachedData = await redis.get(cacheKey);

  if (cachedData) {
    // Return cached data with cache flag
    const data = JSON.parse(cachedData);

    // Set rate limit headers
    setHeader(
      event,
      "X-RateLimit-Limit",
      RATE_LIMIT_CONFIG.maxRequests.toString(),
    );
    setHeader(
      event,
      "X-RateLimit-Remaining",
      rateLimitResult.remaining.toString(),
    );
    setHeader(event, "X-RateLimit-Reset", rateLimitResult.resetAt.toString());
    setHeader(event, "X-Cache", "HIT");

    return {
      ...data,
      _cached: true,
    };
  }

  try {
    // Proxy request to external API
    const apiUrl = `http://s-index-api.tailb70b88.ts.net:6405/dataset-index-series-from-doi?doi=${encodeURIComponent(doi)}`;
    const response = await fetch(apiUrl);

    if (!response.ok) {
      throw createError({
        statusCode: response.status,
        statusMessage: `Failed to fetch dataset: ${response.statusText}`,
      });
    }

    const data = await response.json();

    // Cache the response for 1 hour
    await redis.setex(cacheKey, CACHE_EXPIRATION_SECONDS, JSON.stringify(data));

    // Set rate limit headers
    setHeader(
      event,
      "X-RateLimit-Limit",
      RATE_LIMIT_CONFIG.maxRequests.toString(),
    );
    setHeader(
      event,
      "X-RateLimit-Remaining",
      rateLimitResult.remaining.toString(),
    );
    setHeader(event, "X-RateLimit-Reset", rateLimitResult.resetAt.toString());
    setHeader(event, "X-Cache", "MISS");

    return {
      ...data,
      _cached: false,
    };
  } catch (error: unknown) {
    // If it's already a createError, re-throw it
    if (error && typeof error === "object" && "statusCode" in error) {
      throw error;
    }

    // Otherwise, wrap it in a generic error
    const errorMessage =
      error instanceof Error
        ? error.message
        : "An error occurred while fetching the dataset";

    throw createError({
      statusCode: 500,
      statusMessage: "Failed to resolve DOI",
      data: {
        message: errorMessage,
      },
    });
  }
});

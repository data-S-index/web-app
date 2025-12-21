import Redis from "ioredis";

// Singleton variable to hold the Redis client instance
let redisClient: Redis | null = null;

/**
 * Get or create the Redis client singleton
 * @returns Redis client instance
 */
export const getRedisClient = (): Redis => {
  // If client already exists, return it
  if (redisClient) return redisClient;

  const redisConfig = {
    host: process.env.REDIS_HOST || "localhost",
    port: Number(process.env.REDIS_PORT) || 6379,
  };

  // Create new client
  redisClient = new Redis(redisConfig);

  // Add error handling (critical for production)
  redisClient.on("error", (err) => {
    console.error("Redis Client Error:", err);
    // Optional: Reset client on fatal error to reinitialize on next use
    redisClient = null;
  });

  // Graceful shutdown (Nuxt 3 hook)
  process.on("exit", () => {
    if (redisClient) redisClient.quit();
  });

  return redisClient;
};

// Helper function to close the client (for testing/dev)
export const closeRedisClient = async () => {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
};

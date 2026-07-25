const CACHE_TTL_MS = 5 * 60 * 1000;

let cachedUserCount: number | null = null;
let cachedAt = 0;

export default defineEventHandler(async () => {
  const now = Date.now();

  if (cachedUserCount === null || now - cachedAt > CACHE_TTL_MS) {
    cachedUserCount = await prisma.user.count();
    cachedAt = now;
  }

  return {
    userCount: cachedUserCount,
  };
});

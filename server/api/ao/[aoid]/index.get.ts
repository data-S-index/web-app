import prisma from "../../../utils/prisma";
import { getRedisClient } from "../../../utils/redis";

const CACHE_TTL_SECONDS = 86400; // 1 day
const CACHE_KEY_PREFIX = "ao:index";

export default defineEventHandler(async (event) => {
  const { aoid } = event.context.params as { aoid: string };

  if (!aoid?.trim()) {
    throw createError({
      statusCode: 400,
      statusMessage: "Organization ID is required",
    });
  }

  const cacheKey = `${CACHE_KEY_PREFIX}:${aoid}`;
  const redis = getRedisClient();
  const cached = await redis.get(cacheKey);
  if (cached) {
    setHeader(event, "X-Cache", "HIT");

    return JSON.parse(cached);
  }

  const org = await prisma.automatedOrganization.findUnique({
    where: { id: aoid },
    select: {
      id: true,
      name: true,
    },
  });

  if (!org) {
    throw createError({
      statusCode: 404,
      statusMessage: "Organization not found",
    });
  }

  const payload = {
    id: org.id,
    name: org.name ?? "",
  };
  await redis.setex(cacheKey, CACHE_TTL_SECONDS, JSON.stringify(payload));
  setHeader(event, "X-Cache", "MISS");

  return payload;
});

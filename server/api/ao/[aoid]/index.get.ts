import prisma from "../../../utils/prisma";
import { getRedisClient } from "../../../utils/redis";

const CACHE_TTL_SECONDS = 86400; // 1 day
const CACHE_KEY_PREFIX = "ao:index";

function parseAoId(value: string | undefined): number | null {
  if (value == null || value.trim() === "") return null;
  const n = parseInt(value, 10);

  return Number.isFinite(n) && n > 0 ? n : null;
}

export default defineEventHandler(async (event) => {
  const { aoid: aoidParam } = event.context.params as { aoid: string };
  const aoid = parseAoId(aoidParam);

  if (aoid == null) {
    throw createError({
      statusCode: 400,
      statusMessage:
        "Organization ID is required and must be a positive integer",
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

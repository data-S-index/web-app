import prisma from "../../../utils/prisma";
import { getRedisClient } from "../../../utils/redis";

const CACHE_TTL_SECONDS = 86400; // 1 day
const CACHE_KEY_PREFIX = "au:index";

function parseAuId(value: string | undefined): number | null {
  if (value == null || value.trim() === "") return null;
  const n = parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export default defineEventHandler(async (event) => {
  const { auid: auidParam } = event.context.params as { auid: string };
  const auid = parseAuId(auidParam);

  if (auid == null) {
    throw createError({
      statusCode: 400,
      statusMessage: "User ID is required and must be a positive integer",
    });
  }

  const cacheKey = `${CACHE_KEY_PREFIX}:${auid}`;
  const redis = getRedisClient();
  const cached = await redis.get(cacheKey);
  if (cached) {
    setHeader(event, "X-Cache", "HIT");

    return JSON.parse(cached);
  }

  const automatedUser = await prisma.automatedUser.findUnique({
    where: { id: auid },
    select: {
      id: true,
      nameType: true,
      name: true,
      nameIdentifiers: true,
      affiliations: true,
    },
  });

  if (!automatedUser) {
    throw createError({
      statusCode: 404,
      statusMessage: "User not found",
    });
  }

  const payload = {
    id: automatedUser.id,
    nameType: automatedUser.nameType ?? undefined,
    name: automatedUser.name ?? "",
    nameIdentifiers: automatedUser.nameIdentifiers ?? [],
    affiliations: automatedUser.affiliations ?? [],
  };
  await redis.setex(cacheKey, CACHE_TTL_SECONDS, JSON.stringify(payload));
  setHeader(event, "X-Cache", "MISS");

  return payload;
});

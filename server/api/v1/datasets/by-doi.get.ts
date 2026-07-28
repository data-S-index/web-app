import normalizeDoi from "~~/server/utils/doi";

const CACHE_EXPIRATION_SECONDS = 5 * 60; // 5 minutes
const CACHE_KEY_PREFIX = "v1:datasets:by-doi";

// Rate limit configuration: 30 requests per minute per user/IP
const RATE_LIMIT_CONFIG = {
  maxRequests: 30,
  windowSeconds: 60,
  keyPrefix: "v1:datasets:by-doi",
};

export default defineEventHandler(async (event) => {
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

  const query = getQuery(event);
  const doiParam = (query.doi as string) || "";

  if (!doiParam) {
    throw createError({
      statusCode: 400,
      statusMessage: "DOI parameter is required",
    });
  }

  // Normalize DOI (handles encoded values like %2F, full URLs, and case)
  const normalizedDoi = normalizeDoi(doiParam);

  const cacheKey = `${CACHE_KEY_PREFIX}:${normalizedDoi}`;
  const redis = getRedisClient();
  const cachedData = await redis.get(cacheKey);

  if (cachedData) {
    const data = JSON.parse(cachedData);
    setHeader(event, "X-Cache", "HIT");

    return data;
  }

  const dataset = await prisma.dataset.findFirst({
    where: {
      identifierType: "doi",
      identifier: normalizedDoi,
    },
    select: {
      id: true,
    },
  });

  if (!dataset?.id) {
    throw createError({
      statusCode: 404,
      statusMessage: "Dataset not found",
    });
  }

  const [citationTotal, mentionTotal, fujiScore, latestDIndex] =
    await Promise.all([
      (async () => {
        const result = await prisma.citation.count({
          where: {
            datasetId: dataset.id,
          },
        });

        return result;
      })(),
      (async () => {
        const result = await prisma.mention.count({
          where: {
            datasetId: dataset.id,
          },
        });

        return result;
      })(),
      (async () => {
        const result = await prisma.fujiScore.findUnique({
          where: {
            datasetId: dataset.id,
          },
          select: {
            score: true,
            evaluationDate: true,
            metricVersion: true,
            softwareVersion: true,
          },
        });

        return result;
      })(),
      (async () => {
        const result = await prisma.dIndex.findFirst({
          where: {
            datasetId: dataset.id,
          },
          orderBy: {
            year: "desc",
          },
          select: {
            score: true,
            year: true,
          },
        });

        return result;
      })(),
    ]);

  const siteUrl = process.env.NUXT_SITE_URL || "";
  const datasetUrl = siteUrl ? `${siteUrl}/datasets/${dataset.id}` : null;

  const responseData = {
    datasetId: dataset.id,
    datasetUrl,
    totalCitations: citationTotal,
    totalMentions: mentionTotal,
    fujiScore:
      fujiScore && fujiScore.score !== null
        ? { ...fujiScore, score: Math.round(fujiScore.score) }
        : fujiScore,
    latestDIndex: latestDIndex
      ? { ...latestDIndex, score: parseFloat(latestDIndex.score.toFixed(1)) }
      : null,
  };

  await redis.setex(
    cacheKey,
    CACHE_EXPIRATION_SECONDS,
    JSON.stringify(responseData),
  );
  setHeader(event, "X-Cache", "MISS");

  return responseData;
});

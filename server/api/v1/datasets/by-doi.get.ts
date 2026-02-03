const CACHE_EXPIRATION_SECONDS = 5 * 60; // 5 minutes
const CACHE_KEY_PREFIX = "v1:datasets:by-doi";

export default defineEventHandler(async (event) => {
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
            created: "desc",
          },
          select: {
            score: true,
            created: true,
          },
        });

        return result;
      })(),
    ]);

  const responseData = {
    datasetId: dataset.id,
    totalCitations: citationTotal,
    totalMentions: mentionTotal,
    fujiScore,
    latestDIndex,
  };

  await redis.setex(
    cacheKey,
    CACHE_EXPIRATION_SECONDS,
    JSON.stringify(responseData),
  );
  setHeader(event, "X-Cache", "MISS");

  return responseData;
});

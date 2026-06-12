const CACHE_EXPIRATION_SECONDS = 5 * 60; // 5 minutes
const CACHE_KEY_PREFIX = "v1:researchers:by-id";

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const idParam = (query.id as string) || "";

  if (!idParam) {
    throw createError({
      statusCode: 400,
      statusMessage: "id parameter is required",
    });
  }

  const userId = idParam.toUpperCase();
  const cacheKey = `${CACHE_KEY_PREFIX}:${userId}`;
  const redis = getRedisClient();
  const cachedData = await redis.get(cacheKey);

  if (cachedData) {
    const data = JSON.parse(cachedData);
    setHeader(event, "X-Cache", "HIT");

    return data;
  }

  const user = await prisma.user.findUnique({
    where: { id: userId, anonymous: false },
    select: { id: true, givenName: true, familyName: true },
  });

  if (!user) {
    throw createError({
      statusCode: 404,
      statusMessage: "Researcher not found",
    });
  }

  const userDatasets = await prisma.userDataset.findMany({
    where: { userId },
    include: {
      dataset: {
        select: {
          dindices: {
            orderBy: { year: "desc" },
            take: 1,
            select: { score: true },
          },
          _count: {
            select: { citations: true, mentions: true },
          },
        },
      },
    },
  });

  let currentSIndex = 0;
  let totalCitations = 0;
  let totalMentions = 0;

  for (const ud of userDatasets) {
    currentSIndex += ud.dataset.dindices[0]?.score ?? 0;
    totalCitations += ud.dataset._count.citations;
    totalMentions += ud.dataset._count.mentions;
  }

  const siteUrl = process.env.NUXT_SITE_URL || "";
  const researcherUrl = siteUrl ? `${siteUrl}/users/${userId}` : null;

  const responseData = {
    userId,
    researcherUrl,
    currentSIndex,
    datasetCount: userDatasets.length,
    totalCitations,
    totalMentions,
  };

  await redis.setex(
    cacheKey,
    CACHE_EXPIRATION_SECONDS,
    JSON.stringify(responseData),
  );
  setHeader(event, "X-Cache", "MISS");

  return responseData;
});

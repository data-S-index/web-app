import prisma from "../../../../utils/prisma";
import { getRedisClient } from "../../../../utils/redis";

const CACHE_TTL_SECONDS = 86400; // 1 day
const CACHE_KEY_PREFIX = "au:datasets";

export default defineEventHandler(async (event) => {
  const { auid } = event.context.params as { auid: string };

  if (!auid?.trim()) {
    throw createError({
      statusCode: 400,
      statusMessage: "User ID is required",
    });
  }

  const cacheKey = `${CACHE_KEY_PREFIX}:${auid}`;
  const redis = getRedisClient();
  const cached = await redis.get(cacheKey);
  if (cached) {
    setHeader(event, "X-Cache", "HIT");

    return JSON.parse(cached);
  }

  const TAKE = 500;

  // Only fetch the first 500 datasets
  const datasets = await prisma.automatedUserDataset.findMany({
    where: { automatedUserId: auid },
    take: TAKE,
    orderBy: { dataset: { publishedAt: "desc" } },
    include: {
      dataset: {
        include: {
          citations: {
            select: {
              citationLink: true,
              datacite: true,
              mdc: true,
              openAlex: true,
              citedDate: true,
              citationWeight: true,
            },
          },
          mentions: {
            select: {
              mentionLink: true,
              source: true,
              mentionedDate: true,
              mentionWeight: true,
            },
          },
          fujiScore: {
            select: {
              score: true,
              evaluationDate: true,
              metricVersion: true,
              softwareVersion: true,
            },
          },
          dindices: {
            select: { score: true, year: true },
            orderBy: { year: "desc" },
            take: 1, // IMPORTANT: only latest
          },
          datasetAuthors: {
            select: {
              name: true,
              nameType: true,
              affiliations: true,
              nameIdentifiers: true,
            },
          },
        },
      },
    },
  });

  // Aggregates in DB (one query)
  // - totalDatasets
  // - avgFairScore (avg fuji score across all user datasets)
  // - totalCitations (count citations across all user datasets)
  // - currentSIndex (sum of latest dindex per dataset across all user datasets)
  const [agg] = await prisma.$queryRaw<
    Array<{
      totalDatasets: bigint;
      averageFairScore: number | null;
      totalCitations: bigint;
      currentSIndex: number | null;
    }>
  >`
    WITH user_ds AS (
      SELECT aud."datasetId"
      FROM "AutomatedUserDataset" aud
      WHERE aud."automatedUserId" = ${auid}
    ),
    latest_d AS (
      SELECT DISTINCT ON (d."datasetId")
        d."datasetId",
        d."score"
      FROM "DIndex" d
      JOIN user_ds u ON u."datasetId" = d."datasetId"
      ORDER BY d."datasetId", d."year" DESC
    )
    SELECT
      (SELECT COUNT(*) FROM user_ds) AS "totalDatasets",
      (SELECT AVG(fs."score") FROM "FujiScore" fs JOIN user_ds u ON u."datasetId" = fs."datasetId") AS "averageFairScore",
      (SELECT COUNT(*) FROM "Citation" c JOIN user_ds u ON u."datasetId" = c."datasetId") AS "totalCitations",
      (SELECT COALESCE(SUM(ld."score"), 0) FROM latest_d ld) AS "currentSIndex"
  `;

  const payload = {
    datasets,
    totalDatasets: Number(agg?.totalDatasets ?? 0n),
    currentSIndex: Number(agg?.currentSIndex ?? 0),
    averageFairScore: agg?.averageFairScore ?? 0,
    totalCitations: Number(agg?.totalCitations ?? 0n),
  };
  await redis.setex(cacheKey, CACHE_TTL_SECONDS, JSON.stringify(payload));
  setHeader(event, "X-Cache", "MISS");

  return payload;
});

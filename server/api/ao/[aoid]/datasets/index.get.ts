import prisma from "../../../../utils/prisma";
import { getRedisClient } from "../../../../utils/redis";

const CACHE_TTL_SECONDS = 86400; // 1 day
const CACHE_KEY_PREFIX = "ao:datasets";

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

  const TAKE = 500;

  // 1) Only fetch the first 500 datasets (the part you actually return)
  const datasets = await prisma.automatedOrganizationDataset.findMany({
    where: { automatedOrganizationId: aoid },
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

  // 2) Aggregates in DB (one query)
  // - totalDatasets
  // - avgFairScore (avg fuji score across all org datasets)
  // - totalCitations (count citations across all org datasets)
  // - currentSIndex (sum of latest dindex per dataset across all org datasets)
  //
  // This is easiest with raw SQL because of "latest dindex per dataset".
  const [agg] = await prisma.$queryRaw<
    Array<{
      totalDatasets: bigint;
      averageFairScore: number | null;
      totalCitations: bigint;
      currentSIndex: number | null;
    }>
  >`
    WITH org_ds AS (
      SELECT aod."datasetId"
      FROM "AutomatedOrganizationDataset" aod
      WHERE aod."automatedOrganizationId" = ${aoid}
    ),
    latest_d AS (
      SELECT DISTINCT ON (d."datasetId")
        d."datasetId",
        d."score"
      FROM "DIndex" d
      JOIN org_ds o ON o."datasetId" = d."datasetId"
      ORDER BY d."datasetId", d."year" DESC
    )
    SELECT
      (SELECT COUNT(*) FROM org_ds) AS "totalDatasets",
      (SELECT AVG(fs."score") FROM "FujiScore" fs JOIN org_ds o ON o."datasetId" = fs."datasetId") AS "averageFairScore",
      (SELECT COUNT(*) FROM "Citation" c JOIN org_ds o ON o."datasetId" = c."datasetId") AS "totalCitations",
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

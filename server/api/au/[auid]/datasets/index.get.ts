import prisma from "../../../../utils/prisma";
import { getRedisClient } from "../../../../utils/redis";

const CACHE_TTL_SECONDS = 86400; // 1 day
const CACHE_KEY_PREFIX = "au:datasets";

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
  const [agg] = await prisma.$queryRaw<
    Array<{
      totalDatasets: bigint;
      averageFairScore: number | null;
      totalCitations: bigint;
    }>
  >`
    WITH user_ds AS (
      SELECT aud."datasetId"
      FROM "AutomatedUserDataset" aud
      WHERE aud."automatedUserId" = ${auid}
    )
    SELECT
      (SELECT COUNT(*) FROM user_ds) AS "totalDatasets",
      (SELECT AVG(fs."score") FROM "FujiScore" fs JOIN user_ds u ON u."datasetId" = fs."datasetId") AS "averageFairScore",
      (SELECT COUNT(*) FROM "Citation" c JOIN user_ds u ON u."datasetId" = c."datasetId") AS "totalCitations"
  `;

  // S-index from precomputed AutomatedUserSIndex table (score per year)
  const sindexRows = await prisma.automatedUserSIndex.findMany({
    where: { automatedUserId: auid },
    orderBy: { year: "asc" },
    select: { year: true, score: true },
  });
  const rawYears = sindexRows.map((r) => r.year);
  const rawScores = sindexRows.map((r) => r.score);
  const currentYear = new Date().getFullYear();
  const endYear = currentYear - 1;
  const filledYears: number[] = [];
  const filledScores: number[] = [];
  if (rawYears.length > 0) {
    const firstYear = rawYears[0]!;
    const yearToScore = new Map(
      rawYears.map((y, i) => [y, rawScores[i]!] as const),
    );
    let lastScore = 0;
    for (let y = firstYear; y <= endYear; y++) {
      filledYears.push(y);
      if (yearToScore.has(y)) {
        lastScore = yearToScore.get(y)!;
      }
      filledScores.push(lastScore);
    }
  }
  const sindexOverTime = {
    years: filledYears.length > 0 ? filledYears : rawYears,
    scores: filledScores.length > 0 ? filledScores : rawScores,
  };
  const currentSIndex =
    sindexRows.length > 0 ? sindexRows[sindexRows.length - 1]!.score : 0;

  const payload = {
    datasets,
    totalDatasets: Number(agg?.totalDatasets ?? 0n),
    currentSIndex,
    sindexOverTime,
    averageFairScore: agg?.averageFairScore ?? 0,
    totalCitations: Number(agg?.totalCitations ?? 0n),
  };
  await redis.setex(cacheKey, CACHE_TTL_SECONDS, JSON.stringify(payload));
  setHeader(event, "X-Cache", "MISS");

  return payload;
});

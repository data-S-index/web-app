import normalizeDoi from "~~/server/utils/doi";

const CACHE_EXPIRATION_SECONDS = 5 * 60; // 5 minutes
const CACHE_KEY_PREFIX = "v1:datasets:by-doi:citations";

const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;

// Rate limit configuration: 120 requests per minute per user/IP
const RATE_LIMIT_CONFIG = {
  maxRequests: 120,
  windowSeconds: 60,
  keyPrefix: "v1:datasets:by-doi:citations",
};

// exempt from rate limiting
const PHYSIONET_DOI_PREFIX = "10.13026";
const NIH_SPARC_PREFIX = "10.26275";

const parsePositiveInt = (value: unknown, fallback: number) => {
  const parsed = parseInt(String(value ?? ""), 10);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

// Returns the DOI of the citing work when the stored link is a DOI, else null
const extractDoi = (link: string) => {
  const normalized = normalizeDoi(link);

  return normalized.startsWith("10.") ? normalized : null;
};

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const doiParam = (query.doi as string) || "";

  if (!doiParam) {
    throw createError({
      statusCode: 400,
      statusMessage: "DOI parameter is required",
    });
  }

  const page = parsePositiveInt(query.page, 1);
  const pageSize = Math.min(
    parsePositiveInt(query.pageSize, DEFAULT_PAGE_SIZE),
    MAX_PAGE_SIZE,
  );

  // Normalize DOI (handles encoded values like %2F, full URLs, and case)
  const normalizedDoi = normalizeDoi(doiParam);

  if (
    !normalizedDoi.startsWith(PHYSIONET_DOI_PREFIX) &&
    !normalizedDoi.startsWith(NIH_SPARC_PREFIX)
  ) {
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
  }

  const cacheKey = `${CACHE_KEY_PREFIX}:${normalizedDoi}:${page}:${pageSize}`;
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

  const [total, citations] = await Promise.all([
    prisma.citation.count({
      where: {
        datasetId: dataset.id,
      },
    }),
    prisma.citation.findMany({
      where: {
        datasetId: dataset.id,
      },
      select: {
        citationLink: true,
        datacite: true,
        mdc: true,
        openAlex: true,
        citedDate: true,
        citationWeight: true,
      },
      // id breaks ties so pages stay stable when dates repeat
      orderBy: [{ citedDate: "desc" }, { id: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  const siteUrl = process.env.NUXT_SITE_URL || "";
  const datasetUrl = siteUrl ? `${siteUrl}/datasets/${dataset.id}` : null;

  const responseData = {
    datasetId: dataset.id,
    datasetUrl,
    doi: normalizedDoi,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
    citations: citations.map((citation) => {
      const sources: string[] = [];
      if (citation.datacite) sources.push("DataCite");
      if (citation.mdc) sources.push("MDC");
      if (citation.openAlex) sources.push("OpenAlex");

      return {
        doi: extractDoi(citation.citationLink),
        link: citation.citationLink,
        sources,
        citedDate: citation.citedDate,
        year: citation.citedDate.getUTCFullYear(),
        citationWeight: citation.citationWeight,
      };
    }),
  };

  await redis.setex(
    cacheKey,
    CACHE_EXPIRATION_SECONDS,
    JSON.stringify(responseData),
  );
  setHeader(event, "X-Cache", "MISS");

  return responseData;
});

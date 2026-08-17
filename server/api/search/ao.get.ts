const CACHE_TTL_SECONDS = 86400; // 1 day
const CACHE_KEY_PREFIX = "search:ao";

// Public automated-organization search - no auth required. Returns a paginated list of organizations.
export default defineEventHandler(async (event) => {
  const queryStartTime = performance.now();

  const query = getQuery(event);
  const searchTerm = (query.q as string) || "";
  const page = parseInt(query.page as string) || 1;

  const limit = 20;
  const MEILISEARCH_MAX_RESULTS = 1000;
  const maxOffset = MEILISEARCH_MAX_RESULTS - limit;
  const maxPage = Math.floor(MEILISEARCH_MAX_RESULTS / limit);
  const offset = (page - 1) * limit;

  if (!searchTerm.trim()) {
    return {
      organizations: [],
      total: 0,
      page,
      limit,
      queryDuration: "0ms",
    };
  }

  const cacheKey = `${CACHE_KEY_PREFIX}:${searchTerm.trim().toLowerCase()}:${page}`;
  const redis = getRedisClient();
  const cached = await redis.get(cacheKey);
  if (cached) {
    setHeader(event, "X-Cache", "HIT");

    const queryEndTime = performance.now();
    const queryDuration = queryEndTime - queryStartTime;
    const executionTime =
      queryDuration > 1000
        ? `${(queryDuration / 1000).toFixed(2)}s`
        : `${queryDuration.toFixed(2)}ms`;

    return { ...JSON.parse(cached), queryDuration: executionTime };
  }

  try {
    const validatedOffset = Math.min(offset, maxOffset);
    const validatedPageForOffset =
      validatedOffset !== offset
        ? Math.floor(validatedOffset / limit) + 1
        : page;

    const index = meilisearch.index("automated-organization");
    const searchResults = await index.search(searchTerm, {
      limit,
      offset: validatedOffset,
      showRankingScore: true,
    });

    type Hit = {
      id: string | number;
      name?: string;
      _rankingScore?: number;
    };
    const parseId = (id: string | number): number | null => {
      const n = typeof id === "number" ? id : parseInt(String(id), 10);

      return Number.isFinite(n) && n > 0 ? n : null;
    };
    const hits = (searchResults.hits as Hit[]) || [];
    const aoIds = hits
      .map((h) => parseId(h.id))
      .filter((id): id is number => id != null);

    if (aoIds.length === 0) {
      const queryEndTime = performance.now();
      const queryDuration = queryEndTime - queryStartTime;
      const executionTime =
        queryDuration > 1000
          ? `${(queryDuration / 1000).toFixed(2)}s`
          : `${queryDuration.toFixed(2)}ms`;

      const rawTotalCount = searchResults.estimatedTotalHits || 0;
      const totalCount = Math.min(rawTotalCount, MEILISEARCH_MAX_RESULTS);

      const emptyResult = {
        organizations: [],
        total: totalCount,
        page,
        limit,
        queryDuration: executionTime,
      };
      await redis.setex(
        cacheKey,
        CACHE_TTL_SECONDS,
        JSON.stringify(emptyResult),
      );
      setHeader(event, "X-Cache", "MISS");

      return emptyResult;
    }

    const [countRows, sindexRows] = await Promise.all([
      prisma.automatedOrganizationDataset.groupBy({
        by: ["automatedOrganizationId"],
        where: { automatedOrganizationId: { in: aoIds } },
        _count: { automatedOrganizationId: true },
      }),
      prisma.automatedOrganizationSIndex.findMany({
        where: { automatedOrganizationId: { in: aoIds } },
        orderBy: { year: "desc" },
        select: { automatedOrganizationId: true, score: true },
      }),
    ]);

    const countByOrgId = new Map(
      countRows.map((r) => [
        r.automatedOrganizationId,
        r._count.automatedOrganizationId,
      ]),
    );
    const sindexByOrgId = new Map<number, number>();
    for (const row of sindexRows) {
      if (!sindexByOrgId.has(row.automatedOrganizationId)) {
        sindexByOrgId.set(row.automatedOrganizationId, row.score);
      }
    }

    const organizations = hits
      .map((hit) => {
        const id = parseId(hit.id);
        if (id == null) return null;

        return {
          id,
          name: hit.name ?? "",
          datasetCount: countByOrgId.get(id) ?? 0,
          sIndex: sindexByOrgId.get(id) ?? 0,
          rankingScore: hit._rankingScore,
        };
      })
      .filter((o): o is NonNullable<typeof o> => o != null);

    const rawTotalCount = searchResults.estimatedTotalHits || 0;
    const totalCount = Math.min(rawTotalCount, MEILISEARCH_MAX_RESULTS);
    const calculatedMaxPage =
      totalCount > 0 ? Math.ceil(totalCount / limit) : 1;
    const actualMaxPage = Math.min(calculatedMaxPage, maxPage);
    const validatedPage = Math.max(
      1,
      Math.min(validatedPageForOffset, actualMaxPage),
    );

    const queryEndTime = performance.now();
    const queryDuration = queryEndTime - queryStartTime;
    const executionTime =
      queryDuration > 1000
        ? `${(queryDuration / 1000).toFixed(2)}s`
        : `${queryDuration.toFixed(2)}ms`;

    const finalTotal = Math.min(totalCount, MEILISEARCH_MAX_RESULTS);

    const result = {
      organizations,
      total: finalTotal,
      page: validatedPage,
      limit,
      queryDuration: executionTime,
    };
    await redis.setex(cacheKey, CACHE_TTL_SECONDS, JSON.stringify(result));
    setHeader(event, "X-Cache", "MISS");

    return result;
  } catch (error) {
    console.error("AO search error:", error);
    throw createError({
      statusCode: 500,
      statusMessage:
        "Search failed. Please ensure Meilisearch is configured and the automated-organizations index exists.",
    });
  }
});

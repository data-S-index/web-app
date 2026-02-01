// Public automated-user search - no auth required. Returns a paginated list of users.
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
      users: [],
      total: 0,
      page,
      limit,
      queryDuration: "0ms",
    };
  }

  try {
    const validatedOffset = Math.min(offset, maxOffset);
    const validatedPageForOffset =
      validatedOffset !== offset
        ? Math.floor(validatedOffset / limit) + 1
        : page;

    const index = meilisearch.index("automated-user");
    const searchResults = await index.search(searchTerm, {
      limit,
      offset: validatedOffset,
    });

    type Hit = {
      id: string;
      name?: string;
      nameIdentifiers?: string[];
      affiliations?: string[];
    };
    const hits = (searchResults.hits as Hit[]) || [];
    const auIds = hits.map((h) => h.id).filter(Boolean);

    if (auIds.length === 0) {
      const queryEndTime = performance.now();
      const queryDuration = queryEndTime - queryStartTime;
      const executionTime =
        queryDuration > 1000
          ? `${(queryDuration / 1000).toFixed(2)}s`
          : `${queryDuration.toFixed(2)}ms`;

      const rawTotalCount = searchResults.estimatedTotalHits || 0;
      const totalCount = Math.min(rawTotalCount, MEILISEARCH_MAX_RESULTS);

      return {
        users: [],
        total: totalCount,
        page,
        limit,
        queryDuration: executionTime,
      };
    }

    const countRows = await prisma.automatedUserDataset.groupBy({
      by: ["automatedUserId"],
      where: { automatedUserId: { in: auIds } },
      _count: { automatedUserId: true },
    });

    const countByUserId = new Map(
      countRows.map((r) => [r.automatedUserId, r._count.automatedUserId]),
    );

    const users = hits.map((hit) => ({
      id: hit.id,
      name: hit.name ?? "",
      nameIdentifiers: hit.nameIdentifiers ?? [],
      affiliations: hit.affiliations ?? [],
      datasetCount: countByUserId.get(hit.id) ?? 0,
    }));

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

    return {
      users,
      total: finalTotal,
      page: validatedPage,
      limit,
      queryDuration: executionTime,
    };
  } catch (error) {
    console.error("AU search error:", error);
    throw createError({
      statusCode: 500,
      statusMessage:
        "Search failed. Please ensure Meilisearch is configured and the automated-users index exists.",
    });
  }
});

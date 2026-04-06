// Public search - no auth required. Returns a paginated list of users (regular + automated), with regular users first.
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

    const auIndex = meilisearch.index("automated-user");
    const userIndex = meilisearch.index("user");

    // Search both indexes in parallel; gracefully handle missing user index
    const [auSearchResults, userSearchResults] = await Promise.all([
      auIndex.search(searchTerm, { limit, offset: validatedOffset }),
      userIndex
        .search(searchTerm, { limit, offset: validatedOffset })
        .catch(() => ({ hits: [], estimatedTotalHits: 0 })),
    ]);

    type AuHit = {
      id: string | number;
      name?: string;
      nameIdentifiers?: string[];
      affiliations?: string[];
    };

    type UserHit = {
      id: string;
      name?: string;
      nameIdentifiers?: string[];
      affiliations?: string[];
    };

    const parseAuId = (id: string | number): number | null => {
      const n = typeof id === "number" ? id : parseInt(String(id), 10);

      return Number.isFinite(n) && n > 0 ? n : null;
    };

    const auHits = (auSearchResults.hits as AuHit[]) || [];
    const userHits = (userSearchResults.hits as UserHit[]) || [];

    const auIds = auHits
      .map((h) => parseAuId(h.id))
      .filter((id): id is number => id != null);

    const userIds = userHits
      .map((h) => String(h.id))
      .filter((id) => id.length > 0);

    // Enrich automated users
    const [auCountRows, sindexRows] =
      auIds.length > 0
        ? await Promise.all([
            prisma.automatedUserDataset.groupBy({
              by: ["automatedUserId"],
              where: { automatedUserId: { in: auIds } },
              _count: { automatedUserId: true },
            }),
            prisma.automatedUserSIndex.findMany({
              where: { automatedUserId: { in: auIds } },
              orderBy: { year: "desc" },
              select: { automatedUserId: true, score: true },
            }),
          ])
        : [[], []];

    const auCountByUserId = new Map(
      auCountRows.map((r) => [r.automatedUserId, r._count.automatedUserId]),
    );
    const sindexByUserId = new Map<number, number>();
    for (const row of sindexRows) {
      if (!sindexByUserId.has(row.automatedUserId)) {
        sindexByUserId.set(row.automatedUserId, row.score);
      }
    }

    // Enrich regular users
    const userCountRows =
      userIds.length > 0
        ? await prisma.userDataset.groupBy({
            by: ["userId"],
            where: { userId: { in: userIds } },
            _count: { userId: true },
          })
        : [];

    const userCountById = new Map(
      userCountRows.map((r) => [r.userId, r._count.userId]),
    );

    // Build result arrays
    const regularUsers = userHits
      .map((hit) => {
        const id = String(hit.id);
        if (!id) return null;

        return {
          id,
          name: hit.name ?? "",
          nameIdentifiers: hit.nameIdentifiers ?? [],
          affiliations: hit.affiliations ?? [],
          datasetCount: userCountById.get(id) ?? 0,
          sIndex: 0,
          profileType: "user" as const,
        };
      })
      .filter((u): u is NonNullable<typeof u> => u != null);

    const automatedUsers = auHits
      .map((hit) => {
        const id = parseAuId(hit.id);
        if (id == null) return null;

        return {
          id,
          name: hit.name ?? "",
          nameIdentifiers: hit.nameIdentifiers ?? [],
          affiliations: hit.affiliations ?? [],
          datasetCount: auCountByUserId.get(id) ?? 0,
          sIndex: sindexByUserId.get(id) ?? 0,
          profileType: "au" as const,
        };
      })
      .filter((u): u is NonNullable<typeof u> => u != null);

    // Regular users appear first
    const users = [...regularUsers, ...automatedUsers];

    const rawAuTotal = auSearchResults.estimatedTotalHits || 0;
    const rawUserTotal = userSearchResults.estimatedTotalHits || 0;
    const totalCount = Math.min(
      rawAuTotal + rawUserTotal,
      MEILISEARCH_MAX_RESULTS,
    );

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

    return {
      users,
      total: totalCount,
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

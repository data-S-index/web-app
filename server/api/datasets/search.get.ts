// returns a paginated list of datasets
export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event);

  const { user } = session;
  const userId = user.id;

  const queryStartTime = performance.now();

  const query = getQuery(event);
  const searchTerm = (query.q as string) || "";
  const page = parseInt(query.page as string) || 1;
  const userid = userId;

  // Fetch from Meilisearch in batches of FETCH_LIMIT, filter out existing IDs,
  // and return VISIBLE_LIMIT results per page. Offset steps by FETCH_LIMIT so
  // consecutive pages don't return duplicate items after filtering.
  const VISIBLE_LIMIT = 10;
  const FETCH_LIMIT = 20;
  const MEILISEARCH_MAX_RESULTS = 1000;
  const maxOffset = MEILISEARCH_MAX_RESULTS - FETCH_LIMIT;
  const maxPage = Math.floor(MEILISEARCH_MAX_RESULTS / FETCH_LIMIT);
  const offset = (page - 1) * FETCH_LIMIT;

  // Fetch existing dataset IDs first so we can filter Meilisearch results
  let existingDatasetIds: number[] = [];
  if (userid) {
    const userDatasets = await prisma.userDataset.findMany({
      where: {
        userId: userid,
      },
      select: {
        datasetId: true,
      },
    });
    existingDatasetIds = userDatasets.map((ud) => ud.datasetId);
  }

  // If no search term, return empty results
  if (!searchTerm.trim()) {
    return {
      datasets: [],
      total: 0,
      page,
      limit: VISIBLE_LIMIT,
      queryDuration: "0ms",
      existingDatasetIds,
    };
  }

  try {
    const validatedOffset = Math.min(offset, maxOffset);
    const validatedPageForOffset =
      validatedOffset !== offset
        ? Math.floor(validatedOffset / FETCH_LIMIT) + 1
        : page;

    const index = meilisearch.index("dataset");
    const searchResults = await index.search(searchTerm, {
      limit: FETCH_LIMIT,
      offset: validatedOffset,
    });

    const existingSet = new Set(existingDatasetIds);

    // Extract dataset IDs from search results, filter out existing ones
    const allDatasetIds = searchResults.hits
      .map((hit) => {
        const { id } = hit as Record<string, unknown>;

        return typeof id === "string" ? parseInt(id, 10) : id;
      })
      .filter(
        (id): id is number => typeof id === "number" && !isNaN(id),
      ) as number[];

    const datasetIds = allDatasetIds
      .filter((id) => !existingSet.has(id))
      .slice(0, VISIBLE_LIMIT);

    const rawTotalCount = searchResults.estimatedTotalHits || 0;
    const cappedTotal = Math.min(rawTotalCount, MEILISEARCH_MAX_RESULTS);

    // Adjust total so that (total / VISIBLE_LIMIT) gives the correct page count.
    // Each Meilisearch page covers FETCH_LIMIT items, so divide total proportionally.
    const totalCount = Math.ceil(cappedTotal / FETCH_LIMIT) * VISIBLE_LIMIT;

    if (datasetIds.length === 0) {
      const queryEndTime = performance.now();
      const queryDuration = queryEndTime - queryStartTime;
      const executionTime =
        queryDuration > 1000
          ? `${(queryDuration / 1000).toFixed(2)}s`
          : `${queryDuration.toFixed(2)}ms`;

      return {
        datasets: [],
        total: totalCount,
        page,
        limit: VISIBLE_LIMIT,
        queryDuration: executionTime,
        existingDatasetIds,
      };
    }

    const datasets = await prisma.dataset.findMany({
      where: {
        id: { in: datasetIds },
      },
      select: {
        id: true,
        title: true,
        description: true,
        version: true,
        publishedAt: true,
        _count: {
          select: {
            citations: true,
          },
        },
      },
    });

    const authors = await prisma.datasetAuthor.findMany({
      where: {
        datasetId: { in: datasetIds },
      },
      select: {
        datasetId: true,
        name: true,
      },
    });

    const authorsByDataset = authors.reduce(
      (acc: Record<number, Array<{ name: string }>>, author) => {
        if (!acc[author.datasetId]) {
          acc[author.datasetId] = [];
        }
        acc[author.datasetId]?.push({ name: author.name });

        return acc;
      },
      {} as Record<number, Array<{ name: string }>>,
    );

    const datasetMap = new Map(datasets.map((d) => [d.id, d]));
    const formattedDatasets = datasetIds
      .map((id: number) => {
        const dataset = datasetMap.get(id);
        if (!dataset) return null;

        const datasetAuthors = authorsByDataset[dataset.id] || [];
        const authorsNamesString = datasetAuthors
          .map((author: { name: string }) => author.name)
          .join("; ");

        return {
          id: dataset.id,
          title: dataset.title,
          authors: authorsNamesString,
          version: dataset.version,
          publishedAt: dataset.publishedAt,
          citationCount: dataset._count.citations,
        };
      })
      .filter(
        (
          item,
        ): item is {
          id: number;
          title: string;
          authors: string;
          version: string | null;
          publishedAt: Date;
          citationCount: number;
        } => item !== null,
      );

    const calculatedMaxPage =
      totalCount > 0 ? Math.ceil(totalCount / VISIBLE_LIMIT) : 1;
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
      datasets: formattedDatasets,
      total: totalCount,
      page: validatedPage,
      limit: VISIBLE_LIMIT,
      queryDuration: executionTime,
      existingDatasetIds,
    };
  } catch (error) {
    console.error("Search error:", error);
    throw createError({
      statusCode: 500,
      statusMessage:
        "Search failed. Please ensure Meilisearch is configured and the dataset index exists.",
    });
  }
});

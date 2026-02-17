// Public dataset search - no auth required. Returns a paginated list of datasets.
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
      datasets: [],
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

    const index = meilisearch.index("dataset");
    const searchResults = await index.search(searchTerm, {
      limit,
      offset: validatedOffset,
    });

    const datasetIds = searchResults.hits
      .map((hit) => {
        const id = (hit as Record<string, unknown>).id;

        return typeof id === "string" ? parseInt(id, 10) : id;
      })
      .filter(
        (id): id is number => typeof id === "number" && !isNaN(id),
      ) as number[];

    if (datasetIds.length === 0) {
      const queryEndTime = performance.now();
      const queryDuration = queryEndTime - queryStartTime;
      const executionTime =
        queryDuration > 1000
          ? `${(queryDuration / 1000).toFixed(2)}s`
          : `${queryDuration.toFixed(2)}ms`;

      const rawTotalCount = searchResults.estimatedTotalHits || 0;
      const totalCount = Math.min(rawTotalCount, MEILISEARCH_MAX_RESULTS);

      return {
        datasets: [],
        total: totalCount,
        page,
        limit,
        queryDuration: executionTime,
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
        identifier: true,
        identifierType: true,
        publishedAt: true,
        _count: {
          select: {
            citations: true,
            mentions: true,
          },
        },
      },
    });

    const dIndexRows = await prisma.dIndex.findMany({
      where: { datasetId: { in: datasetIds } },
      orderBy: { year: "desc" },
      select: { datasetId: true, score: true },
    });
    const dIndexByDatasetId = new Map<number, number>();
    for (const row of dIndexRows) {
      if (!dIndexByDatasetId.has(row.datasetId)) {
        dIndexByDatasetId.set(row.datasetId, row.score);
      }
    }

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
        acc[author.datasetId].push({ name: author.name });

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
          identifier: dataset.identifier,
          identifierType: dataset.identifierType,
          publishedAt: dataset.publishedAt,
          dIndex: dIndexByDatasetId.get(dataset.id) ?? 0,
          citationCount: dataset._count.citations,
          mentionCount: dataset._count.mentions,
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
          identifier: string;
          identifierType: string;
          publishedAt: Date;
          dIndex: number;
          citationCount: number;
          mentionCount: number;
        } => item !== null,
      );

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
      datasets: formattedDatasets,
      total: finalTotal,
      page: validatedPage,
      limit,
      queryDuration: executionTime,
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

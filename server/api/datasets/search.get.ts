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

  const VISIBLE_LIMIT = 10;
  const MEILISEARCH_MAX_RESULTS = 1000;

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
    // Fetch all matching hits (up to Meilisearch's result cap) in one go, then
    // filter out existing datasets and paginate in memory. This avoids losing
    // results: filtering per-page batch can discard eligible items that don't
    // happen to land within that batch's slice.
    const index = meilisearch.index("dataset");
    const searchResults = await index.search(
      autoExactMatchSearchTerm(searchTerm),
      {
        limit: MEILISEARCH_MAX_RESULTS,
        offset: 0,
        attributesToRetrieve: ["id"],
      },
    );

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

    const eligibleDatasetIds = allDatasetIds.filter(
      (id) => !existingSet.has(id),
    );

    const totalCount = eligibleDatasetIds.length;
    const maxPage = totalCount > 0 ? Math.ceil(totalCount / VISIBLE_LIMIT) : 1;
    const validatedPage = Math.max(1, Math.min(page, maxPage));

    const datasetIds = eligibleDatasetIds.slice(
      (validatedPage - 1) * VISIBLE_LIMIT,
      validatedPage * VISIBLE_LIMIT,
    );

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
        page: validatedPage,
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

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

  // Use Meilisearch default limit of 20 results per page
  // Note: Meilisearch has a maximum of 1000 results per query
  // So max offset is 1000 - limit = 980 (for limit 20, max page is 50)
  const limit = 20;
  const MEILISEARCH_MAX_RESULTS = 1000;
  const maxOffset = MEILISEARCH_MAX_RESULTS - limit; // 980
  const maxPage = Math.floor(MEILISEARCH_MAX_RESULTS / limit); // 50
  const offset = (page - 1) * limit;

  // If no search term, return empty results
  if (!searchTerm.trim()) {
    // Still fetch existing dataset IDs if userid is provided
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

    return {
      datasets: [],
      total: 0,
      page,
      limit,
      queryDuration: "0ms",
      existingDatasetIds,
    };
  }

  try {
    // Validate offset doesn't exceed Meilisearch's limit
    // Meilisearch can only return up to 1000 results total
    const validatedOffset = Math.min(offset, maxOffset);
    const validatedPageForOffset =
      validatedOffset !== offset
        ? Math.floor(validatedOffset / limit) + 1
        : page;

    // Search Meilisearch index for dataset IDs
    const index = meilisearch.index("dataset");
    const searchResults = await index.search(searchTerm, {
      limit: limit,
      offset: validatedOffset,
    });

    // Extract dataset IDs from search results and convert to numbers
    const datasetIds = searchResults.hits
      .map((hit) => {
        const id = (hit as Record<string, unknown>).id;

        return typeof id === "string" ? parseInt(id, 10) : id;
      })
      .filter(
        (id): id is number => typeof id === "number" && !isNaN(id),
      ) as number[];

    // If no results from Meilisearch, return empty
    if (datasetIds.length === 0) {
      const queryEndTime = performance.now();
      const queryDuration = queryEndTime - queryStartTime;
      const executionTime =
        queryDuration > 1000
          ? `${(queryDuration / 1000).toFixed(2)}s`
          : `${queryDuration.toFixed(2)}ms`;

      // Still fetch existing dataset IDs if userid is provided
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

      // Cap total at Meilisearch's maximum (1000) for pagination purposes
      const rawTotalCount = searchResults.estimatedTotalHits || 0;
      const totalCount = Math.min(rawTotalCount, MEILISEARCH_MAX_RESULTS);

      return {
        datasets: [],
        total: totalCount,
        page,
        limit,
        queryDuration: executionTime,
        existingDatasetIds,
      };
    }

    // Fetch full dataset details from database
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

    // Get authors for each dataset
    const authors = await prisma.datasetAuthor.findMany({
      where: {
        datasetId: { in: datasetIds },
      },
      select: {
        datasetId: true,
        name: true,
      },
    });

    // Group authors by dataset
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

    // Format results - maintain order from Meilisearch results
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

    // Always get total count from Meilisearch (don't cache it)
    // This ensures accuracy as Meilisearch's estimatedTotalHits is the source of truth
    const rawTotalCount = searchResults.estimatedTotalHits || 0;

    // Cap total at Meilisearch's maximum (1000) for pagination purposes
    // This prevents trying to access pages beyond what Meilisearch can return
    const totalCount = Math.min(rawTotalCount, MEILISEARCH_MAX_RESULTS);

    // Validate page number - use the smaller of calculated max page or Meilisearch limit
    const calculatedMaxPage =
      totalCount > 0 ? Math.ceil(totalCount / limit) : 1;
    const actualMaxPage = Math.min(calculatedMaxPage, maxPage);
    const validatedPage = Math.max(
      1,
      Math.min(validatedPageForOffset, actualMaxPage),
    );

    // Fetch existing dataset IDs for the user if userid is provided
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

    const queryEndTime = performance.now();
    const queryDuration = queryEndTime - queryStartTime;
    const executionTime =
      queryDuration > 1000
        ? `${(queryDuration / 1000).toFixed(2)}s`
        : `${queryDuration.toFixed(2)}ms`;

    // Ensure total never exceeds Meilisearch's limit (safety check)
    const finalTotal = Math.min(totalCount, MEILISEARCH_MAX_RESULTS);

    return {
      datasets: formattedDatasets,
      total: finalTotal, // Capped at 1000 to match Meilisearch's limit
      page: validatedPage, // Return validated page to ensure frontend stays in sync
      limit,
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

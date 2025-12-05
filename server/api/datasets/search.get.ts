import prisma from "../../utils/prisma";
import meilisearch from "../../utils/meilisearch";

// returns a paginated list of datasets
export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event);

  const { user } = session;
  const userId = user.id;

  const queryStartTime = performance.now();

  const query = getQuery(event);
  const searchTerm = (query.q as string) || "";
  const page = parseInt(query.page as string) || 1;
  const total = parseInt(query.total as string) || 0;
  const userid = userId;

  // Use Meilisearch default limit of 20 results per page
  const limit = 20;
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
    // Search Meilisearch index for dataset IDs
    const index = meilisearch.index("dataset");
    const searchResults = await index.search(searchTerm, {
      limit: limit,
      offset: offset,
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

      return {
        datasets: [],
        total: searchResults.estimatedTotalHits || 0,
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
        } => item !== null,
      );

    // Get total count from Meilisearch
    let totalCount = total;
    if (total === -1) {
      totalCount = searchResults.estimatedTotalHits || 0;
    }

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

    return {
      datasets: formattedDatasets,
      total: totalCount,
      page,
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

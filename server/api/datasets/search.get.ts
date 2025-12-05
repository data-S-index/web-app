import prisma from "../../utils/prisma";

// returns a paginated list of datasets
export default defineEventHandler(async (event) => {
  const queryStartTime = performance.now();

  const query = getQuery(event);
  const searchTerm = (query.q as string) || "";
  const page = parseInt(query.page as string) || 1;
  const total = parseInt(query.total as string) || 0;

  // we will only return 10 datasets per page
  const limit = 10;
  const offset = (page - 1) * limit;

  // If no search term, return empty results
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
    // Full-text search using search_vector (indexed by title)
    // This uses PostgreSQL's full-text search with ranking
    type DatasetResult = {
      id: number;
      title: string;
      identifier: string;
      description: string | null;
      rank: number;
      datasetAuthors: Array<{ name: string }>;
    };

    const datasets = await prisma.$queryRaw<DatasetResult[]>`
      SELECT 
        d.id,
        d.title,
        d.identifier,
        d.description,
        COALESCE(
          ts_rank(d.search_vector, plainto_tsquery('english', ${searchTerm})),
          0
        ) + 
        CASE 
          WHEN d.identifier ILIKE '%' || ${searchTerm} || '%' THEN 0.3
          ELSE 0
        END +
        CASE 
          WHEN EXISTS (
            SELECT 1 FROM "DatasetIdentifier" di 
            WHERE di."datasetId" = d.id 
            AND di.identifier ILIKE '%' || ${searchTerm} || '%'
          ) THEN 0.3
          ELSE 0
        END AS rank
      FROM "Dataset" d
      WHERE 
        d.search_vector @@ plainto_tsquery('english', ${searchTerm})
        OR d.identifier ILIKE '%' || ${searchTerm} || '%'
        OR EXISTS (
          SELECT 1 FROM "DatasetIdentifier" di 
          WHERE di."datasetId" = d.id 
          AND di.identifier ILIKE '%' || ${searchTerm} || '%'
        )
      ORDER BY rank DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `;

    // Get authors for each dataset
    const datasetIds = datasets.map((d) => d.id);
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
      (acc, author) => {
        if (!acc[author.datasetId]) {
          acc[author.datasetId] = [];
        }
        acc[author.datasetId].push({ name: author.name });

        return acc;
      },
      {} as Record<number, Array<{ name: string }>>,
    );

    // Format results
    const formattedDatasets = datasets.map((dataset) => {
      const authors = authorsByDataset[dataset.id] || [];
      const authorsNamesString = authors
        .map((author) => author.name)
        .join("; ");

      return {
        id: dataset.id,
        title: dataset.title,
        authors: authorsNamesString,
      };
    });

    // Get total count if needed
    let totalCount = total;
    if (total === -1) {
      const countResult = await prisma.$queryRaw<[{ count: bigint }]>`
        SELECT COUNT(DISTINCT d.id)::int AS count
        FROM "Dataset" d
        WHERE 
          d.search_vector @@ plainto_tsquery('english', ${searchTerm})
          OR d.identifier ILIKE '%' || ${searchTerm} || '%'
          OR EXISTS (
            SELECT 1 FROM "DatasetIdentifier" di 
            WHERE di."datasetId" = d.id 
            AND di.identifier ILIKE '%' || ${searchTerm} || '%'
          )
      `;
      totalCount = Number(countResult[0]?.count || 0);
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
    };
  } catch (error) {
    console.error("Search error:", error);
    throw createError({
      statusCode: 500,
      statusMessage:
        "Search failed. Please ensure database indexes are set up.",
    });
  }
});

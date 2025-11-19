// returns a paginated list of datasets
export default defineEventHandler(async (event) => {
  const queryStartTime = performance.now();

  const query = getQuery(event);
  const searchTerm = query.q as string;
  const page = parseInt(query.page as string) || 1;
  const total = parseInt(query.total as string) || 0;

  // we will only return 10 datasets per page
  const limit = 10;
  const offset = (page - 1) * limit;

  const whereClause = {
    OR: [
      {
        title: {
          contains: searchTerm,
          mode: "insensitive" as const,
        },
      },
      {
        description: {
          contains: searchTerm,
          mode: "insensitive" as const,
        },
      },
      {
        doi: {
          contains: searchTerm,
          mode: "insensitive" as const,
        },
      },
    ],
  };

  const datasetsQuery = await prisma.dataset.findMany({
    where: whereClause,
    select: {
      id: true,
      title: true,
      doi: true,
      authors: true,
      description: true,
      publishedAt: true,
    },
    skip: offset,
    take: limit,
  });

  const datasets = datasetsQuery.map((dataset) => {
    const authors = dataset.authors
      ? JSON.parse(JSON.stringify(dataset.authors))
      : [];

    const authorsNamesString = authors
      .map((author: Author) => author.name)
      .join("; ");

    return {
      id: dataset.id,
      title: dataset.title,
      doi: dataset.doi,
      authors: authorsNamesString,
      description: dataset.description,
      publishedAt: dataset.publishedAt,
    };
  });

  // only return the total if it is not -1
  if (total === -1) {
    const totalCount = await prisma.dataset.count({
      where: whereClause,
    });
    const queryEndTime = performance.now();
    const queryDuration = queryEndTime - queryStartTime;
    const executionTime =
      queryDuration > 1000
        ? `${(queryDuration / 1000).toFixed(2)}s`
        : `${queryDuration.toFixed(2)}ms`;

    return {
      datasets,
      total: totalCount,
      page,
      limit,
      queryDuration: executionTime,
    };
  }

  const queryEndTime = performance.now();
  const queryDuration = queryEndTime - queryStartTime;
  const executionTime =
    queryDuration > 1000
      ? `${(queryDuration / 1000).toFixed(2)}s`
      : `${queryDuration.toFixed(2)}ms`;

  return {
    datasets,
    total,
    page,
    limit,
    queryDuration: executionTime,
  };
});

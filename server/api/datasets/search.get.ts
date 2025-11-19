// returns a paginated list of datasets
export default defineEventHandler(async (event) => {
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

  const queryStartTime = performance.now();
  const datasets = await prisma.dataset.findMany({
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
  const queryEndTime = performance.now();
  const queryDuration = queryEndTime - queryStartTime;
  console.log(
    `[${new Date().toISOString()}] Query took ${queryDuration.toFixed(2)}ms`,
  );

  // only return the total if it is not -1
  if (total === -1) {
    console.log(`[${new Date().toISOString()}] Doing total count`);
    const countStartTime = performance.now();
    const totalCount = await prisma.dataset.count({
      where: whereClause,
    });
    const countEndTime = performance.now();
    const countDuration = countEndTime - countStartTime;
    console.log(
      `[${new Date().toISOString()}] Count query took ${countDuration.toFixed(2)}ms`,
    );

    return {
      datasets,
      total: totalCount,
      page,
      limit,
    };
  }
  console.log(`[${new Date().toISOString()}] Skipping total count`);

  return {
    datasets,
    total,
    page,
    limit,
  };
});

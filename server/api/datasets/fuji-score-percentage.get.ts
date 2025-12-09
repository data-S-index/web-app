const MAX_ID = 49009522;

// Returns the percentage of datasets that have a fuji score
export default defineEventHandler(async (_event) => {
  const totalDatasets = MAX_ID;

  // Get count of datasets with fuji scores
  const datasetsWithFujiScore = await prisma.dataset.count({
    where: {
      fujiScore: {
        isNot: null,
      },
    },
  });

  // Calculate percentage
  const percentage =
    totalDatasets > 0
      ? ((datasetsWithFujiScore / totalDatasets) * 100 * 1000) / 1000
      : 0;

  // Get count of jobs done in the last 10 minutes
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
  console.log(tenMinutesAgo);
  const jobsDoneLast10Minutes = await prisma.fujiScore.count({
    where: {
      updated: {
        gte: tenMinutesAgo,
      },
    },
  });

  return {
    percentage,
    totalDatasets,
    datasetsWithFujiScore,
    jobsDoneLast10Minutes,
  };
});

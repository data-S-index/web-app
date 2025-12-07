import prisma from "../../utils/prisma";

// Returns the percentage of datasets that have a fuji score
export default defineEventHandler(async (_event) => {
  // Get total count of datasets
  const totalDatasets = await prisma.dataset.count();

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

  return {
    percentage,
    totalDatasets,
    datasetsWithFujiScore,
  };
});

const MAX_ID = 49009522;
const CHECK_COUNT = 5; // Check 20 datasets after randomId

export default defineEventHandler(async () => {
  const randomId = Math.floor(Math.random() * MAX_ID) + 1;

  // Generate IDs to check (randomId + 1, randomId + 2, ..., randomId + CHECK_COUNT)
  const idsToCheck = Array.from(
    { length: CHECK_COUNT },
    (_, i) => randomId + i + 1,
  ).filter((id) => id <= MAX_ID);

  if (idsToCheck.length === 0) {
    return [];
  }

  const datasets = await prisma.dataset.findMany({
    where: {
      id: { in: idsToCheck },
    },
    include: {
      fujiScore: true,
    },
  });

  // Only return datasets that don't have a fujiscore
  const datasetsWithoutFujiScore = datasets
    .filter((dataset) => !dataset.fujiScore)
    .map((dataset) => ({
      datasetId: dataset.id,
      identifier: dataset.identifier,
      identifierType: dataset.identifierType,
    }));

  return datasetsWithoutFujiScore;
});

// Returns a list of datasets that need to be scored. Uses database-level random selection to avoid bias.
export default defineEventHandler(async (_event) => {
  const datasets = await prisma.$queryRaw<{ id: number; identifier: string }[]>`
    SELECT d.id, d.identifier
    FROM "Dataset" d
    LEFT JOIN "FujiScore" fs ON fs."datasetId" = d.id
    WHERE fs.id IS NULL
      AND d."identifierType" = 'doi'
    ORDER BY RANDOM()
    LIMIT 3
  `;

  return datasets || [];
});

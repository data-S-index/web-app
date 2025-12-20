export default defineEventHandler(async (_event) => {
  const rows = await prisma.$queryRaw<
    { id: number; identifier: string; identifierType: string }[]
  >`
    SELECT d.id, d.identifier, d."identifierType"
    FROM "Dataset" d
    TABLESAMPLE SYSTEM (0.05)
    LEFT JOIN "FujiScore" f ON f."datasetId" = d.id
    WHERE d."identifierType" = 'doi'
      AND f."datasetId" IS NULL
    LIMIT 5;
  `;

  return rows;
});

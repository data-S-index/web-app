interface YearlyTotal {
  year: number;
  raw: number;
  weighted: number;
}

export default defineEventHandler(async (event) => {
  const { userid } = event.context.params as { userid: string };
  const userId = userid;

  // Aggregate in the database so we don't ship every citation/mention row
  const [citations, mentions] = await Promise.all([
    prisma.$queryRaw<YearlyTotal[]>`
      SELECT
        EXTRACT(YEAR FROM c."citedDate")::int AS year,
        COUNT(*)::int AS raw,
        SUM(c."citationWeight")::float AS weighted
      FROM "Citation" c
      JOIN "UserDataset" ud ON ud."datasetId" = c."datasetId"
      WHERE ud."userId" = ${userId}
      GROUP BY 1
      ORDER BY 1
    `,
    prisma.$queryRaw<YearlyTotal[]>`
      SELECT
        EXTRACT(YEAR FROM m."mentionedDate")::int AS year,
        COUNT(*)::int AS raw,
        SUM(m."mentionWeight")::float AS weighted
      FROM "Mention" m
      JOIN "UserDataset" ud ON ud."datasetId" = m."datasetId"
      WHERE ud."userId" = ${userId}
      GROUP BY 1
      ORDER BY 1
    `,
  ]);

  return { citations, mentions };
});

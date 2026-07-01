async function claimNextJob(): Promise<number | null> {
  const rows = await prisma.$queryRaw<{ datasetId: number }[]>`
    DELETE FROM "FujiJob"
    WHERE "datasetId" = (
      SELECT "datasetId" FROM "FujiJob"
      ORDER BY "created" ASC
      LIMIT 1
      FOR UPDATE SKIP LOCKED
    )
    RETURNING "datasetId"
  `;

  return rows[0] ? Number(rows[0].datasetId) : null;
}

/**
 * POST /api/fuji-job/claim
 * Claims the next queued FUJI job and returns the dataset to score. Scoring
 * decisions (hardcoded shortcuts, FUJI calls, metric/software versions) are
 * made by the caller and reported back via /api/fuji-job/submit.
 */
export default defineEventHandler(async () => {
  const datasetId = await claimNextJob();

  if (datasetId === null) {
    return { status: "empty" as const };
  }

  const dataset = await prisma.dataset.findUnique({
    where: { id: datasetId },
    select: { identifier: true, identifierType: true, publisherId: true },
  });

  if (!dataset) {
    return {
      status: "skipped" as const,
      datasetId,
      reason: "Dataset not found",
    };
  }

  return {
    status: "pending" as const,
    datasetId,
    identifier: dataset.identifier,
    publisherId: dataset.publisherId,
  };
});

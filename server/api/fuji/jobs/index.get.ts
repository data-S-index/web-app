// Atomically read and delete a job from the FujiJob table
// Uses PostgreSQL's DELETE ... RETURNING for atomicity under high concurrency
export default defineEventHandler(async () => {
  try {
    // Atomically delete and return two jobs using raw SQL
    // This ensures that even with thousands of concurrent requests,
    // each job is only returned once
    const deletedJobs = await prisma.$queryRaw<Array<{ datasetId: number }>>`
      DELETE FROM "FujiJob"
      WHERE "datasetId" IN (
        SELECT "datasetId" FROM "FujiJob"
        ORDER BY "datasetId" ASC
        LIMIT 2
        FOR UPDATE SKIP LOCKED
      )
      RETURNING "datasetId"
    `;

    // If no jobs were found, return empty array
    if (!deletedJobs || deletedJobs.length === 0) {
      return [];
    }

    // Fetch the dataset information for all deleted jobs
    const datasetIds = deletedJobs.map((job) => job.datasetId);
    const datasets = await prisma.dataset.findMany({
      where: {
        id: { in: datasetIds },
      },
      select: {
        id: true,
        identifier: true,
        identifierType: true,
      },
    });

    // Return datasets in the same order as the deleted jobs
    const datasetMap = new Map(datasets.map((d) => [d.id, d]));

    return deletedJobs
      .map((job) => datasetMap.get(job.datasetId))
      .filter((dataset) => dataset !== undefined) as typeof datasets;
  } catch (error) {
    console.error("Error fetching job:", error);

    return [];
  }
});

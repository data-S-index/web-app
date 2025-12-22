// Atomically read and delete a job from the FujiJob table
// Uses PostgreSQL's DELETE ... RETURNING for atomicity under high concurrency
export default defineEventHandler(async () => {
  const limit = 3;
  try {
    // Atomically delete and return the specified number of jobs using raw SQL
    // This ensures that even with thousands of concurrent requests,
    // each job is only returned once
    const deletedJobs = await prisma.$queryRaw<Array<{ datasetId: number }>>`
      DELETE FROM "FujiJob"
      WHERE "datasetId" IN (
        SELECT "datasetId" FROM "FujiJob"
        ORDER BY "datasetId" ASC
        LIMIT ${limit}
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

    const jobs = deletedJobs
      .map((job) => datasetMap.get(job.datasetId))
      .filter((dataset) => dataset !== undefined) as typeof datasets;

    if (jobs.length > limit) {
      const url =
        "https://logwatch.fairdataihub.org/api/log/cmjgno6kb00067h01ukl411ya";

      const data = {
        level: "warning",
        message: JSON.stringify(jobs),
        type: "json",
      };

      await fetch(url, {
        method: "POST",
        body: JSON.stringify(data),
        headers: {
          "Content-Type": "application/json",
        },
      });
    }

    return jobs;
  } catch (error) {
    console.error("Error fetching job:", error);

    return [];
  }
});

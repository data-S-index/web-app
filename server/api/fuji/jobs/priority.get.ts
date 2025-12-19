// Returns a list of fuji jobs to the background worker
export default defineEventHandler(async (_event) => {
  const jobs = await prisma.fujiJob.findMany({
    take: 30,
    select: { dataset: true },
  });

  if (!jobs) {
    return [];
  }

  const datasets = jobs.map((job) => ({
    id: job.dataset.id,
    identifier: job.dataset.identifier,
    identifierType: job.dataset.identifierType,
  }));

  return datasets || [];
});

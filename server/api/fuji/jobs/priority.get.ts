// Returns a list of fuji jobs to the background worker
export default defineEventHandler(async (_event) => {
  // try {
  //   const jobs = await prisma.fujiJob.findMany({
  //     take: 30,
  //     select: {
  //       dataset: {
  //         select: {
  //           id: true,
  //           identifier: true,
  //           identifierType: true,
  //         },
  //       },
  //     },
  //   });

  //   if (!jobs) {
  //     return [];
  //   }

  //   const datasets = jobs.map((job) => ({
  //     id: job.dataset.id,
  //     identifier: job.dataset.identifier,
  //     identifierType: job.dataset.identifierType,
  //   }));

  //   return datasets || [];
  // } catch (error) {
  //   console.error(error);

  return [];
  // 1}
});

export default defineEventHandler(async (event) => {
  const { userid } = event.context.params as { userid: string };
  const userId = userid;

  const userDatasets = await prisma.userDataset.findMany({
    where: {
      userId,
    },
    orderBy: { dataset: { publishedAt: "desc" } },
    include: {
      dataset: {
        include: {
          _count: {
            select: {
              citations: true,
              mentions: true,
            },
          },
          fujiScore: {
            select: {
              score: true,
              evaluationDate: true,
              metricVersion: true,
              softwareVersion: true,
            },
          },
          dindices: {
            select: {
              score: true,
              year: true,
            },
            orderBy: {
              year: "desc",
            },
          },
          datasetAuthors: {
            select: {
              name: true,
              nameType: true,
              affiliations: true,
              nameIdentifiers: true,
            },
          },
        },
      },
    },
  });

  // Find dataset that don't have a fuji score
  const datasetIDsWithoutFujiScore = userDatasets
    .filter((dataset) => !dataset.dataset.fujiScore)
    .map((dataset) => dataset.datasetId);

  // Queue a job for each dataset that doesn't have a fuji score
  if (datasetIDsWithoutFujiScore.length > 0) {
    await prisma.fujiJob.createMany({
      data: datasetIDsWithoutFujiScore.map((datasetId) => ({ datasetId })),
      skipDuplicates: true,
    });
  }

  return (
    userDatasets || {
      data: [],
      statusCode: 200,
      statusMessage: "No datasets found",
    }
  );
});

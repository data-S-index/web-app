export default defineEventHandler(async (event) => {
  const { userid } = event.context.params as { userid: string };
  const userId = userid;

  const userDatasets = await prisma.userDataset.findMany({
    where: {
      userId,
    },
    include: {
      dataset: {
        include: {
          citations: {
            select: {
              citationLink: true,
              datacite: true,
              mdc: true,
              openAlex: true,
              citedDate: true,
            },
          },
          mentions: {
            select: {
              mentionLink: true,
              source: true,
              mentionedDate: true,
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

  // Create a new job for each dataset that doesn't have a fuji score
  for (const datasetId of datasetIDsWithoutFujiScore) {
    await prisma.fujiJob.create({
      data: {
        datasetId: datasetId,
      },
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

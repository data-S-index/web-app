export default defineEventHandler(async (event) => {
  const { datasetid } = event.context.params as { datasetid: string };

  const dataset = await prisma.dataset.findUnique({
    where: {
      id: parseInt(datasetid),
    },
    include: {
      datasetAuthors: {
        select: {
          name: true,
          nameType: true,
          affiliations: true,
          nameIdentifiers: true,
        },
      },
      citations: {
        select: {
          citationLink: true,
          datacite: true,
          mdc: true,
          openAlex: true,
          citedDate: true,
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
      mentions: {
        select: {
          mentionLink: true,
          source: true,
          mentionedDate: true,
        },
      },
    },
  });

  if (!dataset) {
    throw createError({
      statusCode: 404,
      statusMessage: "Dataset not found",
    });
  }

  return dataset;
});

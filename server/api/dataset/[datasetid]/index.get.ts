export default defineEventHandler(async (event) => {
  const { datasetid } = event.context.params as { datasetid: string };

  const dataset = await prisma.dataset.findUnique({
    where: {
      id: parseInt(datasetid),
    },
    include: {
      citations: true,
      fujiScore: true,
      mentions: true,
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

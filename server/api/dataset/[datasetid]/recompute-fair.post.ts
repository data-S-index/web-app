export default defineEventHandler(async (event) => {
  await requireAdminSession(event);

  const { datasetid } = event.context.params as { datasetid: string };
  const datasetId = Number.parseInt(datasetid, 10);

  if (!Number.isInteger(datasetId) || datasetId <= 0) {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid dataset id",
    });
  }

  const dataset = await prisma.dataset.findUnique({
    where: { id: datasetId },
    select: { id: true },
  });

  if (!dataset) {
    throw createError({
      statusCode: 404,
      statusMessage: "Dataset not found",
    });
  }

  const existingJob = await prisma.fujiJob.findUnique({
    where: { datasetId },
    select: { datasetId: true },
  });

  if (existingJob) {
    return {
      datasetId,
      alreadyQueued: true,
      message: "Dataset is already queued for FAIR recomputation",
    };
  }

  await prisma.fujiJob.create({
    data: { datasetId },
  });

  return {
    datasetId,
    alreadyQueued: false,
    message: "Dataset queued for FAIR recomputation",
  };
});

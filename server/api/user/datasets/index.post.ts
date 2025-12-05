import { z } from "zod";

const attachDatasetsSchema = z.object({
  datasetIds: z.array(z.string()),
});

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event);

  const { user } = session;
  const userId = user.id;

  const body = await readValidatedBody(event, (b) =>
    attachDatasetsSchema.safeParse(b),
  );

  if (!body.success) {
    console.log(body.error);

    throw createError({
      statusCode: 400,
      statusMessage: "Missing dataset information",
    });
  }

  const datasetIds = body.data.datasetIds;

  await prisma.userDataset.createMany({
    data: datasetIds.map((datasetId) => ({
      userId: userId,
      datasetId: parseInt(datasetId),
    })),
  });

  return { message: "Datasets attached to user" };
});

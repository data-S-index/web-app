import { z } from "zod";

const removeDatasetSchema = z.object({
  datasetId: z.number(),
});

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event);

  const { user } = session;
  const userId = user.id;

  const body = await readValidatedBody(event, (b) =>
    removeDatasetSchema.safeParse(b),
  );

  if (!body.success) {
    console.log(body.error);

    throw createError({
      statusCode: 400,
      statusMessage: "Missing dataset information",
    });
  }

  const { datasetId } = body.data;

  // Check if the user dataset relationship exists
  const userDataset = await prisma.userDataset.findUnique({
    where: {
      userId_datasetId: {
        userId: userId,
        datasetId: datasetId,
      },
    },
  });

  if (!userDataset) {
    throw createError({
      statusCode: 404,
      statusMessage: "Dataset not found in user's collection",
    });
  }

  // Delete the user dataset relationship
  await prisma.userDataset.delete({
    where: {
      userId_datasetId: {
        userId: userId,
        datasetId: datasetId,
      },
    },
  });

  return { message: "Dataset removed from user" };
});

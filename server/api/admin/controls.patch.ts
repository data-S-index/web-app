export default defineEventHandler(async (event) => {
  const session = await requireAdminSession(event);

  const body = await readBody<{ datasetApiBlocked?: unknown }>(event);

  if (typeof body?.datasetApiBlocked !== "boolean") {
    throw createError({
      statusCode: 400,
      statusMessage: "datasetApiBlocked must be a boolean",
    });
  }

  await setDatasetApiBlocked(body.datasetApiBlocked);

  console.log(
    `Admin ${session.user.id} set dataset API block to ${body.datasetApiBlocked}`,
  );

  return {
    datasetApiBlocked: body.datasetApiBlocked,
  };
});

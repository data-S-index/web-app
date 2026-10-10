export default defineEventHandler(async (event) => {
  await requireAdminSession(event);

  return {
    datasetApiBlocked: await isDatasetApiBlocked(),
  };
});

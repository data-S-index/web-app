import { defineEventHandler } from "h3";
import { requireAdminSession } from "#server/utils/requireAdminSession";
import { isDatasetApiBlocked } from "#server/utils/datasetApiBlock";

export default defineEventHandler(async (event) => {
  await requireAdminSession(event);

  return {
    datasetApiBlocked: await isDatasetApiBlocked(),
  };
});

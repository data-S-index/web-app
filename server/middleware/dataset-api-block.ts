// Rejects /api/dataset/* requests while an admin has the block toggled on
// (see /admin/controls). Only applies to the published site, never in dev.

const BLOCKED_PREFIX = "/api/dataset/";

export default defineEventHandler(async (event) => {
  if (import.meta.dev) return;

  if (!event.path.startsWith(BLOCKED_PREFIX)) return;

  if (await isDatasetApiBlocked()) {
    setHeader(event, "Retry-After", 300);
    throw createError({
      statusCode: 503,
      statusMessage: "Dataset API temporarily unavailable",
    });
  }
});

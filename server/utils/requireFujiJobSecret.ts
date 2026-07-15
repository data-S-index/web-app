import type { H3Event } from "h3";

// Guards the fuji-job endpoints, which are called by an external worker
// rather than an authenticated user session.
export function requireFujiJobSecret(event: H3Event) {
  const expected = process.env.FUJI_JOB_SECRET;

  if (!expected) {
    throw createError({
      statusCode: 500,
      statusMessage: "FUJI_JOB_SECRET is not configured",
    });
  }

  const provided = getHeader(event, "x-fuji-job-secret");

  if (provided !== expected) {
    throw createError({
      statusCode: 401,
      statusMessage: "Unauthorized",
    });
  }
}

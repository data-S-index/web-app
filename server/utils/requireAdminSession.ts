import type { getUserSession } from "#imports";
import { requireUserSession } from "#imports";
import { createError } from "h3";

export async function requireAdminSession(
  event: Parameters<typeof getUserSession>[0],
) {
  const session = await requireUserSession(event);

  if (session.user.admin !== true) {
    throw createError({
      statusCode: 403,
      statusMessage: "Forbidden",
    });
  }

  return session;
}

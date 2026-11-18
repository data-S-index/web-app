import prisma from "#server/utils/prisma";
import { defineEventHandler, createError } from "h3";
import { requireUserSession, clearUserSession } from "#imports";

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event);
  const userId = session.user.id;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });

  if (!user) {
    throw createError({
      statusCode: 404,
      statusMessage: "User not found",
    });
  }

  await prisma.user.delete({
    where: { id: userId },
  });

  await clearUserSession(event);

  return { success: true };
});

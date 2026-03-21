export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const { environment } = config.public;

  if (environment !== "development") {
    throw createError({
      statusCode: 404,
      statusMessage: "Not enabled",
    });
  }

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

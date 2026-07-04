export default defineEventHandler(async (event) => {
  await requireAdminSession(event);

  const users = await prisma.user.findMany({
    where: {
      anonymous: false,
    },
    select: {
      id: true,
      login: true,
      givenName: true,
      familyName: true,
      created: true,
    },
    orderBy: {
      created: "desc",
    },
  });

  if (!users) {
    throw createError({
      statusCode: 404,
      statusMessage: "No users found",
    });
  }

  return users;
});

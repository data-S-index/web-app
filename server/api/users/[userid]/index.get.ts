export default defineEventHandler(async (event) => {
  const { userid } = event.context.params as { userid: string };
  const userId = userid;

  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      id: true,
      givenName: true,
      familyName: true,
      emailAddress: true,
    },
  });

  if (!user) {
    throw createError({
      statusCode: 404,
      statusMessage: "User not found",
    });
  }

  return user;
});


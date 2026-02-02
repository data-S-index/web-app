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

  const { user } = session;
  const userId = user.id;

  const userData = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      id: true,
      username: true,
      givenName: true,
      familyName: true,
      additionalNames: true,
      affiliation: true,
      homePage: true,
      areasOfInterest: true,
      created: true,
      updated: true,
    },
  });

  return userData;
});

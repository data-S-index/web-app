export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event);

  const { user } = session;
  const userId = user.id;

  const userDatasets = await prisma.userDataset.findMany({
    where: {
      userId,
    },
    include: {
      dataset: {
        include: {
          Citation: true,
          FujiScore: true,
        },
      },
    },
  });

  return (
    userDatasets || {
      data: [],
      statusCode: 200,
      statusMessage: "No datasets found",
    }
  );
});

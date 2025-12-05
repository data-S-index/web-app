export default defineEventHandler(async (event) => {
  const { userid } = event.context.params as { userid: string };
  const userId = userid;

  const userDatasets = await prisma.userDataset.findMany({
    where: {
      userId,
    },
    include: {
      dataset: {
        include: {
          citations: true,
          fujiScore: true,
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

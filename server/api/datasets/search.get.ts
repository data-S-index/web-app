export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const searchTerm = query.q as string;

  const datasets = await prisma.dataset.findMany({
    where: {
      OR: [
        {
          title: {
            contains: searchTerm,
            mode: "insensitive",
          },
        },
        {
          description: {
            contains: searchTerm,
            mode: "insensitive",
          },
        },
        {
          doi: {
            contains: searchTerm,
            mode: "insensitive",
          },
        },
      ],
    },
    select: {
      id: true,
      title: true,
      doi: true,
    },
  });

  return datasets || [];
});

// Returns a list of datasets that need to be scored. Uses a random ordering to avoid bias.
export default defineEventHandler(async (_event) => {
  const orderingFields = [
    "created",
    "id",
    "identifier",
    "title",
    "publisher",
    "publishedAt",
  ];

  const ordering = ["asc", "desc"];

  const orderingField =
    orderingFields[Math.floor(Math.random() * orderingFields.length)];
  const orderingDirection =
    ordering[Math.floor(Math.random() * ordering.length)];

  const datasets = await prisma.dataset.findMany({
    select: {
      id: true,
      identifier: true,
    },
    where: {
      fujiScore: null,
      identifierType: "doi",
    },
    orderBy: {
      [orderingField]: orderingDirection,
    },
    take: 10,
  });

  return datasets || [];
});

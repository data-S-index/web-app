// Returns a list of datasets that need to be scored. Uses database-level random selection to avoid bias.
const MAX_ID = 49009522;

export default defineEventHandler(async (_event) => {
  try {
    const startId = Math.floor(Math.random() * MAX_ID) + 1;

    // 1st pass: from random id upwards
    const first = await prisma.dataset.findMany({
      where: {
        id: { gte: startId },
        identifierType: "doi",
        // If relation is 1-1:
        fujiScore: null,
        // If relation is 1-N instead, use this instead:
        // FujiScore: { none: {} },
      },
      orderBy: { id: "asc" },
      take: 10,
      select: {
        id: true,
        identifier: true,
        identifierType: true,
      },
    });

    if (first.length >= 10) {
      return first;
    }

    // 2nd pass: wrap around from beginning up to startId
    const remaining = 10 - first.length;

    const second = await prisma.dataset.findMany({
      where: {
        id: { lt: startId },
        identifierType: "doi",
        fujiScore: null,
        // or FujiScore: { none: {} } as above
      },
      orderBy: { id: "asc" },
      take: remaining,
      select: {
        id: true,
        identifier: true,
        identifierType: true,
      },
    });

    return [...first, ...second];
  } catch (error) {
    console.error(error);

    return [];
  }
});

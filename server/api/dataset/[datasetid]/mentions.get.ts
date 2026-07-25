export default defineEventHandler(async (event) => {
  const { datasetid } = event.context.params as { datasetid: string };

  const mentions = await prisma.mention.findMany({
    where: {
      datasetId: parseInt(datasetid),
    },
    select: {
      mentionLink: true,
      mentionWeight: true,
      source: true,
      mentionedDate: true,
    },
  });

  if (!mentions) {
    return [];
  }

  return mentions;
});

export default defineEventHandler(async (event) => {
  const { datasetid } = event.context.params as { datasetid: string };

  const citations = await prisma.citation.findMany({
    where: {
      datasetId: parseInt(datasetid),
    },
    select: {
      citationLink: true,
      datacite: true,
      citationWeight: true,
      mdc: true,
      openAlex: true,
      citedDate: true,
    },
    orderBy: {
      citedDate: "desc",
    },
  });

  if (!citations) {
    return [];
  }

  return citations;
});

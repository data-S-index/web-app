import prisma from "../../../../utils/prisma";

export default defineEventHandler(async (event) => {
  const { auid } = event.context.params as { auid: string };

  if (!auid?.trim()) {
    throw createError({
      statusCode: 400,
      statusMessage: "User ID is required",
    });
  }

  const userDatasets = await prisma.automatedUserDataset.findMany({
    where: {
      automatedUserId: auid,
    },
    include: {
      dataset: {
        include: {
          citations: {
            select: {
              citationLink: true,
              datacite: true,
              mdc: true,
              openAlex: true,
              citedDate: true,
              citationWeight: true,
            },
          },
          mentions: {
            select: {
              mentionLink: true,
              source: true,
              mentionedDate: true,
              mentionWeight: true,
            },
          },
          fujiScore: {
            select: {
              score: true,
              evaluationDate: true,
              metricVersion: true,
              softwareVersion: true,
            },
          },
          dindices: {
            select: {
              score: true,
              created: true,
            },
            orderBy: {
              created: "desc",
            },
          },
          datasetAuthors: {
            select: {
              name: true,
              nameType: true,
              affiliations: true,
              nameIdentifiers: true,
            },
          },
        },
      },
    },
  });

  return userDatasets;
});

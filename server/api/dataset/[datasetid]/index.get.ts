export default defineEventHandler(async (event) => {
  const { datasetid } = event.context.params as { datasetid: string };

  const dataset = await prisma.dataset.findUnique({
    where: {
      id: parseInt(datasetid),
    },
    include: {
      datasetAuthors: {
        select: {
          name: true,
          nameType: true,
          affiliations: true,
          nameIdentifiers: true,
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
          year: true,
        },
        orderBy: {
          year: "asc",
        },
      },
      normalizationFactor: {
        select: {
          ft: true,
          ctw: true,
          mtw: true,
        },
      },
      datasetRights: {
        select: {
          name: true,
          identifier: true,
          uri: true,
        },
      },
      datasetTopic: true,
      _count: {
        select: {
          citations: true,
          mentions: true,
        },
      },
    },
  });

  if (!dataset) {
    throw createError({
      statusCode: 404,
      statusMessage: "Dataset not found",
    });
  }

  // // Upsert a new fuji job if dataset doesn't have a fuji score
  // if (!dataset.fujiScore) {
  //   await prisma.fujiJob.upsert({
  //     where: { datasetId: dataset.id },
  //     update: {},
  //     create: { datasetId: dataset.id },
  //   });
  // }

  const topic = dataset.datasetTopic;
  const domain =
    topic &&
    (topic.topicName ||
      topic.subfieldName ||
      topic.fieldName ||
      topic.domainName)
      ? {
          subfield_name: topic.subfieldName ?? undefined,
          field_name: topic.fieldName ?? undefined,
          domain_name: topic.domainName ?? undefined,
          score: topic.score ?? undefined,
          source: topic.source ?? undefined,
        }
      : null;

  const { datasetTopic: _t, ...rest } = dataset;

  const session = await getUserSession(event);
  const userId = session.user?.id;

  const isClaimedByUser = userId
    ? Boolean(
        await prisma.userDataset.findUnique({
          where: { userId_datasetId: { userId, datasetId: dataset.id } },
        }),
      )
    : false;

  return { ...rest, domain, isClaimedByUser };
});

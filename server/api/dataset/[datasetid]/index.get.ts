async function fetchDataset(datasetId: number) {
  // Counts are fetched separately: Prisma's `_count` include aggregates the
  // whole Citation/Mention tables before filtering, which doesn't use the index.
  const [dataset, citationCount, mentionCount] = await Promise.all([
    prisma.dataset.findUnique({
      where: {
        id: datasetId,
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
      },
    }),
    prisma.citation.count({ where: { datasetId } }),
    prisma.mention.count({ where: { datasetId } }),
  ]);

  if (!dataset) {
    return null;
  }

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

  return {
    ...rest,
    _count: { citations: citationCount, mentions: mentionCount },
    domain,
  };
}

export default defineEventHandler(async (event) => {
  const { datasetid } = event.context.params as { datasetid: string };

  const datasetId = Number.parseInt(datasetid, 10);

  if (!Number.isInteger(datasetId) || datasetId <= 0) {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid dataset id",
    });
  }

  const dataset = await fetchDataset(datasetId);

  if (!dataset) {
    throw createError({
      statusCode: 404,
      statusMessage: "Dataset not found",
    });
  }

  const session = await getUserSession(event);
  const userId = session.user?.id;

  const isClaimedByUser = userId
    ? Boolean(
        await prisma.userDataset.findUnique({
          where: { userId_datasetId: { userId, datasetId: dataset.id } },
        }),
      )
    : false;

  return { ...dataset, isClaimedByUser };
});

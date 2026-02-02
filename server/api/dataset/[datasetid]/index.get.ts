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
      citations: {
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
      mentions: {
        select: {
          mentionLink: true,
          mentionWeight: true,
          source: true,
          mentionedDate: true,
        },
      },
      datasetTopic: true,
    },
  });

  if (!dataset) {
    throw createError({
      statusCode: 404,
      statusMessage: "Dataset not found",
    });
  }

  const topic = dataset.datasetTopic;
  const domain =
    topic &&
    (topic.topicName ||
      topic.subfieldName ||
      topic.fieldName ||
      topic.domainName)
      ? {
          topic_name: topic.topicName ?? undefined,
          subfield_name: topic.subfieldName ?? undefined,
          field_name: topic.fieldName ?? undefined,
          domain_name: topic.domainName ?? undefined,
        }
      : null;

  const { datasetTopic: _t, ...rest } = dataset;

  return { ...rest, domain };
});

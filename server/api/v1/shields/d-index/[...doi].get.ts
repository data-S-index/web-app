import normalizeDoi from "~~/server/utils/doi";

const LABEL = "Dataset Index";
const LABEL_COLOR = "gray";

function scoreToMessageAndColor(score: number | null | undefined): {
  message: string;
  color: string;
} {
  if (score == null) {
    return { message: "pending", color: "lightgrey" };
  }

  return {
    message: String(Math.round(score)),
    color: "green",
  };
}

export default defineEventHandler(async (event) => {
  const params = event.context.params as
    | { doi?: string | string[] }
    | undefined;
  const doiParam = params?.doi;

  if (!doiParam) {
    throw createError({
      statusCode: 400,
      statusMessage: "DOI parameter is required",
    });
  }

  const doiPath = Array.isArray(doiParam) ? doiParam.join("/") : doiParam;
  const normalizedDoi = normalizeDoi(doiPath);

  const dataset = await prisma.dataset.findFirst({
    where: {
      identifierType: "doi",
      identifier: normalizedDoi,
    },
    select: {
      id: true,
      dindices: {
        orderBy: {
          created: "desc",
        },
        take: 1,
        select: {
          score: true,
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

  const latestDIndex = dataset.dindices[0];
  const dIndexScore = latestDIndex?.score ?? null;
  const { message, color } = scoreToMessageAndColor(dIndexScore);

  return {
    doi: normalizedDoi,
    datasetId: dataset.id,
    dIndexScore,
    label: LABEL,
    message,
    color,
    labelColor: LABEL_COLOR,
  };
});

import { makeBadge } from "badge-maker";
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

/**
 * GET /api/v1/shields/badge/d-index/{doi}.svg
 * Returns an SVG badge for the dataset d-index (no external Shields.io dependency).
 * Example: /api/v1/shields/badge/d-index/10.13026/xyz.svg
 */
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
  const pathWithoutSvg = doiPath.replace(/\.svg$/i, "");
  const normalizedDoi = normalizeDoi(pathWithoutSvg);

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

  const { message, color } = dataset
    ? scoreToMessageAndColor(dataset.dindices[0]?.score ?? null)
    : { message: "not found", color: "lightgrey" };

  const svg = makeBadge({
    label: LABEL,
    message,
    labelColor: LABEL_COLOR,
    color,
  });

  setResponseHeader(event, "Content-Type", "image/svg+xml");
  setResponseHeader(event, "Cache-Control", "public, max-age=3600");

  return svg;
});

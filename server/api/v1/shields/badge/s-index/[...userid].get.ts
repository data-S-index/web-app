import { makeBadge } from "badge-maker";

const LABEL = "S-index";
const LABEL_COLOR = "gray";

function scoreToMessageAndColor(score: number | null | undefined): {
  message: string;
  color: string;
} {
  if (score == null) {
    return { message: "pending", color: "lightgrey" };
  }

  return {
    message: score.toFixed(1),
    color: "green",
  };
}

/**
 * GET /api/v1/shields/badge/s-index/{userid}.svg
 * Returns an SVG badge for a researcher's S-index.
 * Example: /api/v1/shields/badge/s-index/01HXXXXXXXXXXXXXXXXXXXXXXX.svg
 */
export default defineEventHandler(async (event) => {
  const params = event.context.params as
    | { userid?: string | string[] }
    | undefined;
  const useridParam = params?.userid;

  if (!useridParam) {
    throw createError({
      statusCode: 400,
      statusMessage: "User ID parameter is required",
    });
  }

  const useridPath = Array.isArray(useridParam)
    ? useridParam.join("/")
    : useridParam;
  const userId = useridPath.replace(/\.svg$/i, "").toUpperCase();

  const user = await prisma.user.findUnique({
    where: { id: userId, anonymous: false },
    select: {
      id: true,
      userDatasets: {
        select: {
          dataset: {
            select: {
              dindices: {
                orderBy: { year: "desc" },
                take: 1,
                select: { score: true },
              },
            },
          },
        },
      },
    },
  });

  let sIndexScore: number | null = null;

  if (user) {
    const total = user.userDatasets.reduce(
      (sum, ud) => sum + (ud.dataset.dindices[0]?.score ?? 0),
      0,
    );
    sIndexScore = user.userDatasets.length > 0 ? total : null;
  }

  const { message, color } = user
    ? scoreToMessageAndColor(sIndexScore)
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

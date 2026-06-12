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
 * GET /api/v1/shields/data/s-index/{userid}
 * Returns JSON for Shields.io-style badge (userId, sIndexScore, label, message, color, labelColor).
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
  const userId = useridPath.toUpperCase();

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

  if (!user) {
    throw createError({
      statusCode: 404,
      statusMessage: "Researcher not found",
    });
  }

  const total = user.userDatasets.reduce(
    (sum, ud) => sum + (ud.dataset.dindices[0]?.score ?? 0),
    0,
  );
  const sIndexScore =
    user.userDatasets.length > 0 ? parseFloat(total.toFixed(1)) : null;
  const { message, color } = scoreToMessageAndColor(sIndexScore);

  return {
    userId,
    sIndexScore,
    label: LABEL,
    message,
    color,
    labelColor: LABEL_COLOR,
  };
});

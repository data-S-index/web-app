import { z } from "zod";

const submitSchema = z.object({
  datasetId: z.number().int().positive(),
  score: z.number(),
  evaluationDate: z.string().optional(),
  metricVersion: z.string(),
  softwareVersion: z.string(),
});

/**
 * POST /api/fuji-job/submit
 * Persists a score for a previously claimed job. The caller is responsible
 * for deciding the score, metricVersion, and softwareVersion (e.g. via a
 * hardcoded shortcut or a FUJI evaluation) — this endpoint only stores it
 * if it's higher than the dataset's existing score.
 */
export default defineEventHandler(async (event) => {
  requireFujiJobSecret(event);

  const body = await readValidatedBody(event, (b) => submitSchema.safeParse(b));

  if (!body.success) {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid submit payload",
    });
  }

  const { datasetId, score, metricVersion, softwareVersion } = body.data;
  const evaluationDate = body.data.evaluationDate
    ? new Date(body.data.evaluationDate)
    : new Date();

  const existing = await prisma.fujiScore.findUnique({
    where: { datasetId },
    select: { score: true },
  });

  if (existing && existing.score && score <= existing.score) {
    return {
      datasetId,
      score: existing.score,
    };
  }

  await prisma.fujiScore.upsert({
    where: { datasetId },
    create: {
      datasetId,
      score,
      evaluationDate,
      metricVersion,
      softwareVersion,
    },
    update: {
      score,
      evaluationDate,
      metricVersion,
      softwareVersion,
    },
  });

  await prisma.dIndexJob.upsert({
    where: { datasetId },
    create: { datasetId },
    update: {},
  });

  return {
    datasetId,
    score,
  };
});

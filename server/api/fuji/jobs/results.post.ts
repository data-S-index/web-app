// Updates the result of a fuji job in the database
import { z } from "zod";

const resultSchema = z.object({
  results: z.array(
    z.object({
      datasetId: z.number(),
      score: z.number(),
      evaluationDate: z.string(),
      metricVersion: z.string(),
      softwareVersion: z.string(),
    }),
  ),
});

export default defineEventHandler(async (event) => {
  const body = await readValidatedBody(event, (b) => resultSchema.safeParse(b));

  if (!body.success) {
    throw createError({
      statusCode: 400,
      // statusMessage: "Missing result information",
      statusMessage: body.error.errors.map((error) => error.message).join(", "),
    });
  }

  const results = body.data.results;

  for (const result of results) {
    const { datasetId, score, evaluationDate, metricVersion, softwareVersion } =
      result;
    // Get the dataset from the database
    const dataset = await prisma.dataset.findUnique({
      where: { id: result.datasetId },
    });

    if (!dataset) {
      throw createError({
        statusCode: 404,
        statusMessage: "Dataset not found",
      });
    }

    const fujiScore = await prisma.fujiScore.findUnique({
      where: { datasetId: datasetId },
    });

    // Check if the score is the same or lower than the current score

    if (fujiScore?.score && score <= fujiScore.score) {
      continue;
    }

    // Create or update the fuji score
    await prisma.fujiScore.upsert({
      where: { datasetId },
      update: {
        score,
        evaluationDate,
        metricVersion,
        softwareVersion,
      },
      create: {
        datasetId,
        score,
        evaluationDate,
        metricVersion,
        softwareVersion,
      },
    });

    // remove any fuji jobs for this dataset
    await prisma.fujiJob.deleteMany({
      where: { datasetId: datasetId },
    });
  }

  return { message: "Results updated" };
});

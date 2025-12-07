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
      statusMessage: "Missing result information",
    });
  }

  const results = body.data.results;

  for (const result of results) {
    const { datasetId, score, evaluationDate, metricVersion, softwareVersion } =
      result;
    // Get the dataset from the database
    const dataset = await prisma.dataset.findUnique({
      where: { id: result.datasetId },
      include: {
        fujiScore: true,
      },
    });

    if (!dataset) {
      throw createError({
        statusCode: 404,
        statusMessage: "Dataset not found",
      });
    }

    // Check if the score is the same or lower than the current score

    if (dataset.fujiScore?.score && score <= dataset.fujiScore.score) {
      continue;
    }

    // Create or update the fuji score
    await prisma.fujiScore.upsert({
      where: { datasetId: datasetId },
      update: {
        score: score,
        evaluationDate: evaluationDate,
        metricVersion: metricVersion,
        softwareVersion: softwareVersion,
      },
      create: {
        id: datasetId, // Use the datasetId as the id
        datasetId: datasetId,
        score: score,
        evaluationDate: evaluationDate,
        metricVersion: metricVersion,
        softwareVersion: softwareVersion,
      },
    });

    // remove any fuji jobs for this dataset
    await prisma.fujiJob.deleteMany({
      where: { datasetId: datasetId },
    });
  }

  return { message: "Results updated" };
});

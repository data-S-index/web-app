// Updates the result of a fuji job in the database
import { z } from "zod";
import { getRequestIP } from "h3";
import { createId } from "@paralleldrive/cuid2";

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

  const redis = getRedisClient();

  // Get the IP address of the request and store the count
  const ip = getRequestIP(event);
  const uniqueId = createId();

  // Store results count with IP address using a simple key with 10 minute TTL
  const key = `fuji:jobs:ip:${ip || "unknown"}:${uniqueId}`;
  const resultsCount = results.length;

  // Store count with 10 minute TTL (600 seconds)
  await redis.set(key, resultsCount.toString(), "EX", 10 * 60);

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

    // Convert evaluationDate string to Date object
    const evaluationDateObj = new Date(evaluationDate);

    // Create or update the fuji score
    await prisma.fujiScore.upsert({
      where: { datasetId },
      update: {
        score,
        evaluationDate: evaluationDateObj,
        metricVersion,
        softwareVersion,
      },
      create: {
        datasetId,
        score,
        evaluationDate: evaluationDateObj,
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

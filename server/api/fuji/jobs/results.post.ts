// Updates the result of a fuji job in the database
import { z } from "zod";
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
  machineName: z.string(),
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

  const uniqueId = createId();

  // Track the count of datasets that were actually updated/created
  let actualUpdatesCount = 0;
  // Track the count of datasets that already had a fujiScore (duplicates/overlap)
  let duplicatesCount = 0;

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

    // Track if this dataset already had a fujiScore (duplicate/overlap)
    if (fujiScore) {
      duplicatesCount++;
    }

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

    // Increment counter for actual updates
    actualUpdatesCount++;

    // remove any fuji jobs for this dataset
    await prisma.fujiJob.deleteMany({
      where: { datasetId: datasetId },
    });
  }

  // Store the count of datasets that were actually updated/created (not just submitted)
  // This matches what jobsDoneLast10Minutes counts (records with updated field in last 10 min)
  const key = `fuji:jobs:machine:${body.data.machineName || "unknown"}:${uniqueId}`;

  // Store count with 10 minute TTL (600 seconds)
  await redis.set(key, actualUpdatesCount.toString(), "EX", 10 * 60);

  // Also store duplicates count for overlap checking
  if (duplicatesCount > 0) {
    const url =
      "https://logwatch.fairdataihub.org/api/log/cmjgno6kb00067h01ukl411ya";

    const data = {
      level: "error",
      message: JSON.stringify({
        duplicatesCount,
        results,
      }),
      type: "json",
    };

    await fetch(url, {
      method: "POST",
      body: JSON.stringify(data),
      headers: {
        "Content-Type": "application/json",
      },
    });

    const duplicatesKey = `fuji:jobs:machine:duplicates:${uniqueId}`;
    await redis.set(duplicatesKey, duplicatesCount.toString(), "EX", 10 * 60);
  }

  return { message: "Results updated" };
});

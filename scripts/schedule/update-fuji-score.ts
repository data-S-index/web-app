const FUJI_BASE_URL = "http://localhost:1071";
const FUJI_EVALUATE_URL = `${FUJI_BASE_URL}/fuji/api/v1/evaluate`;
const FUJI_HEALTH_URL = `${FUJI_BASE_URL}/fuji/api/v1/`;
const FUJI_USERNAME = "marvel";
const FUJI_PASSWORD = "wonderwoman";
const FUJI_AUTH = `Basic ${Buffer.from(`${FUJI_USERNAME}:${FUJI_PASSWORD}`).toString("base64")}`;

const API_BASE_URL = "https://scholardata.io";
const FUJI_JOB_CLAIM_URL = `${API_BASE_URL}/api/fuji-job/claim`;
const FUJI_JOB_SUBMIT_URL = `${API_BASE_URL}/api/fuji-job/submit`;

const HARDCODED_DOI_SCORES: Record<string, number> = {
  "10.57451/": 63.46,
};

const HEALTH_CHECK_INTERVAL_MS = 10_000;
const HEALTH_CHECK_ATTEMPTS = 10;

interface FujiEvaluateResponse {
  summary: {
    score_percent: {
      FAIR: number;
    };
  };
  end_timestamp: string;
  metric_version: string;
  software_version: string;
}

interface SubmitPayload {
  datasetId: number;
  score: number;
  evaluationDate?: string;
  metricVersion: string;
  softwareVersion: string;
}

type ClaimResponse =
  | { status: "empty" }
  | { status: "skipped"; datasetId: number; reason: string }
  | { status: "pending"; datasetId: number; identifier: string };

async function waitForFujiService(): Promise<void> {
  console.log(`Checking FUJI service at ${FUJI_BASE_URL}...`);

  for (let attempt = 1; attempt <= HEALTH_CHECK_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(FUJI_HEALTH_URL);
      if (res.ok || res.status < 500) {
        console.log(`FUJI service is ready (attempt ${attempt})`);

        return;
      }
      console.log(
        `Attempt ${attempt}/${HEALTH_CHECK_ATTEMPTS}: service returned ${res.status}, retrying...`,
      );
    } catch {
      console.log(
        `Attempt ${attempt}/${HEALTH_CHECK_ATTEMPTS}: service unreachable, retrying...`,
      );
    }

    if (attempt < HEALTH_CHECK_ATTEMPTS) {
      await new Promise((resolve) =>
        setTimeout(resolve, HEALTH_CHECK_INTERVAL_MS),
      );
    }
  }

  throw new Error(
    `FUJI service did not become ready after ${HEALTH_CHECK_ATTEMPTS} attempts`,
  );
}

async function claimNextJob(): Promise<ClaimResponse> {
  const response = await fetch(FUJI_JOB_CLAIM_URL, { method: "POST" });

  if (!response.ok) {
    throw new Error(`Claim request failed with status ${response.status}`);
  }

  return (await response.json()) as ClaimResponse;
}

async function submitResult(payload: SubmitPayload): Promise<void> {
  const response = await fetch(FUJI_JOB_SUBMIT_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(
      `Submit request failed with status ${response.status} for dataset ${payload.datasetId}`,
    );
  }
}

async function evaluateDataset(
  datasetId: number,
  identifier: string,
): Promise<void> {
  const matchedPrefix = Object.keys(HARDCODED_DOI_SCORES).find((prefix) =>
    identifier.startsWith(prefix),
  );

  if (matchedPrefix !== undefined) {
    const score = HARDCODED_DOI_SCORES[matchedPrefix];

    await submitResult({
      datasetId,
      score,
      metricVersion: "estimated",
      softwareVersion: "extrapolated",
    });

    console.log(
      `Scored dataset ${datasetId} (${identifier}): ${score.toFixed(2)} [hardcoded for ${matchedPrefix} prefix]`,
    );

    return;
  }

  const response = await fetch(FUJI_EVALUATE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: FUJI_AUTH },
    body: JSON.stringify({
      object_identifier: identifier,
      test_debug: true,
      use_datacite: true,
      use_github: false,
      metric_version: "metrics_v0.8",
    }),
    signal: AbortSignal.timeout(120_000),
  });

  if (!response.ok) {
    throw new Error(
      `FUJI returned ${response.status} for dataset ${datasetId}`,
    );
  }

  const data = (await response.json()) as FujiEvaluateResponse;

  const score = data?.summary?.score_percent?.FAIR;
  if (score === undefined || score === null) {
    throw new Error(`No FAIR score in FUJI response for dataset ${datasetId}`);
  }

  await submitResult({
    datasetId,
    score: parseFloat(String(score)),
    evaluationDate: data.end_timestamp,
    metricVersion: data.metric_version ?? "metrics_v0.8",
    // softwareVersion: "extrapolation_test",
    softwareVersion: data.software_version ?? "unknown",
  });

  console.log(
    `Scored dataset ${datasetId} (${identifier}): ${score.toFixed(2)}`,
  );
}

async function main() {
  await waitForFujiService();

  console.log("Starting FUJI score calculation...");

  let processed = 0;
  let failed = 0;
  const startTime = Date.now();

  while (true) {
    const job = await claimNextJob();
    if (job.status === "empty") break;

    try {
      switch (job.status) {
        case "skipped":
          console.warn(`Dataset ${job.datasetId} skipped: ${job.reason}`);
          break;
        case "pending":
          await evaluateDataset(job.datasetId, job.identifier);
          break;
      }
      processed++;
    } catch (error) {
      failed++;
      console.error(`Failed dataset ${job.datasetId}:`, error);
    }

    console.log(
      `Processed ${(processed + failed).toLocaleString()} jobs so far`,
    );
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`Done. ${processed} processed, ${failed} failed in ${elapsed}s`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});

const FUJI_BASE_URL = "http://localhost:1071";
const FUJI_EVALUATE_URL = `${FUJI_BASE_URL}/fuji/api/v1/evaluate`;
const FUJI_HEALTH_URL = `${FUJI_BASE_URL}/fuji/api/v1/`;
const FUJI_USERNAME = "marvel";
const FUJI_PASSWORD = "wonderwoman";
const FUJI_AUTH = `Basic ${Buffer.from(`${FUJI_USERNAME}:${FUJI_PASSWORD}`).toString("base64")}`;

const API_BASE_URL = "https://scholardata.io";
const FUJI_JOB_CLAIM_URL = `${API_BASE_URL}/api/fuji-job/claim`;
const FUJI_JOB_SUBMIT_URL = `${API_BASE_URL}/api/fuji-job/submit`;

// Keyed by Dataset.publisherId (the DataCite client/repository id, e.g. "tib.ubp")
const HARDCODED_PUBLISHER_ID_SCORES: Record<string, number> = {
  "rpht.nifs": 63.46,
  "ylqb.ybhfwy": 65.38,
  "estdoi.bio": 53.85,
  "ethz.wsllfi": 40.38,
  "doe.pnnl": 42.31,
  "qpcj.ebas": 65.38,
  "doe.lbnl": 44.23,
  "cbg.datasets": 15.38,
  "inist.efe": 53.85,
  "pitt.pqr": 40.38,
  "cern.opendata": 50.0,
  "si.cda": 65.38,
  "kaggle.kaggle": 13.46,
  "datacite.topmed": 44.23,
  "iris.iris": 44.23,
  "tib.ubp": 57.69,
  "wuua.yklooh": 13.46,
  "csiro.repo": 13.46,
  "zbmed.unikoeln": 50.0,
  "inist.ehess": 65.38,
  "inist.esrf": 13.46,
  "dans.dataversenl": 13.46,
  "gesis.gesis": 13.46,
  "unibe.cssl": 42.31,
  "gdcc.jhu": 48.08,
  "inist.cdsp": 50.0,
  "bl.soton": 76.92,
  "buzq.pas": 40.38,
  "inist.dde": 48.08,
  "gdcc.csuc": 48.08,
  "epa.epa": 84.62,
  "dkrz.esgf": 65.38,
  "heliophy.spdf": 13.46,
  "ardcx.curtin": 65.38,
  "aad.repo": 42.31,
  "tib.mpdl": 13.46,
  "hbp.neuroinf": 65.38,
  "fzct.urmel-jp": 50.0,
  "mtakik.respecth": 48.08,
  "zbmed.lernzdb": 84.62,
  "oibk.izccka": 13.46,
  "brown.bdr": 40.38,
  "figshare.asha": 88.46,
  "usnps.usnps": 40.38,
  "crui.uniroma1": 48.08,
  "gesis.sodanet": 40.38,
  "ethz.wsl": 61.54,
  "pitt.tycho": 76.92,
  "uva.libra": 55.77,
  "jfch.ysnboe": 42.31,
  "uniwa.repo": 40.38,
  "psu.datacom": 13.46,
  "tib.zalf": 50.0,
  "tib.ubtum": 46.15,
  "uman.ceos": 40.38,
  "csic.gbif": 13.46,
  "gesis.ahri": 40.38,
  "ethz.e-coll": 51.92,
  "usc.ini": 40.38,
  "delft.ioc": 51.92,
  "tib.apeiron": 44.23,
  "fbtk.dmxfnr": 13.46,
  "delft.vudata": 13.46,
  "middbr.figshare": 88.46,
  "cen.nordicana": 13.46,
  "harvardu.crisis": 13.46,
  "figshare.crick": 96.15,
  "tib.thieme": 13.46,
  "figshare.arts": 84.62,
  "figshare.yorksj": 88.46,
  "nyu.frityn": 13.46,
  "iopan.odis": 96.15,
  "datacite.dcppc": 13.46,
  "mfsz.vknmwy": 88.46,
  "zbmed.biofresh": 13.46,
  "swin.repo1": 40.38,
  "tib.wdcrsat": 63.46,
  "ardcx.uow": 65.38,
  "ivuw.ipbdados": 48.08,
  "tib.ubfr": 44.23,
  "si.emammal": 13.46,
  "sml.tdar": 13.46,
  "subgoe.jna": 13.46,
  "nreu.famosh": 13.46,
  emdb: 42.31,
};

const HEALTH_CHECK_INTERVAL_MS = 10_000;
const HEALTH_CHECK_ATTEMPTS = 10;

const ts = () => new Date().toISOString();

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
  | {
      status: "pending";
      datasetId: number;
      identifier: string;
      publisherId: string;
    };

async function waitForFujiService(): Promise<void> {
  console.log(`[${ts()}] Checking FUJI service at ${FUJI_BASE_URL}...`);

  for (let attempt = 1; attempt <= HEALTH_CHECK_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(FUJI_HEALTH_URL);
      if (res.ok || res.status < 500) {
        console.log(`[${ts()}] FUJI service is ready (attempt ${attempt})`);

        return;
      }
      console.log(
        `[${ts()}] Attempt ${attempt}/${HEALTH_CHECK_ATTEMPTS}: service returned ${res.status}, retrying...`,
      );
    } catch {
      console.log(
        `[${ts()}] Attempt ${attempt}/${HEALTH_CHECK_ATTEMPTS}: service unreachable, retrying...`,
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
  publisherId: string,
): Promise<void> {
  if (publisherId in HARDCODED_PUBLISHER_ID_SCORES) {
    const score = HARDCODED_PUBLISHER_ID_SCORES[publisherId];

    await submitResult({
      datasetId,
      score,
      metricVersion: "estimated",
      softwareVersion: "extrapolated",
    });

    console.log(
      `[${ts()}] Scored dataset ${datasetId} (${identifier}): ${score.toFixed(2)} [hardcoded for publisher ${publisherId}]`,
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
    `[${ts()}] Scored dataset ${datasetId} (${identifier}) (${publisherId}): ${score.toFixed(2)}`,
  );
}

async function main() {
  await waitForFujiService();

  console.log(`[${ts()}] Starting FUJI score calculation...`);

  let processed = 0;
  let failed = 0;
  const startTime = Date.now();

  while (true) {
    let job: ClaimResponse;
    try {
      job = await claimNextJob();
    } catch (error) {
      failed++;
      console.error(`[${ts()}] Claim request failed, skipping:`, error);
      continue;
    }
    if (job.status === "empty") break;

    try {
      switch (job.status) {
        case "skipped":
          console.warn(
            `[${ts()}] Dataset ${job.datasetId} skipped: ${job.reason}`,
          );
          break;
        case "pending":
          await evaluateDataset(job.datasetId, job.identifier, job.publisherId);
          break;
      }
      processed++;
    } catch (error) {
      failed++;
      console.error(`[${ts()}] Failed dataset ${job.datasetId}:`, error);
    }

    console.log(
      `[${ts()}] Processed ${(processed + failed).toLocaleString()} jobs so far`,
    );
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(
    `[${ts()}] Done. ${processed} processed, ${failed} failed in ${elapsed}s`,
  );
}

main().catch((err) => {
  console.error(`[${ts()}] Fatal error:`, err);
  process.exit(1);
});

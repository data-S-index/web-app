// These credentials are included in the fuji github repo so not really a secret
const username = "marvel";
const password = "wonderwoman";

const token = Buffer.from(`${username}:${password}`).toString("base64");

const dois = [
  "10.1594/pangaea.845599",
  "10.17632/bgg8mnrkz8",
  "10.1594/pangaea.817318",
];

const evaluateDOI = async (doi: string) => {
  try {
    const response = await fetch("http://localhost:1071/fuji/api/v1/evaluate", {
      method: "POST",
      body: JSON.stringify({
        object_identifier: doi,
        test_debug: true,
        metadata_service_endpoint: "http://ws.pangaea.de/oai/provider",
        metadata_service_type: "oai_pmh",
        use_datacite: true,
        use_github: false,
        metric_version: "metrics_v0.5",
      }),
      headers: {
        accept: "application/json",
        Authorization: `Basic ${token}`,
        "Content-Type": "application/json",
      },
    });

    const results = await response.json();

    const report = {
      doi: doi,
      fair_score: results["summary"]["score_percent"]["FAIR"],
      evaluation_date: results["end_timestamp"],
      fuji_metric_version: results["metric_version"],
      fuji_software_version: results["software_version"],
    };

    console.log(report);

    return report;
  } catch (error) {
    console.error(`Error evaluating DOI ${doi}:`, error);
    throw error;
  }
};

const reports = await Promise.all(dois.map((doi) => evaluateDOI(doi)));
console.log("All reports:", reports);

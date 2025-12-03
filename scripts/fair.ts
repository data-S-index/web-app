import * as fs from "fs/promises";

// These credentials are included in the fuji github repo so not really a secret
const username = "marvel";
const password = "wonderwoman";

const token = Buffer.from(`${username}:${password}`).toString("base64");

const dois = ["10.7925/drs1.duchas_5084618"];

const evaluateDOI = async (doi: string) => {
  try {
    const response = await fetch(
      "http://localhost:54004/fuji/api/v1/evaluate",
      {
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
      },
    );

    const results = await response.json();

    const report = {
      doi: doi,
      fair_score: results["summary"]["score_percent"]["FAIR"],
      evaluation_date: results["end_timestamp"],
      fuji_metric_version: results["metric_version"],
      fuji_software_version: results["software_version"],
    };

    console.log(report);

    // save the report to a file
    // Sanitize DOI for filename by replacing / with _
    const sanitizedDOI = doi.replace(/\//g, "_");
    const reportsDir = "./reports";

    // Ensure reports directory exists
    await fs.mkdir(reportsDir, { recursive: true });

    await fs.writeFile(
      `${reportsDir}/fuji_report_${sanitizedDOI}.json`,
      JSON.stringify(results, null, 2),
      {
        encoding: "utf-8",
      },
    );

    return report;
  } catch (error) {
    console.error(`Error evaluating DOI ${doi}:`, error);
    throw error;
  }
};

const reports = await Promise.all(dois.map((doi) => evaluateDOI(doi)));
console.log("All reports:", reports);

import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";
import * as readline from "readline";
import { createReadStream } from "fs";
import { createId } from "@paralleldrive/cuid2";

const RECORDS_PER_FILE = 10000;

interface DataciteRecord {
  source?: string;
  doi?: string;
  doi_url?: string;
  title?: string;
  version?: string;
  publisher?: string;
  publication_date?: string;
  description?: string;
  creators?: Array<{ name?: string; [key: string]: unknown }>;
  subjects?: string[];
  [key: string]: unknown;
}

interface ProcessedDataset {
  id: string;
  doi: string | null;
  title: string;
  description: string | null;
  version: string | null;
  imageUrl: null;
  publisher: string | null;
  publishedAt: Date | null;
  subjects: string[];
  authors: string;
  randomInt: number;
}

// Clean string to remove bad characters
const cleanString = (str: string | null | undefined): string => {
  if (!str) return "";

  // eslint-disable-next-line no-control-regex
  return str.replace(/\uFFFD/g, "").replace(/[\x00-\x1F\x7F-\x9F]/g, "");
};

// Parse a datacite record into dataset format (db insert ready)
const parseDataciteRecord = (record: DataciteRecord): ProcessedDataset => {
  const doi = record.doi?.toLowerCase() || null;
  const title = record.title || "";
  const description = record.description
    ? cleanString(record.description)
    : null;
  const publisher = record.publisher || null;
  const version = record.version || null;
  const publishedAt = record.publication_date
    ? new Date(record.publication_date)
    : null;
  const randomInt = Math.floor(Math.random() * 1000000);
  const subjects = record.subjects || [];

  // Clean authors JSON string
  const authorsRaw = record.creators || [];
  let authors = "[]";
  try {
    const cleanedAuthors = JSON.stringify(authorsRaw);
    authors = cleanString(cleanedAuthors);
  } catch {
    authors = "[]";
  }

  return {
    id: createId(),
    doi,
    title,
    description,
    version,
    imageUrl: null,
    publisher,
    publishedAt,
    subjects,
    authors,
    randomInt,
  };
};

// Write a batch of processed records to a numbered file
const writeBatchToFile = async (
  batch: ProcessedDataset[],
  fileNumber: number,
  outputDir: string,
): Promise<void> => {
  const fileName = `${fileNumber}.ndjson`;
  const filePath = path.join(outputDir, fileName);

  const lines = batch.map((record) => JSON.stringify(record));
  await fs.writeFile(filePath, lines.join("\n") + "\n", {
    encoding: "utf-8",
  });

  console.log(`  ✓ Created ${fileName} with ${batch.length} records`);
};

// Process all ndjson files and create new files with processed records
const processAllFiles = async (
  ndjsonFiles: string[],
  sourceDir: string,
  outputDir: string,
): Promise<void> => {
  let currentBatch: ProcessedDataset[] = [];
  let fileNumber = 1;
  let totalRecordsProcessed = 0;
  let totalRecordsSkipped = 0;

  for (let idx = 0; idx < ndjsonFiles.length; idx++) {
    const file = ndjsonFiles[idx];
    const filePath = path.join(sourceDir, file);
    console.log(`  [${idx + 1}/${ndjsonFiles.length}] Processing ${file}...`);

    const fileStream = createReadStream(filePath, { encoding: "utf-8" });
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity,
    });

    let fileLineCount = 0;

    for await (const line of rl) {
      if (line.trim()) {
        try {
          const record = JSON.parse(line) as DataciteRecord;
          const processedDataset = parseDataciteRecord(record);
          currentBatch.push(processedDataset);
          fileLineCount++;
          totalRecordsProcessed++;

          // When batch reaches RECORDS_PER_FILE, write it to a file
          if (currentBatch.length >= RECORDS_PER_FILE) {
            await writeBatchToFile(currentBatch, fileNumber, outputDir);
            fileNumber++;
            currentBatch = [];
          }

          console.log(
            `    ✓ Processed ${fileLineCount} records from ${file} - ${totalRecordsProcessed} total records processed`,
          );
        } catch (error) {
          totalRecordsSkipped++;
          console.warn(
            `    ⚠️  Failed to parse line in ${file}: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }
    }

    console.log(`    ✓ Processed ${fileLineCount} records from ${file}`);
  }

  // Write any remaining records as the final file
  if (currentBatch.length > 0) {
    await writeBatchToFile(currentBatch, fileNumber, outputDir);
  }

  console.log(`\n  📊 Total records processed: ${totalRecordsProcessed}`);
  if (totalRecordsSkipped > 0) {
    console.log(`  ⚠️  Total records skipped: ${totalRecordsSkipped}`);
  }
  console.log(`  📁 Total output files created: ${fileNumber}`);
};

const main = async () => {
  console.log("🚀 Starting database preparation process...");

  const sourceFolderName = "datacite-slim-records";
  const outputFolderName = "database";

  // Step 1: Get OS-agnostic path to Downloads/${sourceFolderName}
  console.log("📍 Step 1: Locating source directory...");
  const homeDir = os.homedir();
  const downloadsDir = path.join(homeDir, "Downloads");
  const sourceDir = path.join(downloadsDir, sourceFolderName);
  const outputDir = path.join(downloadsDir, outputFolderName);

  console.log(`Reading ndjson files from: ${sourceDir}`);
  console.log(`Output directory: ${outputDir}`);

  // Check if source directory exists
  try {
    await fs.access(sourceDir);
    console.log("✓ Source directory found");
  } catch {
    throw new Error(
      `Directory not found: ${sourceDir}. Please ensure the ${sourceFolderName} folder exists in your Downloads directory.`,
    );
  }

  // Clean output directory
  try {
    await fs.rm(outputDir, { recursive: true });
    console.log("✓ Output directory cleaned");
  } catch {
    console.log("✓ Output directory not found");
  }

  // Create output directory if it doesn't exist
  try {
    await fs.access(outputDir);
    console.log("✓ Output directory already exists");
  } catch {
    await fs.mkdir(outputDir, { recursive: true });
    console.log("✓ Created output directory");
  }

  // Step 2: Find all ndjson files
  console.log("\n📖 Step 2: Finding ndjson files...");
  const files = await fs.readdir(sourceDir);
  const ndjsonFiles = files.filter((file) => file.endsWith(".ndjson"));

  console.log(`  Found ${ndjsonFiles.length} .ndjson file(s) to process`);

  if (ndjsonFiles.length === 0) {
    throw new Error("No .ndjson files found in source directory");
  }

  // Step 3: Process all files and create new files with processed records
  console.log(
    `\n✂️  Step 3: Processing files and creating new files (~${RECORDS_PER_FILE} records each)...`,
  );

  await processAllFiles(ndjsonFiles, sourceDir, outputDir);

  console.log("\n✅ All files have been processed successfully!");
  console.log(`🎉 Processed files are available in: ${outputDir}`);
};

main().catch((e) => {
  console.error("\n❌ Error occurred during database preparation:");
  console.error(e);
  process.exit(1);
});

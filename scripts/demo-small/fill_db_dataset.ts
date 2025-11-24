/* eslint-disable @typescript-eslint/no-explicit-any */
import { PrismaClient } from "../../shared/generated/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";
import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";
import * as readline from "readline";
import { createReadStream } from "fs";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });

interface DataciteRecord {
  source?: string;
  doi?: string;
  doi_url?: string;
  title?: string;
  version?: string;
  publisher?: string;
  publication_date?: string;
  creators?: Array<{ name?: string; [key: string]: any }>;
  subjects?: string[];
  [key: string]: any;
}

// Convert creators to authors format
const convertCreatorsToAuthors = (
  creators?: Array<{ name?: string; [key: string]: any }>,
): any[] => {
  if (!creators || creators.length === 0) {
    return [];
  }

  return creators.map((creator) => {
    const name = creator.name || "";
    // Try to determine if it's personal or organizational
    // Simple heuristic: if it contains common org words or is all caps, it's organizational
    const isOrganizational =
      name.includes("University") ||
      name.includes("Institute") ||
      name.includes("Service") ||
      name.includes("Center") ||
      name.includes("Laboratory") ||
      name.includes("Department") ||
      name === name.toUpperCase();

    return {
      nameType:
        creator.nameType || (isOrganizational ? "Organizational" : "Personal"), // We might need to revert this
      name,
      affiliations: creator.affiliations || [],
      nameIdentifiers: creator.nameIdentifiers || [],
    };
  });
};

// Parse a datacite record into dataset format
const parseDataciteRecord = (record: DataciteRecord): any => {
  const doi = record.doi?.toLowerCase() || null;
  const title = record.title || "";
  const description = record.description || null;
  const publisher = record.publisher || null;
  const version = record.version || null;
  const publishedAt = record.publication_date
    ? new Date(record.publication_date)
    : null;
  const subjects = record.subjects || [];
  const authorsString = JSON.stringify(record.creators) || "";
  const authors = convertCreatorsToAuthors(record.creators);

  return {
    doi,
    title,
    description,
    version,
    imageUrl: null,
    publisher,
    publishedAt,
    subjects,
    authorsString,
    authors,
    randomInt: Math.floor(Math.random() * 1000000),
  };
};

// Process a single ndjson file and insert records into database in batches
const processNdjsonFile = async (
  filePath: string,
  fileName: string,
  batchSize: number = 1000,
  recordLimit: number = 50000,
): Promise<number> => {
  const fileStream = createReadStream(filePath, { encoding: "utf-8" });
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  let lineCount = 0;
  let batch: any[] = [];

  for await (const line of rl) {
    if (line.trim()) {
      try {
        const record = JSON.parse(line) as DataciteRecord;
        const dataset = parseDataciteRecord(record);
        batch.push(dataset);
        lineCount++;
        // If recordLimit is 0, process all records (no limit)
        if (recordLimit > 0 && lineCount >= recordLimit) {
          break;
        }

        // Insert batch when it reaches the batch size
        if (batch.length >= batchSize) {
          await prisma.dataset.createMany({
            data: batch,
            skipDuplicates: true,
          });
          console.log(
            `    ✓ Inserted batch of ${batch.length} records (total: ${lineCount})`,
          );
          batch = []; // Clear the batch
        }
      } catch (error) {
        console.warn(`    ⚠️  Failed to parse line in ${fileName}: ${error}`);
      }
    }
  }

  // Insert any remaining records in the batch
  if (batch.length > 0) {
    await prisma.dataset.createMany({
      data: batch,
      skipDuplicates: true,
    });
    console.log(
      `    ✓ Inserted final batch of ${batch.length} records (total: ${lineCount})`,
    );
  }

  return lineCount;
};

const main = async () => {
  console.log("🚀 Starting database fill process...");

  const folderName = "datacite-slim-records-parts";

  // Step 1: Get OS-agnostic path to Downloads/${folderName}
  console.log("📍 Step 1: Locating data directory...");
  const homeDir = os.homedir();
  const downloadsDir = path.join(homeDir, "Downloads");
  const dataDir = path.join(downloadsDir, folderName);

  console.log(`Reading ndjson files from: ${dataDir}`);

  // Check if directory exists
  try {
    await fs.access(dataDir);
    console.log("✓ Data directory found");
  } catch {
    throw new Error(
      `Directory not found: ${dataDir}. Please ensure the ${folderName} folder exists in your Downloads directory.`,
    );
  }

  // Step 2: Clear existing data from database tables
  console.log("\n🗑️  Step 2: Clearing existing database tables...");
  await prisma.fujiScore.deleteMany();
  console.log("  ✓ Cleared fujiScore table");
  await prisma.citation.deleteMany();
  console.log("  ✓ Cleared citation table");
  await prisma.userDataset.deleteMany();
  console.log("  ✓ Cleared userDataset table");
  await prisma.dataset.deleteMany();
  console.log("  ✓ Cleared dataset table");

  // Step 3: Process ndjson files one at a time
  console.log(
    "\n📖 Step 3: Processing ndjson files and inserting into database...",
  );
  const files = await fs.readdir(dataDir);
  const ndjsonFiles = files.filter((file) => file.endsWith(".ndjson"));

  console.log(`  Found ${ndjsonFiles.length} .ndjson file(s) to process`);

  if (ndjsonFiles.length === 0) {
    throw new Error("No .ndjson files found in data directory");
  }

  const batchSize = 10000;
  let totalInserted = 0;

  // Allow recordLimit to be set via environment variable (0 = process all records)
  const recordLimitEnv = process.env.RECORD_LIMIT;
  const recordLimit = recordLimitEnv ? parseInt(recordLimitEnv, 10) : 100;

  if (recordLimit === 0) {
    console.log("  ⚠️  Record limit set to 0 - processing ALL records");
  } else {
    console.log(`  📊 Record limit: ${recordLimit} records per file`);
  }

  for (let idx = 0; idx < ndjsonFiles.length; idx++) {
    const file = ndjsonFiles[idx];
    const filePath = path.join(dataDir, file);
    console.log(`  [${idx + 1}/${ndjsonFiles.length}] Processing ${file}...`);

    const recordsProcessed = await processNdjsonFile(
      filePath,
      file,
      batchSize,
      recordLimit,
    );
    totalInserted += recordsProcessed;
    console.log(
      `    ✓ Completed ${file}: ${recordsProcessed} records processed`,
    );
  }

  console.log(`\n✅ Successfully inserted ${totalInserted} total datasets`);
  console.log("🎉 Database fill process completed!");
};

main()
  .catch((e) => {
    console.error("\n❌ Error occurred during database fill:");
    console.error(e);
    throw e;
  })
  .finally(async () => {
    console.log("\n🔌 Disconnecting from database...");
    await prisma.$disconnect();
  });

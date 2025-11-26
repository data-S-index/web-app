/* eslint-disable @typescript-eslint/no-explicit-any */
import { PrismaClient } from "../shared/generated/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";
import { createId } from "@paralleldrive/cuid2";
import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";
import * as readline from "readline";
import { createReadStream } from "fs";

import { Client } from "pg";

const connectionString = process.env.DATABASE_URL || "";

const adapter = new PrismaPg({
  connectionString,
});

const prisma = new PrismaClient({ adapter });

//postgresql://admin:root@localhost:43997/s_index_local?sslmode=disable

//pg
let c = connectionString.split("://")[1];
c = c.split("?")[0];

const user = c.split(":")[0];
const password = c.split(":")[1].split("@")[0];
const host = c.split("@")[1].split(":")[0];
const port = c.split("@")[1].split(":")[1].split("/")[0];
const database = c.split("@")[1].split(":")[1].split("/")[1];

const client = new Client({
  user,
  password,
  host,
  port,
  database,
});
await client.connect();

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

const errorLines: {
  fileName: string;
  lineNumber: number;
  error: string;
}[] = [];

// Count the number of lines in a file
const countLinesInFile = async (filePath: string): Promise<number> => {
  const fileStream = createReadStream(filePath, { encoding: "utf-8" });
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  let lineCount = 0;
  for await (const line of rl) {
    if (line.trim()) {
      lineCount++;
    }
  }

  return lineCount;
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
  const randomInt = Math.floor(Math.random() * 1000000);
  const subjects = record.subjects || [];
  const authors = JSON.stringify(record.creators) || "[]"; // [{ nameType: String, name: String, affiliations: String[], nameIdentifiers: string[]}]

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

// Process a single ndjson file and insert records into database in batches using raw SQL
const processNdjsonFile = async (
  filePath: string,
  fileName: string,
  batchSize: number = 1000,
  recordLimit: number = 50000,
  totalLines: number = 0,
): Promise<number> => {
  const fileStream = createReadStream(filePath, { encoding: "utf-8" });
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  let lineCount = 0;
  let batch: any[] = [];
  const effectiveTotalLines =
    recordLimit > 0 ? Math.min(recordLimit, totalLines) : totalLines;

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

        // Insert batch when it reaches the batch size using raw SQL for better performance
        if (batch.length >= batchSize) {
          await insertBatchRawSQL(batch);
          const progress =
            effectiveTotalLines > 0
              ? `[${lineCount}/${effectiveTotalLines} - ${Math.round((lineCount / effectiveTotalLines) * 100)}%]`
              : `[${lineCount}]`;
          console.log(
            `    ✓ Inserted batch of ${batch.length} records ${progress}`,
          );
          batch = []; // Clear the batch
        }
      } catch (error) {
        console.warn(`    ⚠️  Failed to parse line in ${fileName}: ${error}`);
        errorLines.push({
          fileName,
          lineNumber: lineCount,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  // Insert any remaining records in the batch
  if (batch.length > 0) {
    await insertBatchRawSQL(batch);
    const progress =
      effectiveTotalLines > 0
        ? `[${lineCount}/${effectiveTotalLines} - ${Math.round((lineCount / effectiveTotalLines) * 100)}%]`
        : `[${lineCount}]`;
    console.log(
      `    ✓ Inserted final batch of ${batch.length} records ${progress}`,
    );
  }

  return lineCount;
};

// Insert batch using raw SQL - much faster than createMany
const insertBatchRawSQL = async (batch: any[]): Promise<void> => {
  if (batch.length === 0) return;

  const columns = [
    "id",
    "doi",
    "title",
    "description",
    "version",
    "publisher",
    "publishedAt",
    "authors",
    "subjects",
    "randomInt",
    "created",
    "updated",
  ];
  const quotedColumns = columns.map((col) => `"${col}"`).join(", ");

  const valuePlaceholders = batch
    .map((_, rowIdx) => {
      const baseIdx = rowIdx * 10;
      const placeholders = Array.from(
        { length: 10 },
        (_, colIdx) => `$${baseIdx + colIdx + 1}`,
      ).join(", ");

      return `(${placeholders}, NOW(), NOW())`;
    })
    .join(", ");

  const insertQuery = `
    INSERT INTO "Dataset" (${quotedColumns})
    VALUES ${valuePlaceholders}
    ON CONFLICT (doi) DO NOTHING
  `;

  const params = batch.flatMap((dataset) => [
    dataset.id,
    dataset.doi,
    dataset.title,
    dataset.description,
    dataset.version,
    dataset.publisher,
    dataset.publishedAt ? dataset.publishedAt.toISOString() : null,
    dataset.authors,
    dataset.subjects,
    dataset.randomInt,
  ]);

  await client.query(insertQuery, params);
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

  let totalInserted = 0;

  const recordLimit = 0;

  if (recordLimit === 0) {
    console.log("  ⚠️  Record limit set to 0 - processing ALL records");
  } else {
    console.log(`  📊 Record limit: ${recordLimit} records per file`);
  }

  for (let idx = 0; idx < ndjsonFiles.length; idx++) {
    const file = ndjsonFiles[idx];
    const filePath = path.join(dataDir, file);
    console.log(`  [${idx + 1}/${ndjsonFiles.length}] Processing ${file}...`);

    // Get file size to determine batch size
    // Using raw SQL allows for much larger batches
    const fileStats = await fs.stat(filePath);
    const fileSizeMB = fileStats.size / (1024 * 1024);
    // const batchSize = fileSizeMB > 40 ? 5000 : 20000;
    const batchSize = 1000;
    console.log(
      `    📦 File size: ${fileSizeMB.toFixed(2)}MB - Using batch size: ${batchSize}`,
    );

    // Count total lines in file for progress tracking
    console.log(`    📊 Counting lines in ${file}...`);
    const totalLines = await countLinesInFile(filePath);
    console.log(`    ✓ Found ${totalLines} lines in ${file}`);

    const recordsProcessed = await processNdjsonFile(
      filePath,
      file,
      batchSize,
      recordLimit,
      totalLines,
    );
    totalInserted += recordsProcessed;
    console.log(
      `    ✓ Completed ${file}: ${recordsProcessed} records processed`,
    );
  }

  console.log(`\n✅ Successfully inserted ${totalInserted} total datasets`);
  console.log("🎉 Database fill process completed!");

  // write error lines to file
  await fs.writeFile("error_lines.json", JSON.stringify(errorLines, null, 2));
  console.log("  ✓ Error lines written to file");
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

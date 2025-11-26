import { PrismaClient } from "../shared/generated/client";
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

interface CitationRecord {
  doi: string;
  source: string[];
  citation_link: string;
  citation_date: string;
  citation_weight: number;
}

// Read all records from ndjson file into an array
const readNdjsonFile = async (
  filePath: string,
  recordLimit: number = 0,
): Promise<CitationRecord[]> => {
  const fileStream = createReadStream(filePath, { encoding: "utf-8" });
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  const records: CitationRecord[] = [];
  let lineCount = 0;

  for await (const line of rl) {
    if (line.trim()) {
      try {
        const record = JSON.parse(line) as CitationRecord;
        records.push(record);
        lineCount++;

        // If recordLimit is set and we've reached it, stop reading
        if (recordLimit > 0 && lineCount >= recordLimit) {
          break;
        }
      } catch (error) {
        console.warn(`    ⚠️  Failed to parse line in ${filePath}: ${error}`);
      }
    }
  }

  return records;
};

// Build hashtable of DOI (lowercase) -> dataset ID
const buildDatasetHashtable = async (): Promise<Map<string, string>> => {
  console.log("  📊 Loading all datasets into memory...");
  const datasets = await prisma.dataset.findMany({
    select: {
      id: true,
      doi: true,
    },
  });

  const hashtable = new Map<string, string>();
  for (const dataset of datasets) {
    if (dataset.doi) {
      hashtable.set(dataset.doi.toLowerCase(), dataset.id);
    }
  }

  console.log(`  ✓ Loaded ${hashtable.size} datasets into hashtable`);

  return hashtable;
};

// Process records: retrieve dataset IDs and create citations
const processRecords = async (
  records: CitationRecord[],
  datasetHashtable: Map<string, string>,
): Promise<number> => {
  let insertedCount = 0;
  const totalRecords = records.length;

  for (let i = 0; i < records.length; i++) {
    const record = records[i];
    const progress = `[${i + 1}/${totalRecords}]`;

    try {
      // Get dataset ID from hashtable
      const doi = record.doi?.toLowerCase() || null;
      const datasetId = doi ? datasetHashtable.get(doi) : null;

      if (!datasetId) {
        console.warn(
          `    ${progress} ⚠️  Dataset not found for DOI: ${record.doi}`,
        );
        continue;
      }

      // Parse citation data
      const citationLink = record.citation_link;
      const citationWeight =
        record.citation_weight != null
          ? parseFloat(record.citation_weight.toString())
          : 1.0;
      const citationDate = record.citation_date
        ? new Date(record.citation_date)
        : null;

      // Create citation
      await prisma.citation.create({
        data: {
          citationLink: citationLink,
          citationWeight: citationWeight,
          mdc: true,
          citedDate: citationDate,
          dataset: {
            connect: {
              id: datasetId,
            },
          },
        },
      });

      insertedCount++;

      // Log progress every 100 records
      if ((i + 1) % 100 === 0 || i + 1 === totalRecords) {
        console.log(
          `    ${progress} Processed ${insertedCount} citations (${Math.round(((i + 1) / totalRecords) * 100)}%)`,
        );
      }
    } catch (error) {
      console.warn(`    ${progress} ⚠️  Failed to process record: ${error}`);
    }
  }

  return insertedCount;
};

const main = async () => {
  console.log("🚀 Starting database fill process...");

  // Step 1: Get OS-agnostic path to Downloads/${folderName}
  console.log("📍 Step 1: Locating data directory...");
  const homeDir = os.homedir();
  const downloadsDir = path.join(homeDir, "Downloads");
  const citationFile = path.join(downloadsDir, "citations-mdc-full.ndjson");

  // Check if file exists
  try {
    await fs.access(citationFile);
    console.log("✓ Citation file found");
  } catch {
    throw new Error(
      `Citation file not found: ${citationFile}. Please ensure the file exists in your Downloads directory.`,
    );
  }

  // Step 2: Clear existing data from citation table
  console.log("\n🗑️  Step 2: Clearing existing citation table...");
  await prisma.citation.deleteMany();
  console.log("  ✓ Cleared citation table");

  // Step 3: Read all records from file
  console.log("\n📖 Step 3: Reading citation records from file...");

  // Allow recordLimit to be set via environment variable (0 = process all records)
  const recordLimitEnv = process.env.RECORD_LIMIT;
  const recordLimit = recordLimitEnv ? parseInt(recordLimitEnv, 10) : 0;

  if (recordLimit === 0) {
    console.log("  ⚠️  Record limit set to 0 - processing ALL records");
  } else {
    console.log(`  📊 Record limit: ${recordLimit} records`);
  }

  const records = await readNdjsonFile(citationFile, recordLimit);
  console.log(`  ✓ Read ${records.length} records from file`);

  // Step 4: Build dataset hashtable
  console.log("\n🗂️  Step 4: Building dataset hashtable...");
  const datasetHashtable = await buildDatasetHashtable();

  // Step 5: Process records and insert into citation table
  console.log(
    "\n🔄 Step 5: Processing records and inserting into citation table...",
  );

  const totalInserted = await processRecords(records, datasetHashtable);

  console.log(`\n✅ Successfully inserted ${totalInserted} citations`);
  console.log("🎉 Citation fill process completed!");
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

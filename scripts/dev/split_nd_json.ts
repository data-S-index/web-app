import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";
import * as readline from "readline";
import { createReadStream } from "fs";

const RECORDS_PER_PART = 50000;

// Split a single ndjson file into parts
const splitNdjsonFile = async (
  filePath: string,
  fileName: string,
  outputDir: string,
): Promise<void> => {
  const fileStream = createReadStream(filePath, { encoding: "utf-8" });
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  let lineCount = 0;
  let partNumber = 1;
  let currentPartLines: string[] = [];
  const baseFileName = fileName.replace(/\.ndjson$/, "");

  console.log(`  📄 Processing ${fileName}...`);

  for await (const line of rl) {
    if (line.trim()) {
      currentPartLines.push(line);
      lineCount++;

      // When we reach the record limit, write the current part
      if (currentPartLines.length >= RECORDS_PER_PART) {
        const partFileName = `${baseFileName}-${partNumber}.ndjson`;
        const partFilePath = path.join(outputDir, partFileName);
        await fs.writeFile(partFilePath, currentPartLines.join("\n") + "\n", {
          encoding: "utf-8",
        });
        console.log(
          `    ✓ Created part ${partNumber}: ${partFileName} (${currentPartLines.length} records)`,
        );
        currentPartLines = [];
        partNumber++;
      }
    }
  }

  // Write any remaining records as the final part
  if (currentPartLines.length > 0) {
    const partFileName = `${baseFileName}-${partNumber}.ndjson`;
    const partFilePath = path.join(outputDir, partFileName);
    await fs.writeFile(partFilePath, currentPartLines.join("\n") + "\n", {
      encoding: "utf-8",
    });
    console.log(
      `    ✓ Created part ${partNumber}: ${partFileName} (${currentPartLines.length} records)`,
    );
  }

  console.log(
    `  ✅ Completed ${fileName}: ${lineCount} total records split into ${partNumber} part(s)`,
  );
};

const main = async () => {
  console.log("🚀 Starting ndjson file splitting process...");

  const sourceFolderName = "datacite-slim-records";
  const outputFolderName = "datacite-slim-records-parts";

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

  // Step 3: Split each file
  console.log(
    `\n✂️  Step 3: Splitting files into parts (~${RECORDS_PER_PART.toLocaleString()} records each)...`,
  );

  for (let idx = 0; idx < ndjsonFiles.length; idx++) {
    const file = ndjsonFiles[idx];
    const filePath = path.join(sourceDir, file);
    console.log(`  [${idx + 1}/${ndjsonFiles.length}] ${file}`);

    await splitNdjsonFile(filePath, file, outputDir);
  }

  console.log("\n✅ All files have been split successfully!");
  console.log(`🎉 Split files are available in: ${outputDir}`);
};

main().catch((e) => {
  console.error("\n❌ Error occurred during file splitting:");
  console.error(e);
  process.exit(1);
});

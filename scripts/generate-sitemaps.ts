/* eslint-disable @stylistic/quotes */

import { PrismaClient } from "../shared/generated/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { createHash } from "crypto";
import { consola } from "consola";
import "dotenv/config";

const QUERY_BATCH_SIZE = 10000; // rows fetched per DB round-trip
const CHUNK_SIZE = 50_000; // URLs per output XML file
const OUTPUT_DIR = join(process.cwd(), "output", "sitemaps");
const BASE_URL = (
  process.env.NUXT_SITE_URL || "https://scholardata.io"
).replace(/\/$/, "");
const CDN_BASE = "https://cdn.scholardata.io/sitemaps";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// e.g. https://storage.bunnycdn.com/my-zone  or a regional endpoint
const BUNNY_BASE = (process.env.BUNNY_STORAGE_BASE ?? "").replace(/\/$/, "");
const BUNNY_KEY = process.env.BUNNY_STORAGE_API_KEY ?? "";
const BUNNY_REMOTE_PATH = "sitemaps";
const UPLOAD_CONCURRENCY = 5;

// ── Progress bar ──────────────────────────────────────────────────────────────

const BAR_WIDTH = 36;

function renderProgress(current: number, total: number, startMs: number): void {
  const pct = Math.min(1, current / total);
  const filled = Math.round(BAR_WIDTH * pct);
  const bar = "█".repeat(filled) + "░".repeat(BAR_WIDTH - filled);
  const elapsed = (Date.now() - startMs) / 1000;
  const eta = pct > 0.01 ? Math.round((elapsed / pct) * (1 - pct)) + "s" : "…";
  const line = `  [${bar}] ${(pct * 100).toFixed(1).padStart(5)}%  ${current.toLocaleString().padStart(14)} / ${total.toLocaleString()}  ETA ${eta}`;
  process.stdout.write(`\r${line}`);
}

function clearProgress(): void {
  process.stdout.write(`\r${" ".repeat(80)}\r`);
}

// ── XML builders ─────────────────────────────────────────────────────────────

function buildSitemapXml(
  entries: Array<{ loc: string; lastmod?: string }>,
): string {
  const body = entries
    .map((e) => {
      const lastmodLine = e.lastmod
        ? `\n    <lastmod>${e.lastmod}</lastmod>`
        : "";
      return `  <url>\n    <loc>${BASE_URL}${e.loc}</loc>${lastmodLine}\n  </url>`;
    })
    .join("\n");

  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    `${body}\n` +
    "</urlset>"
  );
}

function buildIndexXml(prefix: string, chunkCount: number): string {
  const body = Array.from(
    { length: chunkCount },
    (_, i) =>
      `  <sitemap>\n    <loc>${CDN_BASE}/${prefix}-${i}.xml</loc>\n  </sitemap>`,
  ).join("\n");

  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    `${body}\n` +
    "</sitemapindex>"
  );
}

// ── Generic cursor-based generator ───────────────────────────────────────────

async function generateSitemapFiles<T extends { id: number }>(opts: {
  prefix: string;
  total: number;
  fetchBatch: (lastId: number, limit: number) => Promise<T[]>;
  toEntry: (row: T) => { loc: string; lastmod?: string };
}): Promise<number> {
  const { prefix, total, fetchBatch, toEntry } = opts;

  consola.start(
    `${prefix}  —  ${total.toLocaleString()} rows  (~${Math.ceil(total / CHUNK_SIZE).toLocaleString()} chunks)`,
  );

  const startMs = Date.now();
  let chunkIndex = 0;
  let lastId = 0;
  let totalProcessed = 0;
  let buffer: Array<{ loc: string; lastmod?: string }> = [];

  const flushBuffer = () => {
    writeFileSync(
      join(OUTPUT_DIR, `${prefix}-${chunkIndex}.xml`),
      buildSitemapXml(buffer),
      "utf-8",
    );
    chunkIndex++;
    buffer = [];
  };

  while (true) {
    const rows = await fetchBatch(lastId, QUERY_BATCH_SIZE);
    if (rows.length === 0) break;

    buffer.push(...rows.map(toEntry));
    lastId = rows[rows.length - 1].id;
    totalProcessed += rows.length;

    if (buffer.length >= CHUNK_SIZE) flushBuffer();

    renderProgress(totalProcessed, total, startMs);

    if (rows.length < QUERY_BATCH_SIZE) break;
  }

  if (buffer.length > 0) flushBuffer();

  clearProgress();

  writeFileSync(
    join(OUTPUT_DIR, `${prefix}-index.xml`),
    buildIndexXml(prefix, chunkIndex),
    "utf-8",
  );

  const elapsed = ((Date.now() - startMs) / 1000).toFixed(1);
  consola.success(
    `${prefix}  —  ${chunkIndex} chunk(s) + index  (${elapsed}s)`,
  );

  return chunkIndex;
}

// ── Bunny CDN upload ─────────────────────────────────────────────────────────

async function uploadFileToBunny(fileName: string): Promise<void> {
  const content = readFileSync(join(OUTPUT_DIR, fileName));
  const checksum = createHash("sha256")
    .update(content)
    .digest("hex")
    .toUpperCase();
  const url = `${BUNNY_BASE}/${BUNNY_REMOTE_PATH}/${fileName}`;

  const res = await fetch(url, {
    method: "PUT",
    headers: { AccessKey: BUNNY_KEY, Checksum: checksum },
    body: content,
  });

  if (!res.ok) {
    throw new Error(
      `Bunny upload failed [${fileName}]: ${res.status} ${await res.text()}`,
    );
  }
}

async function uploadWithConcurrency(
  files: string[],
  concurrency: number,
): Promise<void> {
  const total = files.length;
  const queue = [...files];
  let done = 0;
  const startMs = Date.now();

  await Promise.all(
    Array.from({ length: concurrency }, async () => {
      while (queue.length > 0) {
        const file = queue.shift()!;
        await uploadFileToBunny(file);
        done++;
        renderProgress(done, total, startMs);
      }
    }),
  );

  clearProgress();
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  mkdirSync(OUTPUT_DIR, { recursive: true });
  consola.info(`Output: ${OUTPUT_DIR}\n`);

  const [datasetTotal, userTotal, orgTotal] = await Promise.all([
    prisma.dataset.count(),
    prisma.automatedUser.count(),
    prisma.automatedOrganization.count(),
  ]);

  const datasetChunks = await generateSitemapFiles({
    prefix: "datasets",
    total: datasetTotal,
    fetchBatch: (lastId, limit) =>
      prisma.$queryRaw<{ id: number; updated: Date }[]>`
        SELECT id, updated FROM "Dataset"
        WHERE id > ${lastId} ORDER BY id ASC LIMIT ${limit}
      `,
    toEntry: (r) => ({
      loc: `/datasets/${r.id}`,
      lastmod: r.updated.toISOString().split("T")[0],
    }),
  });

  const userChunks = await generateSitemapFiles({
    prefix: "users",
    total: userTotal,
    fetchBatch: (lastId, limit) =>
      prisma.$queryRaw<{ id: number }[]>`
        SELECT id FROM "AutomatedUser"
        WHERE id > ${lastId} ORDER BY id ASC LIMIT ${limit}
      `,
    toEntry: (r) => ({ loc: `/au/${r.id}` }),
  });

  const orgChunks = await generateSitemapFiles({
    prefix: "orgs",
    total: orgTotal,
    fetchBatch: (lastId, limit) =>
      prisma.$queryRaw<{ id: number }[]>`
        SELECT id FROM "AutomatedOrganization"
        WHERE id > ${lastId} ORDER BY id ASC LIMIT ${limit}
      `,
    toEntry: (r) => ({ loc: `/ao/${r.id}` }),
  });

  if (!BUNNY_BASE || !BUNNY_KEY) {
    consola.warn(
      "BUNNY_STORAGE_BASE or BUNNY_STORAGE_API_KEY not set — skipping upload.",
    );
  } else {
    consola.start("Uploading to Bunny CDN...");

    const allFiles: string[] = [];
    for (const { prefix, chunks } of [
      { prefix: "datasets", chunks: datasetChunks },
      { prefix: "users", chunks: userChunks },
      { prefix: "orgs", chunks: orgChunks },
    ]) {
      for (let i = 0; i < chunks; i++) allFiles.push(`${prefix}-${i}.xml`);
      allFiles.push(`${prefix}-index.xml`);
    }

    await uploadWithConcurrency(allFiles, UPLOAD_CONCURRENCY);
    consola.success(`\n${allFiles.length} files uploaded to Bunny CDN.`);
  }

  consola.box(
    [
      "Update nuxt.config.ts:\n",
      `  const DATASET_SITEMAP_CHUNKS = ${datasetChunks};`,
      `  const USER_SITEMAP_CHUNKS    = ${userChunks};`,
      `  const ORG_SITEMAP_CHUNKS     = ${orgChunks};`,
    ].join("\n"),
  );

  await prisma.$disconnect();
}

main().catch((e) => {
  consola.error(e);
  process.exit(1);
});

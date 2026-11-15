/**
 * Export every dataset whose DOI starts with a given prefix, along with its
 * citations, to a JSON file.
 *
 * Usage:
 *   pnpm tsx scripts/custom/export-datasets-by-doi-prefix.ts [doiPrefix] [outputFile]
 *
 * Defaults to the whole UIUC Library DOI prefix (10.13012/), which covers the
 * Illinois Data Bank (e.g. https://doi.org/10.13012/B2IDB-3496460_V4).
 * Pass "10.13012/B2IDB-" to limit the export to current-style Illinois Data Bank
 * DOIs only; each record's `publisher` field can also be used to filter later.
 */
import * as fs from "fs";
import * as path from "path";
import { PrismaClient } from "../../shared/generated/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });

const normalizeDoiPrefix = (input: string) =>
  input
    .trim()
    .toLowerCase()
    .replace(/^(https?:\/\/)?(dx\.)?doi\.org\//, "")
    .replace(/^doi:/, "");

const DOI_PREFIX = normalizeDoiPrefix(process.argv[2] ?? "10.13012/");

const OUTPUT_FILE = path.resolve(
  process.argv[3] ??
    path.join(
      ".dev.local",
      `datasets-${DOI_PREFIX.replace(/[^a-z0-9]+/g, "-").replace(/-+$/, "")}.json`,
    ),
);

const main = async () => {
  const fetchBatchSize = 500;
  let lastId = 0;
  let totalProcessed = 0;
  let totalCitations = 0;

  const where = {
    identifierType: "doi",
    identifier: { startsWith: DOI_PREFIX, mode: "insensitive" as const },
  };

  const totalCount = await prisma.dataset.count({ where });

  console.log(
    `\n🔍 Exporting ${totalCount.toLocaleString()} datasets with DOI prefix "${DOI_PREFIX}"\n`,
  );

  if (totalCount === 0) {
    console.log("Nothing to export. Check the prefix and DATABASE_URL.\n");

    return;
  }

  const results: unknown[] = [];
  const startTime = Date.now();
  const barLength = 40;

  while (true) {
    const datasets = await prisma.dataset.findMany({
      where: { ...where, id: { gt: lastId } },
      take: fetchBatchSize,
      orderBy: { id: "asc" },
      select: {
        id: true,
        identifier: true,
        identifierType: true,
        url: true,
        title: true,
        description: true,
        version: true,
        publisher: true,
        publisherId: true,
        publishedAt: true,
        pubYear: true,
        subjects: true,
        datasetAuthors: {
          orderBy: { id: "asc" },
          select: {
            name: true,
            nameType: true,
            nameIdentifiers: true,
            affiliations: true,
          },
        },
        datasetRights: {
          select: { name: true, identifier: true, uri: true },
        },
        fujiScore: { select: { score: true, evaluationDate: true } },
        dindices: {
          orderBy: [{ year: "desc" }, { created: "desc" }],
          take: 1,
          select: { score: true, year: true },
        },
        citations: {
          orderBy: { citedDate: "asc" },
          select: {
            citationLink: true,
            citedDate: true,
            citationWeight: true,
            datacite: true,
            mdc: true,
            openAlex: true,
          },
        },
      },
    });

    if (datasets.length === 0) {
      break;
    }

    for (const {
      datasetAuthors,
      datasetRights,
      fujiScore,
      dindices,
      citations,
      ...dataset
    } of datasets) {
      totalCitations += citations.length;

      results.push({
        ...dataset,
        doiUrl: `https://doi.org/${dataset.identifier}`,
        authors: datasetAuthors,
        rights: datasetRights,
        fairScore: fujiScore?.score ?? null,
        fairEvaluatedAt: fujiScore?.evaluationDate ?? null,
        dIndex: dindices[0]?.score ?? null,
        dIndexYear: dindices[0]?.year ?? null,
        citationCount: citations.length,
        citations,
      });
    }

    lastId = datasets[datasets.length - 1].id;
    totalProcessed += datasets.length;

    const progress = (totalProcessed / totalCount) * 100;
    const filled = Math.round((progress / 100) * barLength);
    const bar = "█".repeat(filled) + "░".repeat(barLength - filled);
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    process.stdout.write(
      `\r${bar} ${progress.toFixed(1)}% | ${totalProcessed.toLocaleString()}/${totalCount.toLocaleString()} | ⏱️  ${elapsed}s`,
    );

    if (datasets.length < fetchBatchSize) {
      break;
    }
  }

  const output = {
    doiPrefix: DOI_PREFIX,
    exportedAt: new Date().toISOString(),
    datasetCount: results.length,
    citationCount: totalCitations,
    datasets: results,
  };

  fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(
    `\n\n✅ Wrote ${results.length.toLocaleString()} datasets and ${totalCitations.toLocaleString()} citations in ${totalTime}s to ${OUTPUT_FILE}\n`,
  );
};

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

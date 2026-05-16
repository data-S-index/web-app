import { MeiliSearch } from "meilisearch";
import { PrismaClient } from "../shared/generated/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";

const { MEILISEARCH_API_KEY, MEILISEARCH_API_URL } = process.env;

if (!MEILISEARCH_API_KEY || !MEILISEARCH_API_URL) {
  console.error(
    "Error: MEILISEARCH_API_KEY and MEILISEARCH_API_URL must be set in environment variables",
  );
  process.exit(1);
}

const client = new MeiliSearch({
  host: MEILISEARCH_API_URL.replace(/\/$/, ""),
  apiKey: MEILISEARCH_API_KEY,
});

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });

const BATCH_SIZE = 100;

async function main() {
  console.log("Fetching non-anonymous users from database...");

  const users = await prisma.user.findMany({
    where: { anonymous: false },
    select: {
      id: true,
      givenName: true,
      familyName: true,
      affiliation: true,
      orcid: true,
    },
  });

  console.log(`Found ${users.length} non-anonymous users.`);

  if (users.length === 0) {
    console.log("No users to index. Exiting.");

    return;
  }

  const documents = users.map((user) => ({
    id: user.id,
    name: `${user.givenName} ${user.familyName}`.trim(),
    affiliations: user.affiliation ? [user.affiliation] : [],
    nameIdentifiers: user.orcid ? [user.orcid] : [],
  }));

  const index = client.index("user");

  console.log("Clearing existing documents from 'user' index...");
  await index.deleteAllDocuments();

  console.log(
    `Indexing ${documents.length} users into Meilisearch 'user' index in batches of ${BATCH_SIZE}...`,
  );

  for (let i = 0; i < documents.length; i += BATCH_SIZE) {
    const batch = documents.slice(i, i + BATCH_SIZE);
    const task = await index.addDocuments(batch);
    console.log(
      `Batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(documents.length / BATCH_SIZE)} queued (taskUid: ${task.taskUid})`,
    );
  }

  console.log("Done. Documents have been queued for indexing in Meilisearch.");
}

main()
  .catch((err) => {
    console.error("Error:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

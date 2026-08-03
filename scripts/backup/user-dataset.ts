import { PrismaClient } from "../../shared/generated/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { createHash, randomUUID } from "crypto";
import { consola } from "consola";
import "dotenv/config";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });

const BUNNY_BASE = (process.env.BUNNY_STORAGE_BASE ?? "").replace(/\/$/, "");
const BUNNY_KEY = process.env.BUNNY_STORAGE_API_KEY ?? "";
const BUNNY_REMOTE_PATH = "user-dataset-backup";

async function uploadToBunny(fileName: string, content: Buffer): Promise<void> {
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

const main = async () => {
  const records = await prisma.userDataset.findMany({
    include: {
      user: {
        select: {
          id: true,
          login: true,
          givenName: true,
          familyName: true,
        },
      },
      dataset: {
        select: {
          id: true,
          identifier: true,
          identifierType: true,
        },
      },
    },
  });

  const output = records.map((r) => ({
    userId: r.userId,
    name: `${r.user.givenName} ${r.user.familyName}`.trim(),
    email: r.user.login,
    datasetId: r.datasetId,
    datasetIdentifier: r.dataset.identifier,
    datasetIdentifierType: r.dataset.identifierType,
  }));

  const date = new Date().toISOString().split("T")[0];
  const filename = `${date}-${randomUUID()}.json`;
  const content = Buffer.from(JSON.stringify(output, null, 2));

  if (!BUNNY_BASE || !BUNNY_KEY) {
    throw new Error(
      "BUNNY_STORAGE_BASE or BUNNY_STORAGE_API_KEY not set — cannot upload backup.",
    );
  }

  await uploadToBunny(filename, content);

  consola.success(`Backed up ${output.length} user-dataset records.`);
};

main()
  .catch((error) => {
    consola.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

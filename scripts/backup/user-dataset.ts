import { PrismaClient } from "../../shared/generated/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { writeFileSync } from "fs";
import { join } from "path";
import "dotenv/config";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });

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

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `user-dataset-backup-${timestamp}.json`;
  const outPath = join(process.cwd(), "scripts", "backup", filename);

  writeFileSync(outPath, JSON.stringify(output, null, 2));

  console.log(`Backed up ${output.length} user-dataset records to ${filename}`);
};

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

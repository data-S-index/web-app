import { PrismaClient } from "../shared/generated/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });

const truncateTables = async () => {
  console.log("Truncating tables...");

  console.log("Truncating table Dataset...");
  await prisma.$executeRaw`TRUNCATE TABLE "Dataset" RESTART IDENTITY CASCADE`;

  // console.log("Truncating table User...");
  // await prisma.$executeRaw`TRUNCATE TABLE "User" RESTART IDENTITY CASCADE`;
};

const main = async () => {
  await truncateTables();
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

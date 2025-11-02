/* eslint-disable @typescript-eslint/no-explicit-any */
import { PrismaClient } from "@prisma/client";
import "dotenv/config";
import { faker } from "@faker-js/faker";

const prisma = new PrismaClient();

const main = async () => {
  // clear all tables
  await prisma.fujiScore.deleteMany();
  await prisma.citation.deleteMany();
  await prisma.userDataset.deleteMany();
  await prisma.dataset.deleteMany();

  // Fill datasets table with 1000 datasets
  const q1: any = [];
  for (let i = 0; i < 50; i++) {
    q1.push({
      title: faker.lorem.sentence(),
      description: faker.lorem.paragraph(),
      imageUrl: faker.image.url(),
      publishedAt: faker.date.past(),
      doi: `10.1000/${faker.string.nanoid(10)}`,
      publisher: faker.company.name(),
      publisherYear: faker.number.int({ min: 2000, max: 2025 }).toString(),
      subjects: [faker.lorem.word(), faker.lorem.word(), faker.lorem.word()],
      language: faker.helpers.arrayElement([
        "en",
        "es",
        "fr",
        "de",
        "it",
        "pt",
        "ru",
        "zh",
      ]),
      randomInt: faker.number.int(1000000),
      authors: Array.from(
        { length: faker.number.int({ min: 1, max: 5 }) },
        () => {
          const nameType = faker.helpers.arrayElement([
            "Personal",
            "Organizational",
          ]);

          return {
            nameType,
            givenName:
              nameType === "Personal"
                ? faker.person.firstName()
                : faker.company.name(),
            familyName: nameType === "Personal" ? faker.person.lastName() : "",
            affiliation:
              nameType === "Personal"
                ? Array.from(
                    { length: faker.number.int({ min: 0, max: 3 }) },
                    () => faker.company.name(),
                  )
                : [],
            nameIdentifiers:
              nameType === "Personal"
                ? Array.from(
                    { length: faker.number.int({ min: 0, max: 3 }) },
                    () => ({
                      nameIdentifier: faker.string.nanoid(10),
                      nameIdentifierScheme: faker.helpers.arrayElement([
                        "ORCID",
                        "ISNI",
                      ]),
                    }),
                  )
                : Array.from(
                    { length: faker.number.int({ min: 0, max: 3 }) },
                    () => ({
                      nameIdentifier: faker.string.nanoid(10),
                      nameIdentifierScheme: faker.helpers.arrayElement([
                        "GRID",
                      ]),
                    }),
                  ),
          };
        },
      ),
    });
  }

  await prisma.dataset.createMany({
    data: q1,
  });

  const datasetIds = await prisma.dataset.findMany({
    select: {
      id: true,
    },
  });

  // Fill citations table with 1000 citations
  const q2: any = [];
  for (let i = 0; i < 100; i++) {
    q2.push({
      datasetId: faker.helpers.arrayElement(datasetIds).id,
      doi: `10.1000/${faker.string.nanoid(10)}`,
      citedDate: faker.date.past(),
    });
  }
  await prisma.citation.createMany({
    data: q2,
  });

  // Fill fuji scores table with 100 fuji scores
  const q3: any = [];
  for (let i = 0; i < 50; i++) {
    q3.push({
      datasetId: datasetIds[i].id,
      score: faker.number.int({ min: 60, max: 100 }),
    });
  }
  await prisma.fujiScore.createMany({
    data: q3,
  });
};

main()
  .catch((e) => {
    throw e;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

/* eslint-disable @typescript-eslint/no-explicit-any */
import { PrismaClient } from "@prisma/client";
import "dotenv/config";
import { faker } from "@faker-js/faker";

const prisma = new PrismaClient();

const universities = [
  "University of California, Berkeley",
  "University of California, Los Angeles",
  "University of California, San Diego",
  "University of California, Santa Barbara",
  "University of California, Irvine",
  "University of California, Santa Cruz",
  "University of California, Riverside",
  "California Institute of Technology",
  "Stanford University",
  "Massachusetts Institute of Technology",
  "Harvard University",
  "Princeton University",
  "Columbia University",
  "University of Chicago",
  "University of Oxford",
  "University of Cambridge",
  "University of Oxford",
  "University of Michigan",
  "University of Pennsylvania",
  "California Polytechnic State University",
  "California State University, Long Beach",
  "California State University, Fullerton",
  "California State University, Northridge",
  "California State University, Pomona",
  "California State University, San Bernardino",
  "California State University, San Marcos",
  "California State University, San Jose",
  "California State University, Sonoma",
  "California State University, Stanislaus",
  "California State University, West Los Angeles",
  "California State University, Westside",
  "California State University, Westwood",
  "California State University, Whittier",
  "California State University, Woodland",
  "California State University, Yuba City",
  "California State University, Chico",
  "California State University, East Bay",
  "California State University, Fresno",
  "California State University, San Luis Obispo",
];

const publishers = [
  "Elsevier",
  "Springer",
  "Nature Publishing Group",
  "American Chemical Society",
  "American Physical Society",
  "American Mathematical Society",
  "American Sociological Association",
  "American Psychological Association",
  "American Political Science Association",
  "IEEE",
  "ACM",
  "IEEE Computer Society",
  "IEEE Robotics and Automation Society",
  "IEEE Signal Processing Society",
  "IEEE Systems, Man, and Cybernetics Society",
  "IEEE Vehicular Technology Society",
  "IEEE Wireless Communications Society",
  "IEEE Wireless Networking Society",
  "Nature",
  "Science",
  "PNAS",
  "PLOS",
  "BioRxiv",
  "MedRxiv",
  "arXiv",
  "PubMed",
  "PubMed Central",
  "F1000Research",
  "Frontiers",
  "Frontiers in Genetics",
  "Frontiers in Immunology",
  "Frontiers in Microbiology",
  "Frontiers in Nutrition",
  "Frontiers in Pharmacology",
  "Frontiers in Psychology",
  "Frontiers in Robotics and AI",
];

const subjects = [
  "Computer Science",
  "Mathematics",
  "Physics",
  "Chemistry",
  "Biology",
  "Medicine",
  "Engineering",
  "Social Sciences",
  "Humanities",
  "Arts and Culture",
  "Business",
  "Law",
  "Education",
  "Health",
  "Environmental Science",
  "Geoscience",
  "AI",
  "Machine Learning",
  "Deep Learning",
  "Artificial Intelligence",
  "Machine Learning",
  "Deep Learning",
  "Artificial Intelligence",
  "Data Science",
  "Data Mining",
  "Data Visualization",
  "Data Analysis",
  "Data Engineering",
  "Data Management",
  "Data Security",
  "Data Privacy",
  "Data Governance",
  "Enzymes",
  "Proteins",
  "DNA",
  "RNA",
  "Cell",
  "Organism",
  "Ecosystem",
  "Environment",
  "Climate",
  "Weather",
  "Hydrology",
  "Geology",
  "Geophysics",
  "Geochemistry",
  "Geobiology",
  "Geoinformatics",
];

const languages = ["en", "es", "fr", "de", "it", "pt", "ru", "zh"];

const main = async () => {
  // clear all tables
  await prisma.fujiScore.deleteMany();
  await prisma.citation.deleteMany();
  await prisma.userDataset.deleteMany();
  await prisma.dataset.deleteMany();

  const datasetCount = 250;

  // Fill datasets table with datasetCount datasets
  const q1: any = [];
  for (let i = 0; i < datasetCount; i++) {
    q1.push({
      title: faker.lorem.sentence(),
      description: faker.lorem.paragraph(),
      imageUrl: faker.image.url(),
      publishedAt: faker.date.past(),
      doi: `10.1000/${faker.string.nanoid(10)}`,
      publisher: faker.helpers.arrayElement(publishers),
      publisherYear: faker.number.int({ min: 2000, max: 2025 }).toString(),
      subjects: [
        ...new Set(
          Array.from({ length: faker.number.int({ min: 1, max: 6 }) }, () =>
            faker.helpers.arrayElement(subjects),
          ),
        ),
      ],
      language: faker.helpers.arrayElement(languages),
      randomInt: faker.number.int(1000000),
      authors: Array.from(
        {
          length: faker.number.int({ min: 1, max: 5 }),
        },
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
                    () => faker.helpers.arrayElement(universities),
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

  // Fill citations table with datasetCount/2 citations
  const q2: any = [];
  for (let i = 0; i < datasetCount / 2; i++) {
    q2.push({
      datasetId: faker.helpers.arrayElement(datasetIds).id,
      doi: `10.1000/${faker.string.nanoid(10)}`,
      citedDate: faker.date.past(),
    });
  }
  await prisma.citation.createMany({
    data: q2,
  });

  // Fill fuji scores table with datasetCount fuji scores
  const q3: any = [];
  for (let i = 0; i < datasetCount; i++) {
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

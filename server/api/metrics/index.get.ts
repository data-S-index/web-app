import prisma from "../../utils/prisma";

type DatasetWithRelations = {
  publishedAt: Date;
  authors: unknown;
  subjects: string[] | null;
  FujiScore: Array<{ score: number }>;
  Citation: unknown[];
};

export default defineEventHandler(async (_event) => {
  const now = new Date();
  const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 12, 1);

  // Get all datasets with their citations and FAIR scores
  const datasets = await prisma.dataset.findMany({
    include: {
      Citation: true,
      FujiScore: true,
    },
    where: {
      publishedAt: {
        gte: twelveMonthsAgo,
      },
    },
    orderBy: {
      publishedAt: "asc",
    },
  });

  // Get all datasets for overall metrics (not just last 12 months)
  const allDatasets = await prisma.dataset.findMany({
    include: {
      Citation: true,
      FujiScore: true,
    },
  });

  // Generate monthly publication data for the last 12 months
  const monthlyData: Record<string, number> = {};
  const currentDate = new Date();

  // Initialize all months to 0
  for (let i = 11; i >= 0; i--) {
    const date = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth() - i,
      1,
    );
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    monthlyData[monthKey] = 0;
  }

  // Count datasets by month
  datasets.forEach((dataset: DatasetWithRelations) => {
    const date = new Date(dataset.publishedAt);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    if (monthlyData[monthKey] !== undefined) {
      monthlyData[monthKey]++;
    }
  });

  // Format monthly data for frontend
  const months: string[] = [];
  const datasetCounts: number[] = [];

  Object.keys(monthlyData).forEach((monthKey) => {
    const [year, month] = monthKey.split("-");
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    const monthName = date.toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    });
    months.push(monthName);
    datasetCounts.push(monthlyData[monthKey]!);
  });

  // Extract institutions from authors' affiliations
  const institutionCounts: Record<string, number> = {};
  allDatasets.forEach((dataset: DatasetWithRelations) => {
    if (dataset.authors && Array.isArray(dataset.authors)) {
      dataset.authors.forEach((author: { affiliation?: string[] }) => {
        if (author.affiliation && Array.isArray(author.affiliation)) {
          author.affiliation.forEach((affiliation: string) => {
            if (affiliation && typeof affiliation === "string") {
              if (affiliation.trim()) {
                institutionCounts[affiliation] =
                  (institutionCounts[affiliation] || 0) + 1;
              }
            }
          });
        }
      });
    }
  });

  // Get top 9 institutions and group the rest
  const sortedInstitutions = Object.entries(institutionCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 9)
    .map(([name, value]) => ({ name, value }));

  const otherInstitutionsCount = Object.entries(institutionCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(9)
    .reduce((sum, [, count]) => sum + count, 0);

  if (otherInstitutionsCount > 0) {
    sortedInstitutions.push({
      name: "Other Institutions",
      value: otherInstitutionsCount,
    });
  }

  // Extract research fields from subjects
  const fieldCounts: Record<string, number> = {};
  allDatasets.forEach((dataset: DatasetWithRelations) => {
    if (dataset.subjects && Array.isArray(dataset.subjects)) {
      dataset.subjects.forEach((subject: string) => {
        if (subject && typeof subject === "string") {
          fieldCounts[subject] = (fieldCounts[subject] || 0) + 1;
        }
      });
    }
  });

  // Get top 9 fields and group the rest
  const sortedFields = Object.entries(fieldCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 9)
    .map(([name, value]) => ({ name, value }));

  const otherFieldsCount = Object.entries(fieldCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(9)
    .reduce((sum, [, count]) => sum + count, 0);

  if (otherFieldsCount > 0) {
    sortedFields.push({ name: "Other Fields", value: otherFieldsCount });
  }

  // Calculate S-Index metrics
  const totalDatasets = allDatasets.length;
  const datasetsWithFairScores = allDatasets.filter(
    (d: DatasetWithRelations) => d.FujiScore && d.FujiScore.length > 0,
  );
  const datasetsWithCitations = allDatasets.filter(
    (d: DatasetWithRelations) => d.Citation && d.Citation.length > 0,
  );

  const averageFairScore =
    datasetsWithFairScores.length > 0
      ? datasetsWithFairScores.reduce(
          (sum: number, d: DatasetWithRelations) => {
            const latestScore = d.FujiScore[d.FujiScore.length - 1];

            return sum + (latestScore?.score || 0) / 100; // Convert 0-100 to 0-1
          },
          0,
        ) / datasetsWithFairScores.length
      : 0;

  const averageCitationCount =
    datasetsWithCitations.length > 0
      ? datasetsWithCitations.reduce(
          (sum: number, d: DatasetWithRelations) =>
            sum + (d.Citation?.length || 0),
          0,
        ) / datasetsWithCitations.length
      : 0;

  // For average S-Index, we'll use a simplified calculation
  // S-Index = (FAIR Score * 0.5) + (Citation Impact * 0.5)
  // Citation Impact = min(citation count / 20, 1) * 10
  const sIndexValues = allDatasets.map((d: DatasetWithRelations) => {
    const fairScore =
      d.FujiScore && d.FujiScore.length > 0
        ? (d.FujiScore[d.FujiScore.length - 1]?.score || 0) / 100
        : 0;
    const citationCount = d.Citation?.length || 0;
    const citationImpact = Math.min(citationCount / 20, 1) * 10;

    return fairScore * 5 + citationImpact * 0.5; // Normalize to reasonable range
  });

  const averageSIndex =
    sIndexValues.length > 0
      ? sIndexValues.reduce((sum: number, val: number) => sum + val, 0) /
        sIndexValues.length
      : 0;

  const highFairDatasets = datasetsWithFairScores.filter(
    (d: DatasetWithRelations) => {
      const latestScore = d.FujiScore[d.FujiScore.length - 1];

      return latestScore && latestScore.score > 70; // FAIR Score > 0.7 (70/100)
    },
  ).length;

  return {
    monthlyPublications: {
      months,
      datasets: datasetCounts,
    },
    institutions: sortedInstitutions,
    fields: sortedFields,
    sIndexMetrics: {
      averageFairScore: Math.round(averageFairScore * 100) / 100,
      averageCitationCount: Math.round(averageCitationCount * 10) / 10,
      averageSIndex: Math.round(averageSIndex * 10) / 10,
      totalDatasets,
      highFairDatasets,
      citedDatasets: datasetsWithCitations.length,
    },
  };
});

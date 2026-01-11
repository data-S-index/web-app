export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const doi = (query.doi as string) || "";

  if (!doi || !doi.trim()) {
    throw createError({
      statusCode: 400,
      statusMessage: "DOI is required",
    });
  }

  // Extract DOI from various formats:
  // - https://doi.org/10.1234/example
  // - http://doi.org/10.1234/example
  // - doi:10.1234/example
  // - 10.1234/example
  let cleanDoi = doi.trim();

  // Remove doi.org URLs
  cleanDoi = cleanDoi.replace(/^https?:\/\/(dx\.)?doi\.org\//i, "");

  // Remove doi: prefix
  cleanDoi = cleanDoi.replace(/^doi:/i, "");

  // Trim any remaining whitespace
  cleanDoi = cleanDoi.trim();

  if (!cleanDoi) {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid DOI format",
    });
  }

  // Find dataset by DOI
  const dataset = await prisma.dataset.findUnique({
    where: {
      identifierType_identifier: {
        identifierType: "doi",
        identifier: cleanDoi,
      },
    },
    select: {
      id: true,
    },
  });

  if (!dataset) {
    throw createError({
      statusCode: 404,
      statusMessage: "Dataset not found for this DOI",
    });
  }

  return {
    datasetId: dataset.id,
    doi: cleanDoi,
  };
});

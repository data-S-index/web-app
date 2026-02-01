// Get a single automated organization by id from Meilisearch.
export default defineEventHandler(async (event) => {
  const { aoid } = event.context.params as { aoid: string };

  if (!aoid?.trim()) {
    throw createError({
      statusCode: 400,
      statusMessage: "Organization ID is required",
    });
  }

  try {
    const index = meilisearch.index("automated-organization");
    const doc = (await index.getDocument(aoid)) as {
      id: string;
      name?: string;
    } | null;

    if (!doc) {
      throw createError({
        statusCode: 404,
        statusMessage: "Organization not found",
      });
    }

    return {
      id: doc.id,
      name: doc.name ?? "",
    };
  } catch (error: unknown) {
    const err = error as { httpStatus?: number; message?: string };
    if (
      err?.httpStatus === 404 ||
      err?.message?.toLowerCase().includes("not found")
    ) {
      throw createError({
        statusCode: 404,
        statusMessage: "Organization not found",
      });
    }
    console.error("AO fetch error:", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to fetch organization",
    });
  }
});

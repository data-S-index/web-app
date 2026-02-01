// Get a single automated user by id from Meilisearch.
export default defineEventHandler(async (event) => {
  const { auid } = event.context.params as { auid: string };

  if (!auid?.trim()) {
    throw createError({
      statusCode: 400,
      statusMessage: "User ID is required",
    });
  }

  try {
    const index = meilisearch.index("automated-users");
    const doc = (await index.getDocument(auid)) as {
      id: string;
      name?: string;
      nameIdentifiers?: string[];
      affiliations?: string[];
    } | null;

    if (!doc) {
      throw createError({
        statusCode: 404,
        statusMessage: "User not found",
      });
    }

    return {
      id: doc.id,
      name: doc.name ?? "",
      nameIdentifiers: doc.nameIdentifiers ?? [],
      affiliations: doc.affiliations ?? [],
    };
  } catch (error: unknown) {
    const err = error as { httpStatus?: number; message?: string };
    if (
      err?.httpStatus === 404 ||
      err?.message?.toLowerCase().includes("not found")
    ) {
      throw createError({
        statusCode: 404,
        statusMessage: "User not found",
      });
    }
    console.error("AU fetch error:", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to fetch user",
    });
  }
});

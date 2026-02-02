import prisma from "../../../utils/prisma";

export default defineEventHandler(async (event) => {
  const { auid } = event.context.params as { auid: string };

  if (!auid?.trim()) {
    throw createError({
      statusCode: 400,
      statusMessage: "User ID is required",
    });
  }

  const automatedUser = await prisma.automatedUser.findUnique({
    where: { id: auid },
    select: {
      id: true,
      nameType: true,
      name: true,
      nameIdentifiers: true,
      affiliations: true,
    },
  });

  if (!automatedUser) {
    throw createError({
      statusCode: 404,
      statusMessage: "User not found",
    });
  }

  return {
    id: automatedUser.id,
    nameType: automatedUser.nameType ?? undefined,
    name: automatedUser.name ?? "",
    nameIdentifiers: automatedUser.nameIdentifiers ?? [],
    affiliations: automatedUser.affiliations ?? [],
  };
});

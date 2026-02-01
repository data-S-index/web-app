import prisma from "../../../utils/prisma";

export default defineEventHandler(async (event) => {
  const { aoid } = event.context.params as { aoid: string };

  if (!aoid?.trim()) {
    throw createError({
      statusCode: 400,
      statusMessage: "Organization ID is required",
    });
  }

  const org = await prisma.automatedOrganization.findUnique({
    where: { id: aoid },
    select: {
      id: true,
      name: true,
    },
  });

  if (!org) {
    throw createError({
      statusCode: 404,
      statusMessage: "Organization not found",
    });
  }

  return {
    id: org.id,
    name: org.name ?? "",
  };
});

import { z } from "zod";

const updateUserSchema = z.object({
  givenName: z.string().optional(),
  familyName: z.string().optional(),
  additionalNames: z.array(z.string()).optional(),
  affiliation: z.string().nullable().optional(),
  homePage: z.union([z.string().url(), z.literal("")]).optional(),
  areasOfInterest: z.array(z.string()).optional(),
  orcid: z.string().nullable().optional(),
});

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event);
  const userId = session.user.id;

  const body = await readValidatedBody(event, (b) =>
    updateUserSchema.safeParse(b),
  );

  if (!body.success) {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid profile data",
      data: body.error.flatten(),
    });
  }

  const { data } = body;
  const updatePayload: {
    givenName?: string;
    familyName?: string;
    additionalNames?: string[];
    affiliation?: string | null;
    homePage?: string | null;
    areasOfInterest?: string[];
    orcid?: string | null;
  } = {};

  if (data.givenName !== undefined) updatePayload.givenName = data.givenName;
  if (data.familyName !== undefined) updatePayload.familyName = data.familyName;
  if (data.additionalNames !== undefined)
    updatePayload.additionalNames = data.additionalNames;
  if (data.affiliation !== undefined)
    updatePayload.affiliation = data.affiliation;
  if (data.homePage !== undefined)
    updatePayload.homePage = data.homePage === "" ? null : data.homePage;
  if (data.areasOfInterest !== undefined)
    updatePayload.areasOfInterest = data.areasOfInterest;
  if (data.orcid !== undefined) updatePayload.orcid = data.orcid;

  const user = await prisma.user.update({
    where: { id: userId },
    data: updatePayload,
    select: {
      id: true,
      givenName: true,
      familyName: true,
      additionalNames: true,
      affiliation: true,
      homePage: true,
      orcid: true,
      areasOfInterest: true,
      created: true,
      updated: true,
    },
  });

  if (!user) {
    throw createError({
      statusCode: 404,
      statusMessage: "User not found",
    });
  }

  return user;
});

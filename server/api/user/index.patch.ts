import { z } from "zod";

const updateUserSchema = z.object({
  givenName: z.string().optional(),
  familyName: z.string().optional(),
  additionalNames: z.array(z.string()).optional(),
  affiliation: z.string().nullable().optional(),
  homePage: z.union([z.string().url(), z.literal("")]).optional(),
  areasOfInterest: z.array(z.string()).optional(),
});

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const { environment } = config.public;

  if (environment !== "development") {
    throw createError({
      statusCode: 404,
      statusMessage: "Not enabled",
    });
  }

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

  const data = body.data;
  const updatePayload: {
    givenName?: string;
    familyName?: string;
    additionalNames?: string[];
    affiliation?: string | null;
    homePage?: string | null;
    areasOfInterest?: string[];
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

  const user = await prisma.user.update({
    where: { id: userId },
    data: updatePayload,
    select: {
      id: true,
      username: true,
      givenName: true,
      familyName: true,
      additionalNames: true,
      affiliation: true,
      homePage: true,
      areasOfInterest: true,
      created: true,
      updated: true,
    },
  });

  return user;
});

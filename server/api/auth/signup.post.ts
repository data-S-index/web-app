import { z } from "zod";
import { hash } from "bcrypt";
import { MeiliSearch } from "meilisearch";

const signupSchema = z.object({
  temporary: z.boolean(),
  login: z.string().trim(),
  password: z.string().trim().min(12).max(128),
  givenName: z.string().optional(),
  familyName: z.string().optional(),
  affiliation: z.string().optional(),
  orcid: z.string().optional(),
});

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event);

  if ("user" in session) {
    const { user } = session;
    if (user) {
      return sendRedirect(event, `/users/${user?.id}`);
    }
  }

  const body = await readValidatedBody(event, (b) => signupSchema.safeParse(b));

  if (!body.success) {
    throw createError({
      statusCode: 400,
      statusMessage: "Missing or invalid signup details",
    });
  }

  const login = body.data.login.trim().toLowerCase();

  // Check if the user already exists
  const user = await prisma.user.findUnique({
    where: {
      login,
    },
  });

  if (user) {
    throw createError({
      statusCode: 401,
      statusMessage: "Login already in use",
    });
  }

  // Create a new user
  const hashedPassword = await hash(body.data.password, 10);

  const { givenName, familyName, affiliation, orcid, temporary } = body.data;

  const newUser = await prisma.user.create({
    data: {
      anonymous: temporary,
      login,
      password: hashedPassword,
      givenName,
      familyName,
      affiliation,
      orcid,
    },
  });

  if (!newUser) {
    throw createError({
      statusCode: 500,
      statusMessage: "Error creating user",
    });
  }

  if (!temporary) {
    try {
      const meili = new MeiliSearch({
        host: (process.env.MEILISEARCH_API_URL ?? "").replace(/\/$/, ""),
        apiKey: process.env.MEILISEARCH_API_KEY,
      });

      await meili.index("user").addDocuments([
        {
          id: newUser.id,
          name: `${newUser.givenName ?? ""} ${newUser.familyName ?? ""}`.trim(),
          affiliations: newUser.affiliation ? [newUser.affiliation] : [],
          nameIdentifiers: newUser.orcid ? [newUser.orcid] : [],
        },
      ]);
    } catch (error) {
      console.error("Error adding user to MeiliSearch index:", error);
    }
  }

  return { message: "User created successfully" };
});

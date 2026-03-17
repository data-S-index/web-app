import { z } from "zod";
import { compare } from "bcrypt";

const loginSchema = z.object({
  login: z.string().min(3, "Must be at least 3 characters"),
  password: z.string().min(8),
});

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event);

  if ("user" in session) {
    const userId = session.user?.id;
    if (userId) {
      return sendRedirect(event, `/users/${userId}`);
    }
  }

  const body = await readValidatedBody(event, (b) => loginSchema.safeParse(b));

  if (!body.success) {
    throw createError({
      statusCode: 400,
      statusMessage: "Missing login credentials",
    });
  }

  // Get the user from the database
  const user = await prisma.user.findUnique({
    where: {
      login: body.data.login,
    },
  });

  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: "Invalid login/email or password",
    });
  }

  // Check if the password matches
  if (!(await compare(body.data.password, user.password))) {
    throw createError({
      statusCode: 401,
      statusMessage: "Invalid username/email or password",
    });
  }

  // Create a new session for the user
  const userData = {
    id: user.id,
    login: user.login,
    familyName: user.familyName,
    givenName: user.givenName,
  };

  await setUserSession(event, {
    loggedInAt: new Date(),
    user: userData,
    userSessionField: "",
  });

  return {
    userId: user.id,
  };
});

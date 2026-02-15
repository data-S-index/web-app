import { z } from "zod";
import { hash } from "bcrypt";

const signupSchema = z.object({
  username: z.string().min(3, "Must be at least 3 characters"),
  password: z.string().min(8),
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

  // Check if the user already exists
  const user = await prisma.user.findUnique({
    where: {
      username: body.data.username,
    },
  });

  if (user) {
    throw createError({
      statusCode: 401,
      statusMessage: "Username already in use",
    });
  }

  // Create a new user
  const hashedPassword = await hash(body.data.password, 10);

  const newUser = await prisma.user.create({
    data: {
      username: body.data.username,
      password: hashedPassword,
    },
  });

  if (!newUser) {
    throw createError({
      statusCode: 500,
      statusMessage: "Error creating user",
    });
  }

  return { message: "User created successfully" };
});

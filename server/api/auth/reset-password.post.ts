import { z } from "zod";
import { hash } from "bcrypt";
import { createHash } from "crypto";

const schema = z.object({
  token: z.string().min(1, "Token is required"),
  password: z
    .string()
    .min(12, "Password must be at least 12 characters")
    .max(128, "Password must be at most 128 characters"),
});

export default defineEventHandler(async (event) => {
  const body = await readValidatedBody(event, (b) => schema.safeParse(b));

  if (!body.success) {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid request",
    });
  }

  const { token, password } = body.data;

  const hashedToken = createHash("sha256").update(token).digest("hex");

  const record = await prisma.userForgotPassword.findUnique({
    where: { resetToken: hashedToken },
    select: { userId: true, expiresAt: true },
  });

  if (!record) {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid or expired reset link",
    });
  }

  if (record.expiresAt < new Date()) {
    await prisma.userForgotPassword.delete({
      where: { resetToken: hashedToken },
    });
    throw createError({
      statusCode: 400,
      statusMessage: "This reset link has expired. Please request a new one.",
    });
  }

  const hashed = await hash(password, 10);

  await prisma.user.update({
    where: { id: record.userId },
    data: { password: hashed },
  });

  await prisma.userForgotPassword.delete({
    where: { resetToken: hashedToken },
  });

  return { success: true };
});

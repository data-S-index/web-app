import { z } from "zod";
import { randomBytes } from "crypto";
import { Resend } from "resend";

const schema = z.object({
  email: z.email("Must be a valid email address"),
});

export default defineEventHandler(async (event) => {
  const body = await readValidatedBody(event, (b) => schema.safeParse(b));

  if (!body.success) {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid email address",
    });
  }

  const { email } = body.data;

  const user = await prisma.user.findUnique({
    where: { login: email },
    select: { id: true, givenName: true },
  });

  // Always return success to avoid email enumeration
  if (!user) {
    return { success: true };
  }

  // Delete any existing reset tokens for this user
  await prisma.userForgotPassword.deleteMany({
    where: { userId: user.id },
  });

  const resetToken = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60); // 1 hour

  await prisma.userForgotPassword.create({
    data: {
      userId: user.id,
      resetToken,
      expiresAt,
    },
  });

  const config = useRuntimeConfig(event);
  const baseUrl = config.public.baseUrl || "http://localhost:3000";
  const resetUrl = `${baseUrl}/reset-password?token=${resetToken}`;

  const resend = new Resend(process.env.RESEND_API_KEY);

  const response = await resend.emails.send({
    from: "Scholar Data <noreply@scholardata.io>",
    to: [email],
    subject: "Reset your password",
    html: `
      <p>Hi${user.givenName ? ` ${user.givenName}` : ""},</p>
      <p>We received a request to reset your password. Click the link below to choose a new password:</p>
      <p><a href="${resetUrl}">Reset my password</a></p>
      <p>This link will expire in 1 hour. If you didn't request a password reset, you can safely ignore this email.</p>
      <p>— Scholar Data</p>
    `,
  });

  if (response.error) {
    console.error("Error sending password reset email:", response.error);

    throw createError({
      statusCode: 500,
      statusMessage: "Error sending email",
    });
  }

  return { success: true };
});

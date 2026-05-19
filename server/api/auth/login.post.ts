import { z } from "zod";
import { compare } from "bcrypt";
import { checkRateLimit, getRateLimitIdentifier } from "../../utils/rateLimit";

const LOGIN_IP_RATE_LIMIT = {
  maxRequests: 20,
  windowSeconds: 15 * 60,
  keyPrefix: "auth:login:ip",
};

const LOGIN_IDENTIFIER_RATE_LIMIT = {
  maxRequests: 8,
  windowSeconds: 15 * 60,
  keyPrefix: "auth:login:identifier",
};

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

  const login = body.data.login.trim().toLowerCase();

  const identifier = await getRateLimitIdentifier(event);
  const ipRateLimitResult = await checkRateLimit(
    identifier,
    LOGIN_IP_RATE_LIMIT,
  );
  if (!ipRateLimitResult.allowed) {
    throw createError({
      statusCode: 429,
      statusMessage: "Too Many Requests",
      data: {
        message: "Too many login attempts. Please try again later.",
        resetAt: ipRateLimitResult.resetAt,
        remaining: ipRateLimitResult.remaining,
      },
    });
  }

  const identifierRateLimitResult = await checkRateLimit(
    login,
    LOGIN_IDENTIFIER_RATE_LIMIT,
  );
  if (!identifierRateLimitResult.allowed) {
    throw createError({
      statusCode: 429,
      statusMessage: "Too Many Requests",
      data: {
        message: "Too many login attempts. Please try again later.",
        resetAt: identifierRateLimitResult.resetAt,
        remaining: identifierRateLimitResult.remaining,
      },
    });
  }

  const effectiveRateLimit =
    ipRateLimitResult.remaining <= identifierRateLimitResult.remaining
      ? ipRateLimitResult
      : identifierRateLimitResult;

  setHeader(
    event,
    "X-RateLimit-Limit",
    LOGIN_IP_RATE_LIMIT.maxRequests.toString(),
  );
  setHeader(
    event,
    "X-RateLimit-Remaining",
    effectiveRateLimit.remaining.toString(),
  );
  setHeader(event, "X-RateLimit-Reset", effectiveRateLimit.resetAt.toString());

  // Get the user from the database
  const user = await prisma.user.findUnique({
    where: {
      login,
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

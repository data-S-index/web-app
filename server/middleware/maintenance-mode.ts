const BLOCKED_ROUTES: { method: string; path: string }[] = [
  { method: "POST", path: "/api/auth/login" },
  { method: "POST", path: "/api/auth/signup" },
  { method: "POST", path: "/api/auth/forgot-password" },
  { method: "POST", path: "/api/auth/reset-password" },
  { method: "POST", path: "/api/user/datasets" },
  { method: "DELETE", path: "/api/user/datasets" },
];

export default defineEventHandler((event) => {
  const { maintenanceMode } = useRuntimeConfig().public;

  if (!maintenanceMode) {
    return;
  }

  const method = event.node.req.method ?? "GET";

  const isBlocked = BLOCKED_ROUTES.some(
    (route) => route.method === method && event.path.startsWith(route.path),
  );

  if (isBlocked) {
    throw createError({
      statusCode: 503,
      statusMessage: "Service temporarily unavailable for maintenance",
    });
  }
});

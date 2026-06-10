const CACHE_MAX_AGE_SECONDS = 60 * 60 * 24;

export default defineEventHandler((event) => {
  const url = event.node.req.url ?? "";

  if (!url.startsWith("/api/v1/")) {
    return;
  }

  setHeader(event, "Cache-Control", `public, max-age=${CACHE_MAX_AGE_SECONDS}`);
});

// Logs every page (frontend) and API (backend) request once the response is
// sent. Static assets are skipped so they don't drown out the useful lines.

const ASSET_PREFIXES = ["/_nuxt/", "/__nuxt", "/_ipx/", "/_og/"];
const ASSET_EXTENSION = /\.[a-z0-9]+$/i;

function getRequestType(path: string): "page" | "api" | null {
  if (path.startsWith("/api/")) return "api";
  if (ASSET_PREFIXES.some((prefix) => path.startsWith(prefix))) return null;
  if (ASSET_EXTENSION.test(path)) return null;

  return "page";
}

export default defineEventHandler((event) => {
  const url = event.node.req.url ?? "";
  const type = getRequestType(event.path.split("?")[0] ?? "");

  if (!type) return;

  const startTime = performance.now();

  event.node.res.on("finish", () => {
    const durationMs = (performance.now() - startTime).toFixed(0);

    console.log(
      `[${new Date().toISOString()}] [${type}] ${event.node.req.method} ${url} ${event.node.res.statusCode} ${durationMs}ms`,
    );
  });
});

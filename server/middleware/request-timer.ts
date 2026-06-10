type RequestMetrics = {
  timestamp: string;
  method: string;
  url: string;
  statusCode: number;
  durationMs: number;
};

const SKIPPED_PREFIXES = ["/_nuxt/", "/__nuxt"];

export default defineEventHandler((event) => {
  const startTime = performance.now();

  event.node.res.on("finish", () => {
    const url = event.node.req.url ?? "";

    if (SKIPPED_PREFIXES.some((prefix) => url.startsWith(prefix))) {
      return;
    }

    const metrics: RequestMetrics = {
      timestamp: new Date().toISOString(),
      method: event.node.req.method ?? "UNKNOWN",
      url,
      statusCode: event.node.res.statusCode,
      durationMs: Number((performance.now() - startTime).toFixed(2)),
    };

    storeMetrics(metrics);
  });
});

function storeMetrics(metrics: RequestMetrics) {
  console.log(
    `[TIMER] ${metrics.timestamp} ${metrics.method} ${metrics.url} ${metrics.statusCode} ${metrics.durationMs}ms`,
  );

  // Extend here to persist metrics to Prisma, Redis, or an external APM.
}

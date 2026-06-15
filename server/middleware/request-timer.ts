import { logwatch } from "~~/server/utils/logwatch";

type RequestMetrics = {
  environment: "prd" | "dev";
  method: string;
  url: string;
  statusCode: number;
  durationMs: number;
  durationSec?: number;
  userAgent?: string;
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
      environment: process.env.NODE_ENV === "production" ? "prd" : "dev",
      method: event.node.req.method ?? "UNKNOWN",
      url,
      statusCode: event.node.res.statusCode,
      durationMs: Number((performance.now() - startTime).toFixed(2)),
      userAgent: event.node.req.headers["user-agent"],
    };

    if (metrics.durationMs > 1000) {
      metrics.durationSec = Number((metrics.durationMs / 1000).toFixed(2));
    }

    storeMetrics(metrics);
  });
});

function storeMetrics(metrics: RequestMetrics) {
  logwatch.info({
    action: "request-timer",
    message: `[${metrics.environment}] ${metrics.method} ${metrics.url} ${metrics.statusCode} ${metrics.durationSec ?? metrics.durationMs}${metrics.durationSec ? "s" : "ms"} | ${metrics.userAgent ?? "unknown"}`,
    ...metrics,
  });
}

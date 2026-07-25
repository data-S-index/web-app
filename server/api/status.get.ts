type ServiceStatus = "operational" | "degraded" | "down";

interface ServiceCheck {
  name: string;
  status: ServiceStatus;
  latencyMs: number;
  message?: string;
}

const CHECK_TIMEOUT_MS = 5000;
const CACHE_TTL_MS = 5000;

interface StatusResponse {
  status: ServiceStatus;
  checkedAt: string;
  services: ServiceCheck[];
}

let cachedResponse: StatusResponse | null = null;
let cachedAt = 0;

async function checkService(
  name: string,
  fn: () => Promise<unknown>,
): Promise<ServiceCheck> {
  const start = performance.now();

  try {
    await Promise.race([
      fn(),
      new Promise((_resolve, reject) => {
        setTimeout(() => reject(new Error("Timed out")), CHECK_TIMEOUT_MS);
      }),
    ]);

    return {
      name,
      status: "operational",
      latencyMs: Math.round(performance.now() - start),
    };
  } catch (error) {
    return {
      name,
      status: "down",
      latencyMs: Math.round(performance.now() - start),
      message: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

function overallStatus(services: ServiceCheck[]): ServiceStatus {
  const downCount = services.filter((service) => service.status === "down").length;

  if (downCount === 0) return "operational";
  if (downCount === services.length) return "down";

  return "degraded";
}

export default defineEventHandler(async (): Promise<StatusResponse> => {
  const now = Date.now();

  if (cachedResponse && now - cachedAt < CACHE_TTL_MS) {
    return cachedResponse;
  }

  const services = await Promise.all([
    checkService("Database", () => prisma.$queryRaw`SELECT 1`),
    checkService("Redis Cache", () => getRedisClient().ping()),
    checkService("Search (Meilisearch)", () => meilisearch.health()),
  ]);

  const response: StatusResponse = {
    status: overallStatus(services),
    checkedAt: new Date().toISOString(),
    services,
  };

  cachedResponse = response;
  cachedAt = now;

  return response;
});

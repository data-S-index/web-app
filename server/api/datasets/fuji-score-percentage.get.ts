const MAX_ID = 49009522;

// Returns the percentage of datasets that have a fuji score and IP stats
export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const requestedIp = query.ip as string | undefined;

  // Get percentage data
  const totalDatasets = MAX_ID;
  const datasetsWithFujiScore = await prisma.fujiScore.count();
  const percentage =
    totalDatasets > 0
      ? ((datasetsWithFujiScore / totalDatasets) * 100 * 1000) / 1000
      : 0;

  const tenMinutesAgoDate = new Date(Date.now() - 10 * 60 * 1000);
  const jobsDoneLast10Minutes = await prisma.fujiScore.count({
    where: {
      updated: {
        gte: tenMinutesAgoDate,
      },
    },
  });

  // Get IP stats
  const redis = getRedisClient();
  const tenMinutesInMs = 10 * 60 * 1000;
  const now = Date.now();
  const tenMinutesAgo = now - tenMinutesInMs;

  // Helper function to parse key and extract IP and timestamp
  const parseKey = (key: string) => {
    const parts = key.split(":");
    if (parts.length < 5) return null;
    const ip = parts[3];
    const timestampPart = parts[4]?.split("-")[0];
    const timestamp = timestampPart ? Number.parseInt(timestampPart, 10) : null;

    return { ip, timestamp };
  };

  // If a specific IP is requested, return detailed stats for that IP
  if (requestedIp) {
    const pattern = `fuji:test:ip:${requestedIp}:*`;
    const keys: string[] = [];
    let cursor = "0";

    // Scan for all keys matching this IP pattern
    do {
      const [nextCursor, foundKeys] = await redis.scan(
        cursor,
        "MATCH",
        pattern,
        "COUNT",
        100,
      );
      cursor = nextCursor as string;
      keys.push(...(foundKeys as string[]));
    } while (cursor !== "0");

    // Get all results and filter by timestamp
    const resultsData: Array<{
      timestamp: number;
      count: number;
    }> = [];

    for (const key of keys) {
      const parsed = parseKey(key);
      if (!parsed || !parsed.timestamp) continue;

      // Only include results from the last 10 minutes
      if (parsed.timestamp < tenMinutesAgo) continue;

      const countStr = await redis.get(key);
      if (!countStr) continue;

      try {
        const count = Number.parseInt(countStr, 10);
        if (Number.isNaN(count)) continue;

        resultsData.push({
          timestamp: parsed.timestamp,
          count,
        });
      } catch (error) {
        console.error("Error parsing count:", error);
      }
    }

    const totalResults = resultsData.reduce((sum, item) => sum + item.count, 0);

    return {
      percentage,
      totalDatasets,
      datasetsWithFujiScore,
      jobsDoneLast10Minutes,
      ip: requestedIp,
      timeWindow: "10 minutes",
      totalRequests: resultsData.length,
      totalResults,
      requests: resultsData,
    };
  }

  // Get stats for all IPs
  const pattern = "fuji:test:ip:*";
  const keys: string[] = [];
  let cursor = "0";

  do {
    const [nextCursor, foundKeys] = await redis.scan(
      cursor,
      "MATCH",
      pattern,
      "COUNT",
      100,
    );
    cursor = nextCursor as string;
    keys.push(...(foundKeys as string[]));
  } while (cursor !== "0");

  // Group by IP and count
  const ipStats = new Map<
    string,
    { totalRequests: number; totalResults: number }
  >();

  for (const key of keys) {
    const parsed = parseKey(key);
    if (!parsed || !parsed.timestamp || !parsed.ip) continue;

    // Only include results from the last 10 minutes
    if (parsed.timestamp < tenMinutesAgo) continue;

    const countStr = await redis.get(key);
    if (!countStr) continue;

    try {
      const count = Number.parseInt(countStr, 10);
      if (Number.isNaN(count)) continue;

      const current = ipStats.get(parsed.ip) || {
        totalRequests: 0,
        totalResults: 0,
      };
      ipStats.set(parsed.ip, {
        totalRequests: current.totalRequests + 1,
        totalResults: current.totalResults + count,
      });
    } catch (error) {
      console.error("Error parsing count:", error);
    }
  }

  const statsResult = Array.from(ipStats.entries()).map(([ip, data]) => ({
    ip,
    ...data,
  }));

  return {
    percentage,
    totalDatasets,
    datasetsWithFujiScore,
    jobsDoneLast10Minutes,
    ipStats: {
      timeWindow: "10 minutes",
      totalIPs: statsResult.length,
      stats: statsResult,
    },
  };
});

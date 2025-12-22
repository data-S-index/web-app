const MAX_ID = 49009522;

// Returns the percentage of datasets that have a fuji score and machine stats
export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const requestedMachineName = query.machineName as string | undefined;

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

  // Get machine stats
  const redis = getRedisClient();

  // Helper function to parse key and extract machine name
  const parseKey = (key: string) => {
    const parts = key.split(":");
    if (parts.length < 5) return null;
    const machineName = parts[3];

    return { machineName };
  };

  // If a specific machine name is requested, return detailed stats for that machine
  if (requestedMachineName) {
    const pattern = `fuji:jobs:machine:${requestedMachineName}:*`;
    const keys: string[] = [];
    let cursor = "0";

    // Scan for all keys matching this machine pattern
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

    // Get all results (keys with TTL are automatically within last 10 minutes)
    const resultsData: Array<{
      count: number;
    }> = [];

    for (const key of keys) {
      const parsed = parseKey(key);
      if (!parsed) continue;

      const countStr = await redis.get(key);
      if (!countStr) continue;

      try {
        const count = Number.parseInt(countStr, 10);
        if (Number.isNaN(count)) continue;

        resultsData.push({
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
      machineName: requestedMachineName,
      timeWindow: "10 minutes",
      totalRequests: resultsData.length,
      totalResults,
      requests: resultsData,
    };
  }

  // Get stats for all machines
  const pattern = "fuji:jobs:machine:*";
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

  // Group by machine name and count
  const machineStats = new Map<
    string,
    { totalRequests: number; totalResults: number }
  >();

  for (const key of keys) {
    const parsed = parseKey(key);
    if (!parsed || !parsed.machineName) continue;

    // Keys with TTL are automatically within last 10 minutes
    const countStr = await redis.get(key);
    if (!countStr) continue;

    try {
      const count = Number.parseInt(countStr, 10);
      if (Number.isNaN(count)) continue;

      const current = machineStats.get(parsed.machineName) || {
        totalRequests: 0,
        totalResults: 0,
      };
      machineStats.set(parsed.machineName, {
        totalRequests: current.totalRequests + 1,
        totalResults: current.totalResults + count,
      });
    } catch (error) {
      console.error("Error parsing count:", error);
    }
  }

  const statsResult = Array.from(machineStats.entries()).map(
    ([machineName, data]) => ({
      machineName,
      ...data,
    }),
  );

  // sort statsResult by totalResults descending
  const sortedStatsResult = statsResult.sort(
    (a, b) => b.totalResults - a.totalResults,
  );

  return {
    percentage,
    totalDatasets,
    datasetsWithFujiScore,
    jobsDoneLast10Minutes,
    machineStats: {
      timeWindow: "10 minutes",
      totalMachines: statsResult.length,
      stats: sortedStatsResult,
    },
  };
});

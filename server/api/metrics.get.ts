const CACHE_TTL_MS = 5 * 60 * 1000;

type NamedCount = { name: string; value: number };

type PlatformMetrics = {
  userCount: number;
  counts: Record<string, number>;
  datasetsByYear: { year: string; value: number }[];
  institutions: NamedCount[];
  fields: NamedCount[];
  publishers: NamedCount[];
  licenses: NamedCount[];
  updated: string | null;
};

let cached: PlatformMetrics | null = null;
let cachedAt = 0;

export default defineEventHandler(async () => {
  const now = Date.now();

  if (cached === null || now - cachedAt > CACHE_TTL_MS) {
    const [userCount, rows] = await Promise.all([
      prisma.user.count(),
      prisma.platformMetric.findMany(),
    ]);

    const byKey = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    const updated = rows.reduce<Date | null>(
      (latest, r) =>
        latest === null || r.updated > latest ? r.updated : latest,
      null,
    );

    cached = {
      userCount,
      counts: (byKey.counts as PlatformMetrics["counts"]) ?? {},
      datasetsByYear:
        (byKey.datasetsByYear as PlatformMetrics["datasetsByYear"]) ?? [],
      institutions: (byKey.institutions as NamedCount[]) ?? [],
      fields: (byKey.fields as NamedCount[]) ?? [],
      publishers: (byKey.publishers as NamedCount[]) ?? [],
      licenses: (byKey.licenses as NamedCount[]) ?? [],
      updated: updated?.toISOString() ?? null,
    };
    cachedAt = now;
  }

  return cached;
});

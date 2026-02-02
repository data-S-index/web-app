import prisma from "../../utils/prisma";
import { getRedisClient } from "../../utils/redis";

// Cache configuration: 1 week expiration
const CACHE_EXPIRATION_SECONDS = 7 * 24 * 60 * 60; // 7 days in seconds
const CACHE_KEY = "metrics:cache";

export default defineEventHandler(async (event) => {
  // Check cache first
  const redis = getRedisClient();
  const cachedData = await redis.get(CACHE_KEY);

  if (cachedData) {
    const data = JSON.parse(cachedData);
    setHeader(event, "X-Cache", "HIT");

    return { ...data, _cached: true };
  }

  // Fixed date for metrics calculation: 2025-09-30
  const fixedNow = "2025-09-30";

  const rows = await prisma.$queryRaw<{ response: Record<string, unknown> }[]>`
WITH
params AS (SELECT ${fixedNow}::date AS now_date),

twelve_months AS (
  SELECT date_trunc('month', (now_date - interval '12 months'))::date AS start_month
  FROM params
),

months AS (
  SELECT date_trunc('month', (now_date - (i || ' months')::interval))::date AS month_start
  FROM params, generate_series(11, 0, -1) AS i
),

monthly_counts AS (
  SELECT date_trunc('month', d."publishedAt")::date AS month_start,
         count(*)::int AS cnt
  FROM "Dataset" d, params
  WHERE d."publishedAt" >= (SELECT start_month FROM twelve_months)
  GROUP BY 1
),

monthly AS (
  SELECT
    jsonb_agg(to_char(m.month_start, 'Mon YYYY') ORDER BY m.month_start) AS months,
    jsonb_agg(COALESCE(c.cnt, 0) ORDER BY m.month_start) AS datasets
  FROM months m
  LEFT JOIN monthly_counts c USING (month_start)
),

institutions AS (
  WITH org_counts AS (
    SELECT ao.name, count(*)::int AS cnt
    FROM "AutomatedOrganizationDataset" aod
    JOIN "AutomatedOrganization" ao ON ao.id = aod."automatedOrganizationId"
    GROUP BY ao.id, ao.name
  ),
  ranked AS (
    SELECT name, cnt,
           row_number() OVER (ORDER BY cnt DESC) AS rn
    FROM org_counts
  )
  SELECT jsonb_agg(
    jsonb_build_object('name', name, 'value', value)
    ORDER BY sort_key, value DESC
  ) AS items
  FROM (
    SELECT
      CASE WHEN rn <= 9 THEN name ELSE 'Other Institutions' END AS name,
      sum(cnt)::int AS value,
      CASE WHEN rn <= 9 THEN 1 ELSE 2 END AS sort_key
    FROM ranked
    GROUP BY 1, 3
  ) x
),

fields AS (
  WITH field_counts AS (
    SELECT COALESCE(NULLIF(btrim(dt."fieldName"), ''), 'Unknown') AS field_name,
           count(*)::int AS cnt
    FROM "DatasetTopic" dt
    GROUP BY 1
  ),
  ranked AS (
    SELECT field_name, cnt,
           row_number() OVER (ORDER BY cnt DESC) AS rn
    FROM field_counts
  )
  SELECT jsonb_agg(
    jsonb_build_object('name', name, 'value', value)
    ORDER BY sort_key, value DESC
  ) AS items
  FROM (
    SELECT
      CASE WHEN rn <= 9 THEN field_name ELSE 'Other Fields' END AS name,
      sum(cnt)::int AS value,
      CASE WHEN rn <= 9 THEN 1 ELSE 2 END AS sort_key
    FROM ranked
    GROUP BY 1, 3
  ) x
),

-- Fair score and citation counts from FujiScore + Citation (simple aggregates)
fair_and_citations AS (
  SELECT
    count(DISTINCT d.id)::int AS total_datasets,
    count(DISTINCT d.id) FILTER (WHERE fs."score" > 70)::int AS high_fair_datasets,
    count(DISTINCT d.id) FILTER (WHERE c.cnt > 0)::int AS cited_datasets,
    round(COALESCE(avg(fs."score") FILTER (WHERE fs."score" IS NOT NULL) / 100.0, 0)::numeric, 2) AS average_fair_score_0_1,
    round(COALESCE(avg(c.cnt) FILTER (WHERE c.cnt > 0), 0)::numeric, 1) AS average_citation_count
  FROM "Dataset" d
  LEFT JOIN "FujiScore" fs ON fs."datasetId" = d."id"
  LEFT JOIN (SELECT "datasetId", count(*)::int AS cnt FROM "Citation" GROUP BY 1) c ON c."datasetId" = d."id"
),

-- Pre-computed s-index from SIndex table (per author)
sindex_agg AS (
  SELECT
    round(COALESCE(avg("score"), 0)::numeric, 1) AS average_s_index,
    count(*)::int AS authors_with_s_index
  FROM "SIndex"
),

-- Pre-computed d-index from DIndex table (per dataset)
dindex_agg AS (
  SELECT
    round(COALESCE(avg("score"), 0)::numeric, 1) AS average_d_index,
    count(*)::int AS datasets_with_d_index
  FROM "DIndex"
),

sindex AS (
  SELECT jsonb_build_object(
    'averageFairScore', (SELECT average_fair_score_0_1 FROM fair_and_citations),
    'averageCitationCount', (SELECT average_citation_count FROM fair_and_citations),
    'averageSIndex', (SELECT average_s_index FROM sindex_agg),
    'totalDatasets', (SELECT total_datasets FROM fair_and_citations),
    'highFairDatasets', (SELECT high_fair_datasets FROM fair_and_citations),
    'citedDatasets', (SELECT cited_datasets FROM fair_and_citations),
    'authorsWithSIndex', (SELECT authors_with_s_index FROM sindex_agg)
  ) AS obj
),

dindex AS (
  SELECT jsonb_build_object(
    'averageDIndex', (SELECT average_d_index FROM dindex_agg),
    'datasetsWithDIndex', (SELECT datasets_with_d_index FROM dindex_agg)
  ) AS obj
)

SELECT jsonb_build_object(
  'monthlyPublications', jsonb_build_object(
    'months', (SELECT months FROM monthly),
    'datasets', (SELECT datasets FROM monthly)
  ),
  'institutions', COALESCE((SELECT items FROM institutions), '[]'::jsonb),
  'fields', COALESCE((SELECT items FROM fields), '[]'::jsonb),
  'sIndexMetrics', (SELECT obj FROM sindex),
  'dIndexMetrics', (SELECT obj FROM dindex)
) AS response;
`;

  const responseData = rows?.[0]?.response ?? {
    monthlyPublications: { months: [], datasets: [] },
    institutions: [],
    fields: [],
    sIndexMetrics: {
      averageFairScore: 0,
      averageCitationCount: 0,
      averageSIndex: 0,
      totalDatasets: 0,
      highFairDatasets: 0,
      citedDatasets: 0,
      authorsWithSIndex: 0,
    },
    dIndexMetrics: {
      averageDIndex: 0,
      datasetsWithDIndex: 0,
    },
  };

  await redis.setex(
    CACHE_KEY,
    CACHE_EXPIRATION_SECONDS,
    JSON.stringify(responseData),
  );
  setHeader(event, "X-Cache", "MISS");

  return { ...responseData, _cached: false };
});

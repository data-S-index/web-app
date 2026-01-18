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
  WITH aff AS (
    SELECT btrim(affiliation) AS affiliation
    FROM "DatasetAuthor" da
    CROSS JOIN LATERAL unnest(da."affiliations") AS affiliation
  ),
  counts AS (
    SELECT affiliation, count(*)::int AS cnt
    FROM aff
    WHERE affiliation IS NOT NULL AND affiliation <> ''
    GROUP BY 1
  ),
  ranked AS (
    SELECT affiliation, cnt,
           row_number() OVER (ORDER BY cnt DESC) AS rn
    FROM counts
  )
  SELECT jsonb_agg(
    jsonb_build_object('name', name, 'value', value)
    ORDER BY sort_key, value DESC
  ) AS items
  FROM (
    SELECT
      CASE WHEN rn <= 9 THEN affiliation ELSE 'Other Institutions' END AS name,
      sum(cnt)::int AS value,
      CASE WHEN rn <= 9 THEN 1 ELSE 2 END AS sort_key
    FROM ranked
    GROUP BY 1, 3
  ) x
),

fields AS (
  WITH subj AS (
    SELECT btrim(subject) AS subject
    FROM "Dataset" d
    CROSS JOIN LATERAL unnest(d."subjects") AS subject
  ),
  counts AS (
    SELECT subject, count(*)::int AS cnt
    FROM subj
    WHERE subject IS NOT NULL AND subject <> ''
    GROUP BY 1
  ),
  ranked AS (
    SELECT subject, cnt,
           row_number() OVER (ORDER BY cnt DESC) AS rn
    FROM counts
  )
  SELECT jsonb_agg(
    jsonb_build_object('name', name, 'value', value)
    ORDER BY sort_key, value DESC
  ) AS items
  FROM (
    SELECT
      CASE WHEN rn <= 9 THEN subject ELSE 'Other Fields' END AS name,
      sum(cnt)::int AS value,
      CASE WHEN rn <= 9 THEN 1 ELSE 2 END AS sort_key
    FROM ranked
    GROUP BY 1, 3
  ) x
),

sindex AS (
  WITH per_dataset AS (
    SELECT
      d."id",
      fs."score" AS fuji_score_0_100,
      COALESCE(c.citation_count, 0)::int AS citation_count
    FROM "Dataset" d
    LEFT JOIN "FujiScore" fs ON fs."datasetId" = d."id"
    LEFT JOIN (
      SELECT "datasetId", count(*)::int AS citation_count
      FROM "Citation"
      GROUP BY 1
    ) c ON c."datasetId" = d."id"
  ),
  s AS (
    SELECT
      "id",
      fuji_score_0_100,
      citation_count,
      (COALESCE(fuji_score_0_100, 0) / 100.0) AS fair_score_0_1,
      (
        (COALESCE(fuji_score_0_100, 0) / 100.0) * 5.0
        + (LEAST(citation_count, 20) * 0.25)
      ) AS s_index
    FROM per_dataset
  )
  SELECT jsonb_build_object(
    'averageFairScore',
      round(COALESCE(avg(fair_score_0_1) FILTER (WHERE fuji_score_0_100 IS NOT NULL), 0)::numeric, 2),
    'averageCitationCount',
      round(COALESCE(avg(citation_count) FILTER (WHERE citation_count > 0), 0)::numeric, 1),
    'averageSIndex',
      round(COALESCE(avg(s_index), 0)::numeric, 1),
    'totalDatasets',
      count(*)::int,
    'highFairDatasets',
      count(*) FILTER (WHERE fuji_score_0_100 > 70)::int,
    'citedDatasets',
      count(*) FILTER (WHERE citation_count > 0)::int
  ) AS obj
  FROM s
)

SELECT jsonb_build_object(
  'monthlyPublications', jsonb_build_object(
    'months', (SELECT months FROM monthly),
    'datasets', (SELECT datasets FROM monthly)
  ),
  'institutions', COALESCE((SELECT items FROM institutions), '[]'::jsonb),
  'fields', COALESCE((SELECT items FROM fields), '[]'::jsonb),
  'sIndexMetrics', (SELECT obj FROM sindex)
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

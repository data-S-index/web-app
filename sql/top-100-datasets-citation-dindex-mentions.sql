WITH latest_dindex AS (
  SELECT DISTINCT ON ("datasetId")
         "datasetId", score AS dindex_score, year AS dindex_year
  FROM "DIndex"
  ORDER BY "datasetId", year DESC, created DESC
),
citation_stats AS (
  SELECT "datasetId",
         COUNT(*)                         AS citation_count,
         SUM("citationWeight")            AS citation_weighted,
         COUNT(*) FILTER (WHERE datacite) AS citations_datacite,
         COUNT(*) FILTER (WHERE mdc)      AS citations_mdc,
         COUNT(*) FILTER (WHERE "openAlex") AS citations_openalex,
         MIN("citedDate")                 AS first_cited,
         MAX("citedDate")                 AS last_cited
  FROM "Citation"
  GROUP BY "datasetId"
),
mention_stats AS (
  SELECT "datasetId",
         COUNT(*)              AS mention_count,
         SUM("mentionWeight")  AS mention_weighted,
         MIN("mentionedDate")  AS first_mentioned,
         MAX("mentionedDate")  AS last_mentioned
  FROM "Mention"
  GROUP BY "datasetId"
),
top_ids AS (
  (SELECT 'dindex' AS track, "datasetId",
          ROW_NUMBER() OVER (ORDER BY dindex_score DESC, "datasetId") AS rank
   FROM latest_dindex ORDER BY dindex_score DESC, "datasetId" LIMIT 100)
  UNION ALL
  (SELECT 'citations', "datasetId",
          ROW_NUMBER() OVER (ORDER BY citation_count DESC, "datasetId")
   FROM citation_stats ORDER BY citation_count DESC, "datasetId" LIMIT 100)
  UNION ALL
  (SELECT 'mentions', "datasetId",
          ROW_NUMBER() OVER (ORDER BY mention_count DESC, "datasetId")
   FROM mention_stats ORDER BY mention_count DESC, "datasetId" LIMIT 100)
)
SELECT
  t.track,
  t.rank,
  d.id,
  d.source,
  d.identifier,
  d."identifierType",
  d.url,
  d.title,
  d.description,
  d.version,
  d.publisher,
  d."publisherId",
  d."publishedAt",
  d."pubYear",
  d.subjects,
  d.created,
  d.updated,

  -- metrics
  ld.dindex_score,
  ld.dindex_year,
  COALESCE(cs.citation_count, 0)    AS citation_count,
  COALESCE(cs.citation_weighted, 0) AS citation_weighted,
  cs.citations_datacite,
  cs.citations_mdc,
  cs.citations_openalex,
  cs.first_cited,
  cs.last_cited,
  COALESCE(ms.mention_count, 0)     AS mention_count,
  COALESCE(ms.mention_weighted, 0)  AS mention_weighted,
  ms.first_mentioned,
  ms.last_mentioned,

  -- FAIR / normalization
  fs.score            AS fuji_score,
  fs."evaluationDate" AS fuji_evaluated,
  nf.ft, nf.ctw, nf.mtw,
  nf."topicIdUsed", nf."yearUsed", nf."usedYearClamp",

  -- topic
  dt."topicId", dt."topicName",
  dt."subfieldId", dt."subfieldName",
  dt."fieldId", dt."fieldName",
  dt."domainId", dt."domainName",
  dt.score  AS topic_score,
  dt.source AS topic_source,

  -- related rows as JSON
  (SELECT COUNT(*) FROM "DatasetAuthor" a WHERE a."datasetId" = d.id) AS author_count,
  (SELECT json_agg(json_build_object(
            'name', a.name, 'nameType', a."nameType",
            'nameIdentifiers', a."nameIdentifiers",
            'affiliations', a.affiliations) ORDER BY a.id)
     FROM "DatasetAuthor" a WHERE a."datasetId" = d.id) AS authors,
  (SELECT json_agg(json_build_object(
            'identifier', i.identifier, 'identifierType', i."identifierType"))
     FROM "DatasetIdentifier" i WHERE i."datasetId" = d.id) AS identifiers,
  (SELECT json_agg(json_build_object(
            'name', r.name, 'identifier', r.identifier, 'uri', r.uri))
     FROM "DatasetRights" r WHERE r."datasetId" = d.id) AS rights
FROM top_ids t
JOIN "Dataset" d                    ON d.id = t."datasetId"
LEFT JOIN latest_dindex ld          ON ld."datasetId" = d.id
LEFT JOIN citation_stats cs         ON cs."datasetId" = d.id
LEFT JOIN mention_stats ms          ON ms."datasetId" = d.id
LEFT JOIN "FujiScore" fs            ON fs."datasetId" = d.id
LEFT JOIN "NormalizationFactor" nf  ON nf."datasetId" = d.id
LEFT JOIN "DatasetTopic" dt         ON dt."datasetId" = d.id
ORDER BY t.track, t.rank;

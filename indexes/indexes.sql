CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;  -- optional but recommended

-- If search_vector already exists, drop it first:
-- ALTER TABLE "Dataset" DROP COLUMN IF EXISTS search_vector;

ALTER TABLE "Dataset"
ADD COLUMN search_vector tsvector
GENERATED ALWAYS AS (
  setweight(to_tsvector('english', coalesce(title, '')), 'A')
) STORED;

CREATE INDEX "Dataset_search_vector_idx"
ON "Dataset"
USING GIN (search_vector);

CREATE INDEX "Dataset_title_trgm_idx"
ON "Dataset"
USING GIN (title gin_trgm_ops);

ALTER TABLE "DatasetAuthor"
ADD COLUMN search_vector tsvector
GENERATED ALWAYS AS (
  setweight(to_tsvector('english', coalesce(name, '')), 'A')
) STORED;

CREATE INDEX "DatasetAuthor_search_vector_idx"
ON "DatasetAuthor"
USING GIN (search_vector);

CREATE INDEX "DatasetAuthor_name_trgm_idx"
ON "DatasetAuthor"
USING GIN (name gin_trgm_ops);

SELECT
  d.*,
  ts_rank(d.search_vector, plainto_tsquery('english', $1)) AS rank
FROM "Dataset" d
WHERE d.search_vector @@ plainto_tsquery('english', $1)
ORDER BY rank DESC
LIMIT 20;

-- SELECT
--   d.*,
--   similarity(d.title, $1) AS sim
-- FROM "Dataset" d
-- WHERE d.title % $1          -- uses pg_trgm similarity operator
-- ORDER BY sim DESC
-- LIMIT 20;

-- SELECT
--   d.*,
--   ts_rank(da.search_vector, plainto_tsquery('english', $1)) AS author_rank
-- FROM "Dataset" d
-- JOIN "DatasetAuthor" da ON da."datasetId" = d.id
-- WHERE da.search_vector @@ plainto_tsquery('english', $1)
-- ORDER BY author_rank DESC
-- LIMIT 20;

-- Search in titles/descriptions
-- SELECT d.*, ts_rank(d.search_vector, plainto_tsquery('english', $1)) AS rank, 'title' AS match_type
-- FROM "Dataset" d
-- WHERE d.search_vector @@ plainto_tsquery('english', $1)

-- UNION ALL

-- Search in author names
-- SELECT d.*, ts_rank(da.search_vector, plainto_tsquery('english', $1)) AS rank, 'author' AS match_type
-- FROM "Dataset" d
-- JOIN "DatasetAuthor" da ON da."datasetId" = d.id
-- WHERE da.search_vector @@ plainto_tsquery('english', $1)

-- ORDER BY rank DESC
-- LIMIT 20;
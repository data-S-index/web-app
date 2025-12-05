# Database Indexes for Full-Text and Fuzzy Search

This document describes how to set up PostgreSQL indexes to enable fast, typo-tolerant full-text search on the `Dataset` and `DatasetAuthor` tables. These indexes will significantly improve search performance when querying datasets by title, description, or author names.

## Overview

We'll be using two types of search capabilities:

- **Full-text search**: For ranked, language-aware search over titles and descriptions using PostgreSQL's built-in text search
- **Fuzzy/trigram search**: For typo-tolerant and substring matching using the `pg_trgm` extension

## 1. Enable Required PostgreSQL Extensions

Before creating indexes, you need to enable the following PostgreSQL extensions:

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;  -- optional but recommended
```

**Explanation:**

- `pg_trgm` (trigram extension): Provides the `%` similarity operator and `similarity()` function for fast substring and typo-tolerant search. It breaks text into 3-character sequences (trigrams) to enable fuzzy matching.
- `unaccent` (optional but recommended): Removes accents from text, enabling accent-insensitive search. For example, "José" will match "Jose". This is particularly useful for international author names.

## 2. Add Full-Text Search Vector on Dataset

PostgreSQL's full-text search uses `tsvector` (text search vector) columns to store preprocessed, searchable text. We'll create a generated column that automatically maintains a weighted search vector.

```sql
ALTER TABLE "Dataset"
ADD COLUMN search_vector tsvector
GENERATED ALWAYS AS (
  setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(description, '')), 'B')
) STORED;
```

Note: The description may be too long to index, so you may want to consider indexing only the title.

**Explanation:**

- `tsvector`: A data type that stores a sorted list of lexemes (normalized words) with their positions
- `to_tsvector('english', ...)`: Converts text to a tsvector using English language rules (stemming, stop word removal, etc.)
- `setweight(..., 'A')` / `setweight(..., 'B')`: Assigns weights to different parts of the text. Weight 'A' is highest, 'B' is lower. This allows title matches to rank higher than description matches.
- `coalesce(title, '')`: Handles NULL values by converting them to empty strings
- `GENERATED ALWAYS AS ... STORED`: This column is automatically computed and stored whenever the row is inserted or updated. You never need to manually update it.

**Create a GIN index on the search vector:**

```sql
CREATE INDEX CONCURRENTLY "Dataset_search_vector_idx"
ON "Dataset"
USING GIN (search_vector);
```

**Explanation:**

- `GIN` (Generalized Inverted Index): A specialized index type optimized for array-like data structures like `tsvector`. It enables very fast full-text search queries.
- `CONCURRENTLY`: Creates the index without locking the table, allowing normal operations to continue. This is important for production databases. Note: This takes longer but doesn't block writes.

This index enables fast, ranked full-text search over both title and description fields.

## 3. Add Fuzzy (Trigram) Index on Title

While full-text search is great for language-aware, ranked search, trigram indexes enable typo-tolerant and substring matching. This is useful when users make spelling mistakes or search for partial words.

```sql
CREATE INDEX CONCURRENTLY "Dataset_title_trgm_idx"
ON "Dataset"
USING GIN (title gin_trgm_ops);
```

**Explanation:**

- `gin_trgm_ops`: A GIN operator class specifically designed for trigram matching. It indexes all 3-character sequences in the text.
- This index enables fast substring searches and typo-tolerant matching.

**This index speeds up queries like:**

- `WHERE title ILIKE '%foo%'`: Substring search (though `ILIKE` with leading wildcards can still be slow; consider using the `%` operator instead)
- `WHERE title % 'quntum'`: Similarity search that will match "quantum" even with the typo "quntum"
- `WHERE similarity(title, 'search term') > 0.3`: Explicit similarity threshold matching

**When to use trigram vs full-text search:**

- Use **trigram** for: typo tolerance, exact substring matching, searching for partial words
- Use **full-text search** for: language-aware search, ranking by relevance, handling stop words and stemming

## 4. (Optional) Add Search Indexes for DatasetAuthor

If you want to enable search by author names, apply the same indexing strategy to the `DatasetAuthor` table. This allows users to find datasets by searching for author names.

```sql
ALTER TABLE "DatasetAuthor"
ADD COLUMN search_vector tsvector
GENERATED ALWAYS AS (
  setweight(to_tsvector('english', coalesce(name, '')), 'A')
) STORED;

CREATE INDEX CONCURRENTLY "DatasetAuthor_search_vector_idx"
ON "DatasetAuthor"
USING GIN (search_vector);

CREATE INDEX CONCURRENTLY "DatasetAuthor_name_trgm_idx"
ON "DatasetAuthor"
USING GIN (name gin_trgm_ops);
```

**Explanation:**

- Same approach as the Dataset table: a full-text search vector for ranked search and a trigram index for fuzzy matching
- Author names benefit particularly from trigram indexes since they often contain proper nouns, international characters, and various name formats
- The `unaccent` extension (from step 1) is especially useful here for matching names with and without accents

## 5. Query Examples

Here are practical examples of how to use these indexes in your queries.

### a) Ranked Full-Text Search on Datasets

This query performs language-aware, ranked search over dataset titles and descriptions:

```sql
SELECT
  d.*,
  ts_rank(d.search_vector, plainto_tsquery('english', $1)) AS rank
FROM "Dataset" d
WHERE d.search_vector @@ plainto_tsquery('english', $1)
ORDER BY rank DESC
LIMIT 20;
```

**Usage:**

- Call with `$1` = `'cryo em'`, `'electron microscopy'`, `'protein structure'`, etc.
- The `@@` operator checks if the search vector matches the query
- `ts_rank()` calculates a relevance score (higher = more relevant)
- Results are ordered by relevance, with title matches ranking higher than description matches

**Advanced query parsing:**

- `plainto_tsquery()`: Simple, user-friendly parsing. Converts plain text to a query (handles multiple words as AND)
- `to_tsquery()`: More advanced parsing. Supports operators like `&` (AND), `|` (OR), `!` (NOT), and phrase matching with `<->`
  - Example: `to_tsquery('english', 'cryo & (em | microscopy)')`

### b) Fuzzy Search on Titles (Typo-Tolerant)

This query enables typo-tolerant and substring matching:

```sql
SELECT
  d.*,
  similarity(d.title, $1) AS sim
FROM "Dataset" d
WHERE d.title % $1          -- uses pg_trgm similarity operator
ORDER BY sim DESC
LIMIT 20;
```

**Explanation:**

- The `%` operator checks if the similarity between the title and search term exceeds the threshold
- `similarity()` returns a value between 0 and 1 (1 = exact match)
- Results are ordered by similarity score

**Adjusting the similarity threshold:**

```sql
SELECT set_limit(0.2);  -- default is 0.3, lower = more permissive
```

- Default threshold is 0.3 (30% similarity required)
- Lower values (e.g., 0.2) allow more typos but may return less relevant results
- Higher values (e.g., 0.4) are more strict and return only very similar matches

### c) Search by Author Name and Rank

This query searches for datasets by author name:

```sql
SELECT
  d.*,
  ts_rank(da.search_vector, plainto_tsquery('english', $1)) AS author_rank
FROM "Dataset" d
JOIN "DatasetAuthor" da ON da."datasetId" = d.id
WHERE da.search_vector @@ plainto_tsquery('english', $1)
ORDER BY author_rank DESC
LIMIT 20;
```

**Combining searches:**
You can union/merge this with dataset-title search if you want a single endpoint that searches both titles and authors. For example:

```sql
-- Search in titles/descriptions
SELECT d.*, ts_rank(d.search_vector, plainto_tsquery('english', $1)) AS rank, 'title' AS match_type
FROM "Dataset" d
WHERE d.search_vector @@ plainto_tsquery('english', $1)

UNION ALL

-- Search in author names
SELECT d.*, ts_rank(da.search_vector, plainto_tsquery('english', $1)) AS rank, 'author' AS match_type
FROM "Dataset" d
JOIN "DatasetAuthor" da ON da."datasetId" = d.id
WHERE da.search_vector @@ plainto_tsquery('english', $1)

ORDER BY rank DESC
LIMIT 20;
```

## 6. Using This from Prisma

Since these queries use PostgreSQL-specific features (tsvector, tsquery, trigram operators), you'll need to use Prisma's `$queryRaw` method instead of the standard Prisma query API.

### Example: Full-Text Search

```typescript
const q = "cryo em";

const datasets = await prisma.$queryRaw<
  { id: number; title: string; rank: number }[]
>`
  SELECT d.id, d.title,
         ts_rank(d.search_vector, plainto_tsquery('english', ${q})) AS rank
  FROM "Dataset" d
  WHERE d.search_vector @@ plainto_tsquery('english', ${q})
  ORDER BY rank DESC
  LIMIT 20;
`;
```

### Example: Fuzzy Search

```typescript
const searchTerm = "quntum"; // typo in search term

const datasets = await prisma.$queryRaw<
  { id: number; title: string; sim: number }[]
>`
  SELECT d.id, d.title,
         similarity(d.title, ${searchTerm}) AS sim
  FROM "Dataset" d
  WHERE d.title % ${searchTerm}
  ORDER BY sim DESC
  LIMIT 20;
`;
```

### Important Notes:

1. **Type Safety**: The generic type parameter `<{ id: number; title: string; rank: number }[]>` helps TypeScript understand the return type, but you should adjust it based on what columns you're selecting.

2. **SQL Injection**: Prisma's `$queryRaw` with template literals provides SQL injection protection for the interpolated values. Always use template literals (backticks) and `${variable}` syntax, never string concatenation.

3. **Parameterized Queries**: For better security and performance, consider using Prisma's parameterized query syntax:

   ```typescript
   await prisma.$queryRaw`
     SELECT d.id, d.title,
            ts_rank(d.search_vector, plainto_tsquery('english', ${q})) AS rank
     FROM "Dataset" d
     WHERE d.search_vector @@ plainto_tsquery('english', ${q})
     ORDER BY rank DESC
     LIMIT 20
   `;
   ```

4. **Error Handling**: These queries may throw errors if the search term is invalid or if indexes haven't been created. Always wrap in try-catch blocks.

5. **Performance**: These indexes significantly improve query performance, but for very large datasets, you may want to add additional filters (e.g., date ranges, categories) to further narrow results before ranking.

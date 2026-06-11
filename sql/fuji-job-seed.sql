INSERT INTO "FujiJob" ("datasetId", "created", "updated")
SELECT d."id", NOW(), NOW()
FROM "Dataset" d
LEFT JOIN "FujiScore" f ON d."id" = f."datasetId"
WHERE f."datasetId" IS NULL
ORDER BY RANDOM()
LIMIT 1000000
ON CONFLICT ("datasetId") DO NOTHING;
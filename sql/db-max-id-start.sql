SELECT setval(pg_get_serial_sequence('"Dataset"', 'id'),
              COALESCE((SELECT MAX(id) FROM "Dataset"), 0) + 1, false);
SELECT setval(pg_get_serial_sequence('"DatasetAuthor"', 'id'),
              COALESCE((SELECT MAX(id) FROM "DatasetAuthor"), 0) + 1, false);
SELECT setval(pg_get_serial_sequence('"DatasetIdentifier"', 'id'),
              COALESCE((SELECT MAX(id) FROM "DatasetIdentifier"), 0) + 1, false);

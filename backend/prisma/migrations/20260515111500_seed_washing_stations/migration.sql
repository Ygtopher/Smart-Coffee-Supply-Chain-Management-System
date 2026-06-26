INSERT INTO "warehouse_locations" ("location_id", "name", "type", "address", "district", "capacity_kg", "status", "gps_location")
SELECT '11111111-1111-4111-8111-111111111111', 'Kivu Washing Station', 'Washing Station', 'Kivu CWS, Western Province', 'Nyamasheke', 50000, 'active', '-2.3342, 29.1478'
WHERE NOT EXISTS (SELECT 1 FROM "warehouse_locations" WHERE "name" = 'Kivu Washing Station' AND "type" = 'Washing Station');

INSERT INTO "warehouse_locations" ("location_id", "name", "type", "address", "district", "capacity_kg", "status", "gps_location")
SELECT '22222222-2222-4222-8222-222222222222', 'Nyungwe Washing Station', 'Washing Station', 'Nyungwe CWS, Southern Province', 'Nyaruguru', 45000, 'active', '-2.5283, 29.5686'
WHERE NOT EXISTS (SELECT 1 FROM "warehouse_locations" WHERE "name" = 'Nyungwe Washing Station' AND "type" = 'Washing Station');

INSERT INTO "warehouse_locations" ("location_id", "name", "type", "address", "district", "capacity_kg", "status", "gps_location")
SELECT '33333333-3333-4333-8333-333333333333', 'Muhazi Washing Station', 'Washing Station', 'Muhazi CWS, Eastern Province', 'Rwamagana', 40000, 'active', '-1.9487, 30.4378'
WHERE NOT EXISTS (SELECT 1 FROM "warehouse_locations" WHERE "name" = 'Muhazi Washing Station' AND "type" = 'Washing Station');

INSERT INTO "warehouse_locations" ("location_id", "name", "type", "address", "district", "capacity_kg", "status", "gps_location")
SELECT '44444444-4444-4444-8444-444444444444', 'Gakenke Washing Station', 'Washing Station', 'Gakenke CWS, Northern Province', 'Gakenke', 42000, 'active', '-1.7029, 29.7856'
WHERE NOT EXISTS (SELECT 1 FROM "warehouse_locations" WHERE "name" = 'Gakenke Washing Station' AND "type" = 'Washing Station');

ALTER TABLE "pickup_requests" ADD COLUMN IF NOT EXISTS "farm_coordinates" VARCHAR(100);
ALTER TABLE "pickup_requests" ADD COLUMN IF NOT EXISTS "farm_location" VARCHAR(255);

UPDATE "pickup_requests" pr
SET
  "farm_coordinates" = COALESCE(pr."farm_coordinates", fp."coordinates"),
  "farm_location" = COALESCE(pr."farm_location", fp."gps_location")
FROM "farmer_profiles" fp
WHERE fp."user_id" = pr."farmer_id";

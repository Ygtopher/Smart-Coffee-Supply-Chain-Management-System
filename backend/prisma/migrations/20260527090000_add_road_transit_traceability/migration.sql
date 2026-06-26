CREATE TABLE IF NOT EXISTS "road_transport_records" (
  "road_transport_id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "shipment_id" TEXT NOT NULL UNIQUE REFERENCES "shipping_records"("shipment_id") ON DELETE CASCADE,
  "truck_plate" VARCHAR(30) NOT NULL,
  "driver_name" VARCHAR(150) NOT NULL,
  "driver_phone" VARCHAR(30) NULL,
  "transporter_company" VARCHAR(150) NULL,
  "origin_location" VARCHAR(150) NOT NULL DEFAULT 'Kigali',
  "destination_port" VARCHAR(150) NOT NULL DEFAULT 'Mombasa Port',
  "container_no" VARCHAR(100) NULL,
  "seal_no" VARCHAR(100) NULL,
  "departure_time" TIMESTAMP NULL,
  "expected_arrival" TIMESTAMP NULL,
  "actual_arrival" TIMESTAMP NULL,
  "status" VARCHAR(50) NOT NULL DEFAULT 'Planned',
  "driver_access_token" VARCHAR(128) NULL UNIQUE,
  "driver_access_expires_at" TIMESTAMP NULL,
  "created_by" TEXT NULL REFERENCES "users"("user_id"),
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "road_transit_checkpoints" (
  "checkpoint_id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "road_transport_id" TEXT NOT NULL REFERENCES "road_transport_records"("road_transport_id") ON DELETE CASCADE,
  "checkpoint_name" VARCHAR(150) NOT NULL,
  "scan_code" VARCHAR(150) NULL,
  "latitude" NUMERIC(10,7) NULL,
  "longitude" NUMERIC(10,7) NULL,
  "location_accuracy_m" NUMERIC(10,2) NULL,
  "event_type" VARCHAR(60) NOT NULL,
  "seal_condition" VARCHAR(50) NULL,
  "recorded_by" TEXT NULL REFERENCES "users"("user_id"),
  "submission_source" VARCHAR(30) NOT NULL DEFAULT 'LOGISTICS',
  "submitted_ip" VARCHAR(80) NULL,
  "recorded_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "notes" TEXT NULL
);

CREATE INDEX IF NOT EXISTS "road_transit_checkpoints_transport_time_idx"
  ON "road_transit_checkpoints" ("road_transport_id", "recorded_at" ASC);

ALTER TABLE "road_transport_records"
  ADD COLUMN IF NOT EXISTS "driver_access_token" VARCHAR(128) NULL UNIQUE,
  ADD COLUMN IF NOT EXISTS "driver_access_expires_at" TIMESTAMP NULL;

ALTER TABLE "road_transit_checkpoints"
  ADD COLUMN IF NOT EXISTS "location_accuracy_m" NUMERIC(10,2) NULL,
  ADD COLUMN IF NOT EXISTS "submission_source" VARCHAR(30) NOT NULL DEFAULT 'LOGISTICS',
  ADD COLUMN IF NOT EXISTS "submitted_ip" VARCHAR(80) NULL;

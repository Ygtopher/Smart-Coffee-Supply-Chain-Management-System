-- Requirement completion workflows for thesis-ready SCM modules.
-- External systems such as RFID readers, certification portals, and lab systems are
-- represented by persisted sync/configuration records until real vendor APIs exist.

ALTER TABLE "coffee_batches"
  ADD COLUMN IF NOT EXISTS "rfid_tag" VARCHAR(100) NULL,
  ADD COLUMN IF NOT EXISTS "certification_status" JSONB NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "coffee_batches_rfid_tag_key"
  ON "coffee_batches" ("rfid_tag")
  WHERE "rfid_tag" IS NOT NULL;

ALTER TABLE "inventory_items"
  ADD COLUMN IF NOT EXISTS "bin_code" VARCHAR(100) NULL,
  ADD COLUMN IF NOT EXISTS "expiry_date" DATE NULL,
  ADD COLUMN IF NOT EXISTS "reorder_level_kg" NUMERIC(12,2) NULL,
  ADD COLUMN IF NOT EXISTS "alert_status" VARCHAR(50) NOT NULL DEFAULT 'OK';

CREATE TABLE IF NOT EXISTS "farmer_service_requests" (
  "request_id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "farmer_id" TEXT NOT NULL REFERENCES "users"("user_id") ON DELETE CASCADE,
  "request_type" VARCHAR(80) NOT NULL,
  "description" TEXT NOT NULL,
  "quantity" VARCHAR(80) NULL,
  "preferred_date" DATE NULL,
  "status" VARCHAR(50) NOT NULL DEFAULT 'Open',
  "response" TEXT NULL,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "audit_schedules" (
  "schedule_id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "title" VARCHAR(180) NOT NULL,
  "audit_type" VARCHAR(80) NOT NULL,
  "scheduled_date" DATE NOT NULL,
  "owner_role" VARCHAR(80) NOT NULL DEFAULT 'ADMIN',
  "checklist" JSONB NOT NULL DEFAULT '[]'::jsonb,
  "risk_score" INTEGER NOT NULL DEFAULT 0,
  "status" VARCHAR(50) NOT NULL DEFAULT 'Scheduled',
  "created_by" TEXT NULL REFERENCES "users"("user_id"),
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "access_requests" (
  "request_id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "user_id" TEXT NOT NULL REFERENCES "users"("user_id") ON DELETE CASCADE,
  "requested_module" VARCHAR(120) NOT NULL,
  "reason" TEXT NOT NULL,
  "sensitivity" VARCHAR(50) NOT NULL DEFAULT 'Internal',
  "status" VARCHAR(50) NOT NULL DEFAULT 'Pending',
  "reviewed_by" TEXT NULL REFERENCES "users"("user_id"),
  "reviewed_at" TIMESTAMP NULL,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "lab_sync_records" (
  "sync_id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "batch_id" TEXT NULL REFERENCES "coffee_batches"("batch_id") ON DELETE SET NULL,
  "lab_name" VARCHAR(150) NOT NULL,
  "sample_code" VARCHAR(100) NOT NULL,
  "payload" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "status" VARCHAR(50) NOT NULL DEFAULT 'Received',
  "synced_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "certification_sync_records" (
  "sync_id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "certification_body" VARCHAR(120) NOT NULL,
  "standard" VARCHAR(120) NOT NULL,
  "batch_id" TEXT NULL REFERENCES "coffee_batches"("batch_id") ON DELETE SET NULL,
  "status" VARCHAR(50) NOT NULL DEFAULT 'Ready',
  "request_payload" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "response_payload" JSONB NULL,
  "synced_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "buyer_quality_requirements" (
  "requirement_id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "order_id" TEXT NULL REFERENCES "export_orders"("order_id") ON DELETE SET NULL,
  "buyer" VARCHAR(150) NOT NULL,
  "grade" VARCHAR(50) NOT NULL,
  "min_cupping_score" NUMERIC(4,2) NOT NULL DEFAULT 80,
  "moisture_min" NUMERIC(5,2) NOT NULL DEFAULT 10,
  "moisture_max" NUMERIC(5,2) NOT NULL DEFAULT 12,
  "max_defects" INTEGER NOT NULL DEFAULT 10,
  "notes" TEXT NULL,
  "status" VARCHAR(50) NOT NULL DEFAULT 'Active',
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

INSERT INTO "admin_integration_configs" ("name", "status", "rate_limit", "api_key_masked", "last_sync", "last_error")
VALUES
  ('RFID Reader Gateway', 'Sandbox', 'Local scan events', 'rfid_****_gateway', NOW(), 'Hardware gateway not connected in prototype'),
  ('UTZ Certification Portal', 'Sandbox', '120 requests/hour', 'utz_****_sandbox', NOW(), NULL),
  ('Rainforest Alliance Portal', 'Sandbox', '120 requests/hour', 'rain_****_sandbox', NOW(), NULL),
  ('Fairtrade Certification Portal', 'Sandbox', '120 requests/hour', 'fair_****_sandbox', NOW(), NULL),
  ('Laboratory Information System', 'Sandbox', '240 requests/hour', 'lab_****_sandbox', NOW(), NULL)
ON CONFLICT ("name") DO NOTHING;

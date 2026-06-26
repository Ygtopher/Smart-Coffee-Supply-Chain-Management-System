CREATE TABLE IF NOT EXISTS "admin_settings" (
  "key" VARCHAR(100) PRIMARY KEY,
  "value" JSONB NOT NULL,
  "updated_by" UUID NULL,
  "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "admin_integration_configs" (
  "name" VARCHAR(150) PRIMARY KEY,
  "status" VARCHAR(50) NOT NULL DEFAULT 'Configured',
  "rate_limit" VARCHAR(100) NOT NULL DEFAULT '300 requests/hour',
  "api_key_masked" VARCHAR(100) NOT NULL DEFAULT 'Not configured',
  "last_sync" TIMESTAMP NOT NULL DEFAULT NOW(),
  "last_error" TEXT NULL,
  "updated_by" UUID NULL,
  "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "admin_backup_jobs" (
  "target" VARCHAR(150) PRIMARY KEY,
  "status" VARCHAR(50) NOT NULL DEFAULT 'Scheduled',
  "frequency" VARCHAR(100) NOT NULL,
  "retention" VARCHAR(100) NOT NULL,
  "last_run" TIMESTAMP NULL,
  "last_verified" TIMESTAMP NULL,
  "updated_by" UUID NULL,
  "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

INSERT INTO "admin_settings" ("key", "value")
VALUES
  ('systemConfiguration', '{
    "pricingTiers": "Configurable by grade and market",
    "premiumThreshold": 85,
    "standardThreshold": 75,
    "moistureMin": 10,
    "moistureMax": 12,
    "transitAlertHours": 24,
    "pwaOffline": true,
    "multilingualContent": ["English", "Kinyarwanda", "French"]
  }'::jsonb),
  ('securityControls', '{
    "requireMfa": true,
    "sessionTimeoutMinutes": 30,
    "auditLogEnabled": true,
    "retentionYears": 5,
    "breachNotificationHours": 72,
    "encryptionStandard": "TLS 1.3 / AES-256"
  }'::jsonb),
  ('notificationTriggers', '{
    "transitDelay": true,
    "lowStock": true,
    "backupFailure": true,
    "apiFailure": true,
    "failedLogin": true
  }'::jsonb)
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "admin_integration_configs" ("name", "status", "rate_limit", "api_key_masked", "last_sync")
VALUES
  ('NAEB Digital Platform', 'Configured', '600 requests/hour', 'naeb_****_prod', NOW()),
  ('MTN Mobile Money', 'Configured', '300 requests/hour', 'mtn_****_status', NOW()),
  ('Airtel Money', 'Configured', '300 requests/hour', 'airtel_****_status', NOW()),
  ('Shipping Line API', 'Sandbox', '120 requests/hour', 'ship_****_sandbox', NOW())
ON CONFLICT ("name") DO NOTHING;

INSERT INTO "admin_backup_jobs" ("target", "status", "frequency", "retention", "last_run", "last_verified")
VALUES
  ('PostgreSQL snapshot', 'Scheduled', 'Daily 02:00 CAT', '30 days', NOW(), NOW()),
  ('MongoDB/document store', 'Scheduled', 'Daily 02:30 CAT', '30 days', NOW(), NOW()),
  ('Compliance documents', 'Replicated', 'Hourly', '7 years', NOW(), NOW())
ON CONFLICT ("target") DO NOTHING;

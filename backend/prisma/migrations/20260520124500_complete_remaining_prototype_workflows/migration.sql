-- Complete prototype-ready workflows that do not require external vendors.

ALTER TABLE "sustainability_metrics"
  ADD COLUMN IF NOT EXISTS "biodiversity_score" NUMERIC(5,2) NULL,
  ADD COLUMN IF NOT EXISTS "soil_health_score" NUMERIC(5,2) NULL,
  ADD COLUMN IF NOT EXISTS "gender_inclusion_score" NUMERIC(5,2) NULL,
  ADD COLUMN IF NOT EXISTS "sdg_summary" JSONB NULL,
  ADD COLUMN IF NOT EXISTS "improvement_goals" JSONB NULL;

CREATE TABLE IF NOT EXISTS "community_replies" (
  "reply_id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "post_id" TEXT NOT NULL REFERENCES "community_posts"("post_id") ON DELETE CASCADE,
  "author_id" TEXT NOT NULL REFERENCES "users"("user_id") ON DELETE CASCADE,
  "content" TEXT NOT NULL,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "status" VARCHAR(20) NOT NULL DEFAULT 'active'
);

CREATE TABLE IF NOT EXISTS "community_reactions" (
  "reaction_id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "post_id" TEXT NOT NULL REFERENCES "community_posts"("post_id") ON DELETE CASCADE,
  "user_id" TEXT NOT NULL REFERENCES "users"("user_id") ON DELETE CASCADE,
  "reaction_type" VARCHAR(30) NOT NULL DEFAULT 'like',
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT "community_reactions_post_user_type_key" UNIQUE ("post_id", "user_id", "reaction_type")
);

CREATE INDEX IF NOT EXISTS "community_replies_post_idx" ON "community_replies" ("post_id");
CREATE INDEX IF NOT EXISTS "community_reactions_post_idx" ON "community_reactions" ("post_id");

UPDATE "users"
SET "qr_login_secret" = 'QR-' || upper(substr(md5("user_id"::text || '-' || coalesce("email", '')), 1, 24))
WHERE "qr_login_secret" IS NULL;

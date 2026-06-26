ALTER TABLE "coffee_batches" ADD COLUMN IF NOT EXISTS "batch_group_id" VARCHAR(100);

CREATE INDEX IF NOT EXISTS "idx_coffee_batches_batch_group_id" ON "coffee_batches" ("batch_group_id");

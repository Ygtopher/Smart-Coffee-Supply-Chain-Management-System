ALTER TABLE "payment_transactions"
ADD COLUMN IF NOT EXISTS "delivery_id" TEXT;

CREATE INDEX IF NOT EXISTS "payment_transactions_delivery_id_idx"
ON "payment_transactions"("delivery_id");


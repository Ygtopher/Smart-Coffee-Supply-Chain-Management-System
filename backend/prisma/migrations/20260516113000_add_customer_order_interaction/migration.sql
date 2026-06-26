ALTER TABLE "export_orders"
ADD COLUMN IF NOT EXISTS "reference_code" VARCHAR(50),
ADD COLUMN IF NOT EXISTS "customer_email" VARCHAR(255),
ADD COLUMN IF NOT EXISTS "customer_phone" VARCHAR(50),
ADD COLUMN IF NOT EXISTS "company_name" VARCHAR(150),
ADD COLUMN IF NOT EXISTS "incoterm" VARCHAR(20),
ADD COLUMN IF NOT EXISTS "quality_specs" JSONB,
ADD COLUMN IF NOT EXISTS "shipment_requirements" JSONB,
ADD COLUMN IF NOT EXISTS "customer_message" TEXT,
ADD COLUMN IF NOT EXISTS "quote_notes" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "export_orders_reference_code_key" ON "export_orders"("reference_code");

CREATE TABLE IF NOT EXISTS "customer_order_messages" (
  "message_id" TEXT NOT NULL,
  "order_id" TEXT NOT NULL,
  "sender_type" VARCHAR(30) NOT NULL,
  "sender_name" VARCHAR(150) NOT NULL,
  "message" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "customer_order_messages_pkey" PRIMARY KEY ("message_id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'customer_order_messages_order_id_fkey'
  ) THEN
    ALTER TABLE "customer_order_messages"
    ADD CONSTRAINT "customer_order_messages_order_id_fkey"
    FOREIGN KEY ("order_id") REFERENCES "export_orders"("order_id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

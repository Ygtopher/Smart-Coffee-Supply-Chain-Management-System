-- CreateTable
CREATE TABLE "roles" (
    "role_id" TEXT NOT NULL,
    "role_name" VARCHAR(100) NOT NULL,
    "permissions" JSONB NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("role_id")
);

-- CreateTable
CREATE TABLE "users" (
    "user_id" TEXT NOT NULL,
    "role_id" TEXT NOT NULL,
    "full_name" VARCHAR(150),
    "phone" VARCHAR(20),
    "email" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "mfa_enabled" BOOLEAN NOT NULL DEFAULT false,
    "mfa_code" VARCHAR(10),
    "mfa_expires" TIMESTAMP(3),
    "reset_token" VARCHAR(255),
    "reset_token_expires" TIMESTAMP(3),
    "qr_login_secret" VARCHAR(255),
    "status" VARCHAR(20) NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "farmer_profiles" (
    "profile_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "farm_name" VARCHAR(150) NOT NULL,
    "farm_size_ha" DOUBLE PRECISION NOT NULL,
    "gps_location" TEXT,
    "status" VARCHAR(20) NOT NULL DEFAULT 'active',

    CONSTRAINT "farmer_profiles_pkey" PRIMARY KEY ("profile_id")
);

-- CreateTable
CREATE TABLE "cooperatives" (
    "coop_id" TEXT NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "district" VARCHAR(100) NOT NULL,
    "zone" VARCHAR(100) NOT NULL,
    "manager_id" TEXT NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cooperatives_pkey" PRIMARY KEY ("coop_id")
);

-- CreateTable
CREATE TABLE "coffee_batches" (
    "batch_id" TEXT NOT NULL,
    "qr_code" VARCHAR(100) NOT NULL,
    "farm_name" VARCHAR(150) NOT NULL,
    "washing_station" VARCHAR(150) NOT NULL,
    "district" VARCHAR(100) NOT NULL,
    "farmer_id" TEXT NOT NULL,
    "weight_cherry" DECIMAL(12,2) NOT NULL,
    "status" VARCHAR(50) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "parent_batch_id" TEXT,

    CONSTRAINT "coffee_batches_pkey" PRIMARY KEY ("batch_id")
);

-- CreateTable
CREATE TABLE "checkpoint_logs" (
    "log_id" TEXT NOT NULL,
    "batch_id" TEXT NOT NULL,
    "checkpoint_type" VARCHAR(50) NOT NULL,
    "location_name" VARCHAR(150) NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "scanned_by" TEXT NOT NULL,
    "notes" VARCHAR(255),

    CONSTRAINT "checkpoint_logs_pkey" PRIMARY KEY ("log_id")
);

-- CreateTable
CREATE TABLE "transport_logs" (
    "log_id" TEXT NOT NULL,
    "batch_id" TEXT NOT NULL,
    "transport_method" VARCHAR(100) NOT NULL,
    "departure_time" TIMESTAMP(3) NOT NULL,
    "arrival_time" TIMESTAMP(3),
    "condition" VARCHAR(100) NOT NULL,
    "scanned_by" TEXT NOT NULL,
    "notes" VARCHAR(255),

    CONSTRAINT "transport_logs_pkey" PRIMARY KEY ("log_id")
);

-- CreateTable
CREATE TABLE "warehouse_locations" (
    "location_id" TEXT NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "address" VARCHAR(255) NOT NULL,
    "district" VARCHAR(100) NOT NULL,
    "capacity_kg" DECIMAL(14,2) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'active',
    "gps_location" TEXT,

    CONSTRAINT "warehouse_locations_pkey" PRIMARY KEY ("location_id")
);

-- CreateTable
CREATE TABLE "inventory_items" (
    "item_id" TEXT NOT NULL,
    "batch_id" TEXT NOT NULL,
    "warehouse_id" TEXT NOT NULL,
    "quantity_kg" DECIMAL(12,2) NOT NULL,
    "coffee_form" VARCHAR(50) NOT NULL,
    "fifo_date" DATE NOT NULL,
    "status" VARCHAR(50) NOT NULL,
    "lot_no" TEXT,

    CONSTRAINT "inventory_items_pkey" PRIMARY KEY ("item_id")
);

-- CreateTable
CREATE TABLE "stock_movements" (
    "movement_id" TEXT NOT NULL,
    "item_id" TEXT NOT NULL,
    "movement_type" VARCHAR(50) NOT NULL,
    "quantity_kg" DECIMAL(12,2) NOT NULL,
    "from_location_id" TEXT,
    "to_location_id" TEXT,
    "movement_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reference_no" VARCHAR(100),

    CONSTRAINT "stock_movements_pkey" PRIMARY KEY ("movement_id")
);

-- CreateTable
CREATE TABLE "quality_assessments" (
    "assessment_id" TEXT NOT NULL,
    "batch_id" TEXT NOT NULL,
    "cupping_score" DECIMAL(4,2) NOT NULL,
    "moisture" DECIMAL(5,2) NOT NULL,
    "defects" JSONB,
    "assessor_id" TEXT NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quality_assessments_pkey" PRIMARY KEY ("assessment_id")
);

-- CreateTable
CREATE TABLE "shipping_records" (
    "shipment_id" TEXT NOT NULL,
    "batch_id" TEXT NOT NULL,
    "container_no" VARCHAR(100) NOT NULL,
    "vessel_name" VARCHAR(150) NOT NULL,
    "port_loading" VARCHAR(150) NOT NULL,
    "port_destination" VARCHAR(150) NOT NULL,
    "status" VARCHAR(50) NOT NULL,
    "shipped_at" TIMESTAMP(3),

    CONSTRAINT "shipping_records_pkey" PRIMARY KEY ("shipment_id")
);

-- CreateTable
CREATE TABLE "compliance_docs" (
    "doc_id" TEXT NOT NULL,
    "shipment_id" TEXT,
    "batch_id" TEXT,
    "document_type" VARCHAR(100),
    "naeb_license" VARCHAR(100),
    "eudr_verified_location" VARCHAR(150),
    "certification_type" VARCHAR(100) NOT NULL,
    "status" VARCHAR(50) NOT NULL,
    "expiry_date" TIMESTAMP(3),
    "file_url" TEXT,
    "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "compliance_docs_pkey" PRIMARY KEY ("doc_id")
);

-- CreateTable
CREATE TABLE "sustainability_metrics" (
    "metric_id" TEXT NOT NULL,
    "farm_id" TEXT NOT NULL,
    "carbon_kg" DECIMAL(12,2) NOT NULL,
    "water_liters" DECIMAL(12,2) NOT NULL,
    "social_score" DECIMAL(5,2) NOT NULL,
    "reporting_period" DATE NOT NULL,

    CONSTRAINT "sustainability_metrics_pkey" PRIMARY KEY ("metric_id")
);

-- CreateTable
CREATE TABLE "community_posts" (
    "post_id" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "group_id" VARCHAR(100) NOT NULL,
    "content" TEXT NOT NULL,
    "image_url" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" VARCHAR(20) NOT NULL DEFAULT 'active',

    CONSTRAINT "community_posts_pkey" PRIMARY KEY ("post_id")
);

-- CreateTable
CREATE TABLE "payment_transactions" (
    "tx_id" TEXT NOT NULL,
    "payer_id" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "payment_method" VARCHAR(20) NOT NULL,
    "reference_code" VARCHAR(150) NOT NULL,
    "status" VARCHAR(50) NOT NULL,
    "processed_at" TIMESTAMP(3),

    CONSTRAINT "payment_transactions_pkey" PRIMARY KEY ("tx_id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "log_id" TEXT NOT NULL,
    "user_id" TEXT,
    "action" VARCHAR(100) NOT NULL,
    "entity_type" VARCHAR(100) NOT NULL,
    "entity_id" TEXT,
    "details" JSONB,
    "ip_address" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("log_id")
);

-- CreateTable
CREATE TABLE "regulation_rules" (
    "rule_id" TEXT NOT NULL,
    "regulation_type" VARCHAR(100) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT NOT NULL,
    "rule_json" JSONB NOT NULL,

    CONSTRAINT "regulation_rules_pkey" PRIMARY KEY ("rule_id")
);

-- CreateTable
CREATE TABLE "analytics_reports" (
    "report_id" TEXT NOT NULL,
    "report_type" VARCHAR(100) NOT NULL,
    "parameters" JSONB NOT NULL,
    "generated_by" TEXT NOT NULL,
    "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "data_range" VARCHAR(100) NOT NULL,
    "file_url" VARCHAR(255) NOT NULL,

    CONSTRAINT "analytics_reports_pkey" PRIMARY KEY ("report_id")
);

-- CreateTable
CREATE TABLE "delivery_records" (
    "delivery_id" TEXT NOT NULL,
    "profile_id" TEXT NOT NULL,
    "batch_id" TEXT NOT NULL,
    "delivery_date" DATE NOT NULL,
    "weight_kg" DECIMAL(12,2) NOT NULL,
    "buyer" VARCHAR(150) NOT NULL,
    "price_per_kg" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "delivery_records_pkey" PRIMARY KEY ("delivery_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "roles_role_name_key" ON "roles"("role_name");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "farmer_profiles_user_id_key" ON "farmer_profiles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "coffee_batches_qr_code_key" ON "coffee_batches"("qr_code");

-- CreateIndex
CREATE UNIQUE INDEX "payment_transactions_reference_code_key" ON "payment_transactions"("reference_code");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("role_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "farmer_profiles" ADD CONSTRAINT "farmer_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cooperatives" ADD CONSTRAINT "cooperatives_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coffee_batches" ADD CONSTRAINT "coffee_batches_farmer_id_fkey" FOREIGN KEY ("farmer_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coffee_batches" ADD CONSTRAINT "coffee_batches_parent_batch_id_fkey" FOREIGN KEY ("parent_batch_id") REFERENCES "coffee_batches"("batch_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checkpoint_logs" ADD CONSTRAINT "checkpoint_logs_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "coffee_batches"("batch_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checkpoint_logs" ADD CONSTRAINT "checkpoint_logs_scanned_by_fkey" FOREIGN KEY ("scanned_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transport_logs" ADD CONSTRAINT "transport_logs_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "coffee_batches"("batch_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transport_logs" ADD CONSTRAINT "transport_logs_scanned_by_fkey" FOREIGN KEY ("scanned_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "coffee_batches"("batch_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "warehouse_locations"("location_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "inventory_items"("item_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quality_assessments" ADD CONSTRAINT "quality_assessments_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "coffee_batches"("batch_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quality_assessments" ADD CONSTRAINT "quality_assessments_assessor_id_fkey" FOREIGN KEY ("assessor_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipping_records" ADD CONSTRAINT "shipping_records_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "coffee_batches"("batch_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_docs" ADD CONSTRAINT "compliance_docs_shipment_id_fkey" FOREIGN KEY ("shipment_id") REFERENCES "shipping_records"("shipment_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sustainability_metrics" ADD CONSTRAINT "sustainability_metrics_farm_id_fkey" FOREIGN KEY ("farm_id") REFERENCES "cooperatives"("coop_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_posts" ADD CONSTRAINT "community_posts_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_payer_id_fkey" FOREIGN KEY ("payer_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "cooperative_aggregators" (
  "assignment_id" TEXT NOT NULL,
  "coop_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "is_primary" BOOLEAN NOT NULL DEFAULT false,
  "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "cooperative_aggregators_pkey" PRIMARY KEY ("assignment_id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "cooperative_aggregators_coop_id_user_id_key"
  ON "cooperative_aggregators" ("coop_id", "user_id");

ALTER TABLE "cooperative_aggregators"
  ADD CONSTRAINT "cooperative_aggregators_coop_id_fkey"
  FOREIGN KEY ("coop_id") REFERENCES "cooperatives"("coop_id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "cooperative_aggregators"
  ADD CONSTRAINT "cooperative_aggregators_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("user_id")
  ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "cooperative_aggregators" ("assignment_id", "coop_id", "user_id", "is_primary")
SELECT md5(random()::text || clock_timestamp()::text), "coop_id", "manager_id", true
FROM "cooperatives"
ON CONFLICT ("coop_id", "user_id") DO NOTHING;

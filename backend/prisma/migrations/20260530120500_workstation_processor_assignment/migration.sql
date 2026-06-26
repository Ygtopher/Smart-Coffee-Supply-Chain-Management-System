ALTER TABLE warehouse_locations
  ADD COLUMN IF NOT EXISTS processor_id TEXT NULL REFERENCES users(user_id);

CREATE TABLE IF NOT EXISTS washing_station_requests (
  request_id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  supplier_id TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  washing_station_name VARCHAR(150) NOT NULL,
  current_washing_station VARCHAR(150) NULL,
  reason TEXT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
  reviewed_by_processor_id TEXT NULL REFERENCES users(user_id),
  assigned_aggregator_id TEXT NULL REFERENCES users(user_id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMP NULL
);

CREATE INDEX IF NOT EXISTS idx_washing_station_requests_supplier_id
  ON washing_station_requests(supplier_id);

CREATE INDEX IF NOT EXISTS idx_washing_station_requests_status
  ON washing_station_requests(status);

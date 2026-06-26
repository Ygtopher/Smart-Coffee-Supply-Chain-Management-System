ALTER TABLE farmer_profiles
  ADD COLUMN IF NOT EXISTS preferred_washing_station VARCHAR(150) NULL,
  ADD COLUMN IF NOT EXISTS processor_id TEXT NULL,
  ADD COLUMN IF NOT EXISTS assignment_status VARCHAR(30) NOT NULL DEFAULT 'PENDING_ASSIGNMENT';

UPDATE farmer_profiles
SET assignment_status = 'APPROVED'
WHERE aggregator_id IS NOT NULL
  AND assignment_status = 'PENDING_ASSIGNMENT';

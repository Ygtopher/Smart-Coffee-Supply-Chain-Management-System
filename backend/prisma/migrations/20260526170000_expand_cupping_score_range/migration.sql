-- A valid SCA cupping assessment can score exactly 100.00.
ALTER TABLE "quality_assessments"
ALTER COLUMN "cupping_score" TYPE DECIMAL(5, 2);

-- Add test pressure fields to test_packages table
-- These fields are required for pressure-based tests (Hydrostatic, Pneumatic)

-- Add test_pressure column
ALTER TABLE test_packages
ADD COLUMN test_pressure NUMERIC(10, 2);

-- Add test_pressure_unit column with default
ALTER TABLE test_packages
ADD COLUMN test_pressure_unit TEXT DEFAULT 'PSIG';

-- Add CHECK constraint for valid pressure units
ALTER TABLE test_packages
ADD CONSTRAINT chk_test_pressure_unit_valid
CHECK (
  test_pressure_unit IS NULL
  OR test_pressure_unit IN ('PSIG', 'BAR', 'KPA', 'PSI')
);

-- Add CHECK constraint for pressure values (when provided)
-- Note: We don't enforce pressure requirement on existing rows, only validate format
ALTER TABLE test_packages
ADD CONSTRAINT chk_test_pressure_positive
CHECK (
  test_pressure IS NULL OR test_pressure > 0
);

-- Add comment for documentation
COMMENT ON COLUMN test_packages.test_pressure IS 'Test pressure value for pressure-based tests (Hydrostatic, Pneumatic). Required when test_type is a pressure test.';
COMMENT ON COLUMN test_packages.test_pressure_unit IS 'Unit of measurement for test pressure. Valid values: PSIG, BAR, KPA, PSI. Defaults to PSIG.';

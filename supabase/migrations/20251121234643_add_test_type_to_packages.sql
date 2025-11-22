-- Migration 00121: Add test_type column to test_packages table
-- Purpose: Store test type for certificate pre-population
-- Feature: 030-test-package-workflow

-- Add test_type column (nullable for backward compatibility)
ALTER TABLE test_packages
ADD COLUMN IF NOT EXISTS test_type TEXT;

-- Add constraint: test_type must be one of 6 valid values or NULL
ALTER TABLE test_packages
DROP CONSTRAINT IF EXISTS chk_test_type_valid;

ALTER TABLE test_packages
ADD CONSTRAINT chk_test_type_valid
CHECK (test_type IS NULL OR test_type IN (
  'Sensitive Leak Test',
  'Pneumatic Test',
  'Alternative Leak Test',
  'In-service Test',
  'Hydrostatic Test',
  'Other'
));

-- Create index for filtering by test_type
CREATE INDEX IF NOT EXISTS idx_test_packages_test_type ON test_packages(test_type)
WHERE test_type IS NOT NULL;

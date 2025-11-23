-- Migration: Add coating and insulation requirement flags to test_packages
-- Purpose: Allow per-package configuration of coating/insulation stages
-- Feature: Test Package Workflow Logic Matrix

-- Add requirement flags with safe defaults
ALTER TABLE test_packages
ADD COLUMN IF NOT EXISTS requires_coating BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS requires_insulation BOOLEAN DEFAULT false;

-- Partial indexes for efficient filtering (only index TRUE values)
CREATE INDEX IF NOT EXISTS idx_test_packages_requires_coating
  ON test_packages(requires_coating)
  WHERE requires_coating = true;

CREATE INDEX IF NOT EXISTS idx_test_packages_requires_insulation
  ON test_packages(requires_insulation)
  WHERE requires_insulation = true;

-- Add helpful comments
COMMENT ON COLUMN test_packages.requires_coating IS
  'Whether this package requires Protective Coatings Acceptance stage';
COMMENT ON COLUMN test_packages.requires_insulation IS
  'Whether this package requires Insulation Acceptance stage';

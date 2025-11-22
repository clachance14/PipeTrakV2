-- Migration 00122: Create package_certificates table
-- Purpose: Store formal Pipe Testing Acceptance Certificate data
-- Feature: 030-test-package-workflow

-- Create package_certificates table
CREATE TABLE IF NOT EXISTS package_certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id UUID NOT NULL UNIQUE REFERENCES test_packages(id) ON DELETE CASCADE,
  certificate_number TEXT NOT NULL,
  client TEXT,
  client_spec TEXT,
  line_number TEXT,
  test_pressure NUMERIC(10, 2) NOT NULL,
  pressure_unit TEXT NOT NULL DEFAULT 'PSIG',
  test_media TEXT NOT NULL,
  temperature NUMERIC(6, 2) NOT NULL,
  temperature_unit TEXT NOT NULL DEFAULT 'F',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_package_certificates_package_id ON package_certificates(package_id);

-- Note: Certificate number uniqueness per project is enforced by the generate_certificate_number() function
-- We cannot create a unique index with a subquery. Uniqueness validation happens at application layer.

-- Constraints
ALTER TABLE package_certificates
DROP CONSTRAINT IF EXISTS chk_test_pressure_positive;
ALTER TABLE package_certificates
ADD CONSTRAINT chk_test_pressure_positive CHECK (test_pressure > 0);

ALTER TABLE package_certificates
DROP CONSTRAINT IF EXISTS chk_test_media_not_empty;
ALTER TABLE package_certificates
ADD CONSTRAINT chk_test_media_not_empty CHECK (length(trim(test_media)) > 0);

ALTER TABLE package_certificates
DROP CONSTRAINT IF EXISTS chk_temperature_above_absolute_zero;
ALTER TABLE package_certificates
ADD CONSTRAINT chk_temperature_above_absolute_zero CHECK (temperature > -273);

ALTER TABLE package_certificates
DROP CONSTRAINT IF EXISTS chk_pressure_unit_valid;
ALTER TABLE package_certificates
ADD CONSTRAINT chk_pressure_unit_valid CHECK (pressure_unit IN ('PSIG', 'BAR', 'KPA', 'PSI'));

ALTER TABLE package_certificates
DROP CONSTRAINT IF EXISTS chk_temperature_unit_valid;
ALTER TABLE package_certificates
ADD CONSTRAINT chk_temperature_unit_valid CHECK (temperature_unit IN ('F', 'C', 'K'));

-- RLS Policies
ALTER TABLE package_certificates ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view certificates in their organization" ON package_certificates;
DROP POLICY IF EXISTS "Users can insert certificates in their organization" ON package_certificates;
DROP POLICY IF EXISTS "Users can update certificates in their organization" ON package_certificates;

CREATE POLICY "Users can view certificates in their organization"
ON package_certificates FOR SELECT
USING (
  package_id IN (
    SELECT tp.id FROM test_packages tp
    JOIN projects p ON tp.project_id = p.id
    WHERE p.organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  )
);

CREATE POLICY "Users can insert certificates in their organization"
ON package_certificates FOR INSERT
WITH CHECK (
  package_id IN (
    SELECT tp.id FROM test_packages tp
    JOIN projects p ON tp.project_id = p.id
    WHERE p.organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  )
);

CREATE POLICY "Users can update certificates in their organization"
ON package_certificates FOR UPDATE
USING (
  package_id IN (
    SELECT tp.id FROM test_packages tp
    JOIN projects p ON tp.project_id = p.id
    WHERE p.organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  )
);

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_package_certificate_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_package_certificate_updated_at ON package_certificates;

CREATE TRIGGER update_package_certificate_updated_at
BEFORE UPDATE ON package_certificates
FOR EACH ROW
EXECUTE FUNCTION update_package_certificate_updated_at();

-- RPC function to generate sequential certificate numbers
CREATE OR REPLACE FUNCTION generate_certificate_number(p_project_id UUID)
RETURNS TEXT AS $$
DECLARE
  next_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(certificate_number FROM 'PKG-(\d+)') AS INTEGER)), 0) + 1
  INTO next_num
  FROM package_certificates pc
  JOIN test_packages tp ON pc.package_id = tp.id
  WHERE tp.project_id = p_project_id;

  RETURN 'PKG-' || LPAD(next_num::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql;

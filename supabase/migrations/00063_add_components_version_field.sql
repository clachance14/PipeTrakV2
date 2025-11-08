-- Migration: Add version field to components table for optimistic locking
-- Feature: 020-component-metadata-editing
-- Date: 2025-10-29
-- Purpose: Enable concurrent edit detection using version-based optimistic locking

-- Add version column to components table (default 1 for existing rows)
ALTER TABLE components
  ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;

-- Create function to auto-increment version on UPDATE
CREATE OR REPLACE FUNCTION increment_component_version()
RETURNS TRIGGER AS $$
BEGIN
  -- Auto-increment version on every UPDATE
  NEW.version = OLD.version + 1;
  -- Also update last_updated_at timestamp
  NEW.last_updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to call function before UPDATE
DROP TRIGGER IF EXISTS trigger_increment_component_version ON components;
CREATE TRIGGER trigger_increment_component_version
  BEFORE UPDATE ON components
  FOR EACH ROW
  EXECUTE FUNCTION increment_component_version();

-- Add index for efficient version-based queries (id, version composite)
CREATE INDEX IF NOT EXISTS idx_components_version ON components(id, version);

-- Add comment for documentation
COMMENT ON COLUMN components.version IS 'Version number for optimistic locking (auto-incremented on UPDATE)';

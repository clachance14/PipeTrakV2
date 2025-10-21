-- Migration: Add description columns to metadata tables
-- Feature: 011-the-drawing-component
-- Purpose: Allow optional descriptions for areas, systems, and test packages

-- Add description column to areas table
ALTER TABLE areas ADD COLUMN IF NOT EXISTS description VARCHAR(100);

-- Add description column to systems table
ALTER TABLE systems ADD COLUMN IF NOT EXISTS description VARCHAR(100);

-- Add description column to test_packages table
ALTER TABLE test_packages ADD COLUMN IF NOT EXISTS description VARCHAR(100);

-- Add comments for documentation
COMMENT ON COLUMN areas.description IS 'Optional description (max 100 chars) for additional context, e.g., "North wing - Level 2"';
COMMENT ON COLUMN systems.description IS 'Optional description (max 100 chars) for additional context, e.g., "Cooling water distribution"';
COMMENT ON COLUMN test_packages.description IS 'Optional description (max 100 chars) for additional context, e.g., "Q1 2025 mechanical completion"';

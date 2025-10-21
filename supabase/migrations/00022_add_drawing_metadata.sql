-- Migration 00022: Add Drawing Metadata Fields
-- Feature: Drawing Table Polish
-- Description: Add area_id, system_id, test_package_id foreign keys to drawings table
--
-- This migration adds optional metadata fields to the drawings table to support
-- drawing-level categorization. These fields are nullable to allow drawings without
-- assigned metadata.
--
-- Columns added: area_id, system_id, test_package_id
-- Indexes created: 3 (for foreign key lookups)
-- RLS policies: No new policies needed (existing policies cover new columns)

-- ============================================================================
-- PART 1: ADD COLUMNS
-- ============================================================================

-- Add foreign key columns to drawings table
ALTER TABLE drawings
ADD COLUMN area_id UUID REFERENCES areas(id) ON DELETE SET NULL,
ADD COLUMN system_id UUID REFERENCES systems(id) ON DELETE SET NULL,
ADD COLUMN test_package_id UUID REFERENCES test_packages(id) ON DELETE SET NULL;

COMMENT ON COLUMN drawings.area_id IS 'Optional physical area assignment for entire drawing';
COMMENT ON COLUMN drawings.system_id IS 'Optional system assignment for entire drawing';
COMMENT ON COLUMN drawings.test_package_id IS 'Optional test package assignment for entire drawing';

-- ============================================================================
-- PART 2: INDEXES
-- ============================================================================

-- Create indexes for foreign key lookups and filtering
CREATE INDEX idx_drawings_area_id ON drawings(area_id) WHERE area_id IS NOT NULL;
CREATE INDEX idx_drawings_system_id ON drawings(system_id) WHERE system_id IS NOT NULL;
CREATE INDEX idx_drawings_test_package_id ON drawings(test_package_id) WHERE test_package_id IS NOT NULL;

-- ============================================================================
-- MIGRATION COMPLETE: 00022_add_drawing_metadata.sql
-- ============================================================================
-- Columns added: 3 (area_id, system_id, test_package_id)
-- Indexes created: 3 (partial indexes for non-null values)
-- RLS: Existing drawing policies automatically cover new columns
-- Next step: Update materialized view to include metadata joins
-- ============================================================================

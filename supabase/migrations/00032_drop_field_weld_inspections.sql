-- Migration 00032: Drop old field_weld_inspections table
-- Feature 014: Field Weld QC Module
-- Clean up old schema from migration 00011

-- Drop the old table (cascade to remove dependencies)
DROP TABLE IF EXISTS field_weld_inspections CASCADE;

-- Note: This table was created in migration 00011 but never fully implemented
-- The new design uses a field_welds table with one-to-one component relationship

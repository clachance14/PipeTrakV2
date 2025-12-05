-- Migration: Add manhour columns to components table
-- Feature: 032-manhour-earned-value
-- Description: Add budgeted_manhours and manhour_weight columns for earned value tracking
--
-- Prerequisites: Migration 00010 must be applied (components table exists)

-- ============================================================================
-- PART 1: ADD COLUMNS TO COMPONENTS TABLE
-- ============================================================================

-- Add budgeted_manhours column
-- Stores the allocated manhours for this component based on budget distribution
ALTER TABLE components
ADD COLUMN IF NOT EXISTS budgeted_manhours NUMERIC(10,4) DEFAULT 0;

-- Add manhour_weight column
-- Stores the calculated weight value used for proportional distribution (diameter^1.5 or fixed)
ALTER TABLE components
ADD COLUMN IF NOT EXISTS manhour_weight NUMERIC(10,4) DEFAULT 0;

-- ============================================================================
-- PART 2: ADD COMMENTS
-- ============================================================================

COMMENT ON COLUMN components.budgeted_manhours IS 'Manhours allocated to this component from project budget (distributed by weight)';
COMMENT ON COLUMN components.manhour_weight IS 'Calculated weight for proportional distribution (diameter^1.5 for sized components, fixed fallback for others)';

-- ============================================================================
-- PART 3: ADD INDEX FOR AGGREGATION QUERIES
-- ============================================================================

-- Index on budgeted_manhours for efficient aggregation queries
CREATE INDEX IF NOT EXISTS idx_components_budgeted_manhours
ON components(project_id, budgeted_manhours)
WHERE NOT is_retired;

-- ============================================================================
-- MIGRATION COMPLETE: 20251204162330_add_manhour_columns.sql
-- ============================================================================
-- Columns added: 2 (budgeted_manhours, manhour_weight)
-- Indexes added: 1 (idx_components_budgeted_manhours)
-- Next migration: 20251204162332_create_manhour_budgets.sql
-- ============================================================================

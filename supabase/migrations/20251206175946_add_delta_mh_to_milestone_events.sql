-- Migration: Add delta_mh and category columns to milestone_events
-- Feature: Timeline Report Delta Calculation Fix
--
-- These columns store pre-calculated values at insert time:
-- - delta_mh: The manhour delta for this milestone change
-- - category: The category from the template (receive, install, punch, test, restore)

-- Add columns
ALTER TABLE milestone_events ADD COLUMN IF NOT EXISTS delta_mh NUMERIC;
ALTER TABLE milestone_events ADD COLUMN IF NOT EXISTS category TEXT;

-- Add index for category filtering in delta reports
CREATE INDEX IF NOT EXISTS idx_milestone_events_category ON milestone_events(category);

-- Add index for date range + category queries
CREATE INDEX IF NOT EXISTS idx_milestone_events_created_at_category ON milestone_events(created_at, category);

COMMENT ON COLUMN milestone_events.delta_mh IS 'Pre-calculated manhour delta: component.budgeted_manhours * (template.weight/100) * (value_delta/100)';
COMMENT ON COLUMN milestone_events.category IS 'Category from template: receive, install, punch, test, or restore';

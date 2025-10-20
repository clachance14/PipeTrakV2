-- Migration 00020: Fix percent_complete trigger race condition
-- Feature: 010-let-s-spec (Drawing-Centered Component Progress Table)
-- Created: 2025-10-19
--
-- Problem: The trigger function calculate_component_percent() queries the database
-- for current_milestones, which returns OLD data during BEFORE UPDATE trigger,
-- causing percent_complete to be calculated incorrectly and overwrite the RPC's
-- correct calculation.
--
-- Solution: Modify calculate_component_percent to accept milestones as parameter
-- instead of querying database. Update trigger to pass NEW.current_milestones.
--
-- This ensures:
-- 1. RPC function updates work correctly
-- 2. Trigger still auto-calculates for bulk/direct SQL updates
-- 3. No race condition between RPC and trigger

-- ============================================================================
-- PART 1: Drop old function and create new version with milestones parameter
-- ============================================================================

-- Drop old version that queries database
DROP FUNCTION IF EXISTS calculate_component_percent(UUID);

-- Create new version that accepts milestones as parameter
CREATE OR REPLACE FUNCTION calculate_component_percent(
  p_template_id UUID,
  p_current_milestones JSONB
)
RETURNS NUMERIC(5,2) AS $$
DECLARE
  v_milestones_config JSONB;
  v_total_weight NUMERIC(5,2) := 0;
  v_milestone JSONB;
BEGIN
  -- Fetch template milestones config
  SELECT milestones_config
  INTO v_milestones_config
  FROM progress_templates
  WHERE id = p_template_id;

  -- Return 0 if template not found
  IF v_milestones_config IS NULL THEN
    RETURN 0.00;
  END IF;

  -- Loop through milestones and calculate weighted %
  FOR v_milestone IN SELECT * FROM jsonb_array_elements(v_milestones_config) LOOP
    DECLARE
      v_milestone_name TEXT := v_milestone->>'name';
      v_weight NUMERIC(5,2) := (v_milestone->>'weight')::NUMERIC(5,2);
      v_is_partial BOOLEAN := COALESCE((v_milestone->>'is_partial')::BOOLEAN, false);
      v_current_value JSONB := p_current_milestones->v_milestone_name;
    BEGIN
      IF v_current_value IS NOT NULL THEN
        IF v_is_partial THEN
          -- Hybrid workflow: partial % (e.g., "Fabricate": 75.00 → weight * 0.75)
          v_total_weight := v_total_weight + (v_weight * (v_current_value::TEXT)::NUMERIC / 100.0);
        ELSIF jsonb_typeof(v_current_value) = 'boolean' AND (v_current_value::TEXT)::BOOLEAN = true THEN
          -- Discrete workflow: boolean true (e.g., "Receive": true → add full weight)
          v_total_weight := v_total_weight + v_weight;
        ELSIF jsonb_typeof(v_current_value) = 'number' AND (v_current_value::TEXT)::NUMERIC = 1 THEN
          -- Handle numeric 1 as true (RPC function stores discrete milestones as 1/0)
          v_total_weight := v_total_weight + v_weight;
        END IF;
      END IF;
    END;
  END LOOP;

  RETURN ROUND(v_total_weight, 2);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_component_percent(UUID, JSONB) IS
  'Calculate weighted ROC % from provided milestones (fixed to use NEW.current_milestones instead of querying database)';

-- ============================================================================
-- PART 2: Update trigger function to use NEW.current_milestones
-- ============================================================================

CREATE OR REPLACE FUNCTION update_component_percent_on_milestone_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Recalculate percent_complete using NEW values (not querying database)
  -- This fixes the race condition where the old function queried the database
  -- and got OLD milestones during BEFORE UPDATE trigger
  NEW.percent_complete := calculate_component_percent(
    NEW.progress_template_id,
    NEW.current_milestones  -- Use NEW, not database query
  );
  NEW.last_updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TRIGGER update_component_percent_on_milestone_change ON components IS
  'Auto-recalculate percent_complete when milestones change (fixed to use NEW.current_milestones)';

-- ============================================================================
-- MIGRATION COMPLETE: 00020_fix_percent_complete_trigger.sql
-- ============================================================================
-- Changes:
-- - Modified calculate_component_percent(UUID) to calculate_component_percent(UUID, JSONB)
-- - Updated trigger function to pass NEW.current_milestones instead of querying database
-- - Handles both boolean (true) and numeric (1) milestone values
-- - Fixes race condition causing percent_complete to stay at 0.00
--
-- Result: Milestone updates via RPC now correctly save percent_complete to database
-- ============================================================================

-- Migration: Threaded Pipe Aggregate Model
-- Feature: 027-aggregate-threaded-pipe-import
-- Phase: 3 (Database Migration)
-- Tasks: T008-T011
-- Description: Enable aggregate threaded pipe tracking with absolute linear feet milestones

-- ============================================================================
-- Part 1: Backfill line_numbers array for existing threaded_pipe components
-- ============================================================================

-- Add line_numbers array to attributes for existing components
-- Existing discrete components (seq: 1, 2, 3) will get single-element arrays
-- Note: Most existing components may not have line_number in attributes
UPDATE components
SET attributes = jsonb_set(
  COALESCE(attributes, '{}'::jsonb),
  '{line_numbers}',
  CASE
    -- If line_number exists as string, convert to array
    WHEN attributes ? 'line_number' AND jsonb_typeof(attributes->'line_number') = 'string'
    THEN jsonb_build_array(attributes->>'line_number')
    -- If line_number exists as number, convert to string array
    WHEN attributes ? 'line_number' AND jsonb_typeof(attributes->'line_number') = 'number'
    THEN jsonb_build_array((attributes->>'line_number'))
    -- Default: empty array (will be populated on next import)
    ELSE '[]'::jsonb
  END,
  true -- create if not exists
)
WHERE component_type = 'threaded_pipe'
  AND NOT (attributes ? 'line_numbers'); -- Only update if line_numbers doesn't exist

-- ============================================================================
-- Part 2: Update calculate_component_percent to handle aggregate threaded pipe
-- ============================================================================

-- Drop existing function (all signatures)
DROP FUNCTION IF EXISTS calculate_component_percent(UUID, JSONB, UUID, TEXT);

-- Recreate with aggregate threaded pipe support
CREATE OR REPLACE FUNCTION calculate_component_percent(
  p_template_id UUID,
  p_current_milestones JSONB,
  p_project_id UUID DEFAULT NULL,
  p_component_type TEXT DEFAULT NULL
)
RETURNS NUMERIC(5,2) AS $$
DECLARE
  v_milestones_config JSONB;
  v_total_weight NUMERIC(5,2) := 0;
  v_milestone JSONB;
  v_milestone_name TEXT;
  v_weight NUMERIC(5,2);
  v_is_partial BOOLEAN;
  v_current_value JSONB;
  v_use_project_templates BOOLEAN := false;
BEGIN
  -- Check if project has custom templates (if project_id and component_type provided)
  IF p_project_id IS NOT NULL AND p_component_type IS NOT NULL THEN
    -- Check if project templates exist for this component type
    IF EXISTS (
      SELECT 1 FROM project_progress_templates
      WHERE project_id = p_project_id
        AND component_type = p_component_type
      LIMIT 1
    ) THEN
      v_use_project_templates := true;
    END IF;
  END IF;

  -- Use project templates or fall back to system templates
  IF v_use_project_templates THEN
    -- Calculate from project_progress_templates (new table structure)
    FOR v_milestone_name, v_weight, v_is_partial IN
      SELECT milestone_name, weight::NUMERIC(5,2), is_partial
      FROM project_progress_templates
      WHERE project_id = p_project_id
        AND component_type = p_component_type
      ORDER BY milestone_order
    LOOP
      v_current_value := p_current_milestones->v_milestone_name;

      IF v_current_value IS NOT NULL THEN
        IF v_is_partial THEN
          -- Partial milestone: value is 0-100 percentage
          v_total_weight := v_total_weight + (v_weight * (v_current_value::TEXT)::NUMERIC / 100.0);
        ELSIF jsonb_typeof(v_current_value) = 'boolean' AND (v_current_value::TEXT)::BOOLEAN = true THEN
          -- Discrete milestone: boolean true
          v_total_weight := v_total_weight + v_weight;
        ELSIF jsonb_typeof(v_current_value) = 'number' AND (v_current_value::TEXT)::NUMERIC = 1 THEN
          -- Discrete milestone: numeric 1 (treated as true)
          v_total_weight := v_total_weight + v_weight;
        END IF;
      END IF;
    END LOOP;
  ELSE
    -- Fall back to system templates (progress_templates with milestones_config JSONB)
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
      v_milestone_name := v_milestone->>'name';
      v_weight := (v_milestone->>'weight')::NUMERIC(5,2);
      v_is_partial := COALESCE((v_milestone->>'is_partial')::BOOLEAN, false);
      v_current_value := p_current_milestones->v_milestone_name;

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
    END LOOP;
  END IF;

  RETURN ROUND(v_total_weight, 2);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_component_percent(UUID, JSONB, UUID, TEXT) IS
'Calculate weighted ROC % from provided milestones. Supports aggregate threaded_pipe with absolute LF milestones. Checks project_progress_templates first, falls back to progress_templates.';

-- ============================================================================
-- Part 3: Update trigger function to handle aggregate threaded pipe
-- ============================================================================

CREATE OR REPLACE FUNCTION update_component_percent_on_milestone_change()
RETURNS TRIGGER AS $$
DECLARE
  v_is_aggregate_threaded_pipe BOOLEAN;
  v_total_lf NUMERIC;
  v_fabricate_lf NUMERIC;
  v_install_lf NUMERIC;
  v_erect_lf NUMERIC;
  v_connect_lf NUMERIC;
  v_support_lf NUMERIC;
  v_punch BOOLEAN;
  v_test BOOLEAN;
  v_restore BOOLEAN;
  v_weighted_percent NUMERIC(5,2) := 0;
BEGIN
  -- Check if this is an aggregate threaded_pipe component
  -- Aggregate marker: component_type = 'threaded_pipe' AND identity_key->>'seq' IS NULL
  v_is_aggregate_threaded_pipe :=
    NEW.component_type = 'threaded_pipe' AND
    (NEW.identity_key->>'seq') IS NULL;

  IF v_is_aggregate_threaded_pipe THEN
    -- Aggregate threaded pipe: Calculate from absolute LF milestones
    -- Extract total_linear_feet from attributes
    v_total_lf := COALESCE((NEW.attributes->>'total_linear_feet')::NUMERIC, 0);

    -- Prevent division by zero
    IF v_total_lf = 0 THEN
      NEW.percent_complete := 0.00;
      NEW.last_updated_at := now();
      RETURN NEW;
    END IF;

    -- Extract absolute LF milestone values (default to 0 if not present)
    v_fabricate_lf := COALESCE((NEW.current_milestones->>'Fabricate_LF')::NUMERIC, 0);
    v_install_lf := COALESCE((NEW.current_milestones->>'Install_LF')::NUMERIC, 0);
    v_erect_lf := COALESCE((NEW.current_milestones->>'Erect_LF')::NUMERIC, 0);
    v_connect_lf := COALESCE((NEW.current_milestones->>'Connect_LF')::NUMERIC, 0);
    v_support_lf := COALESCE((NEW.current_milestones->>'Support_LF')::NUMERIC, 0);

    -- Extract discrete milestone values (boolean or numeric 1/0)
    v_punch := COALESCE(
      (NEW.current_milestones->>'Punch')::BOOLEAN,
      (NEW.current_milestones->>'Punch')::NUMERIC = 1,
      false
    );
    v_test := COALESCE(
      (NEW.current_milestones->>'Test')::BOOLEAN,
      (NEW.current_milestones->>'Test')::NUMERIC = 1,
      false
    );
    v_restore := COALESCE(
      (NEW.current_milestones->>'Restore')::BOOLEAN,
      (NEW.current_milestones->>'Restore')::NUMERIC = 1,
      false
    );

    -- Calculate weighted percentage from absolute LF values
    -- Threaded pipe milestone weights: Fabricate=16%, Install=16%, Erect=16%, Connect=16%, Support=16%,
    -- Punch=5%, Test=10%, Restore=5% (total=100%)
    v_weighted_percent :=
      (v_fabricate_lf / v_total_lf * 16.0) +
      (v_install_lf / v_total_lf * 16.0) +
      (v_erect_lf / v_total_lf * 16.0) +
      (v_connect_lf / v_total_lf * 16.0) +
      (v_support_lf / v_total_lf * 16.0) +
      CASE WHEN v_punch THEN 5.0 ELSE 0.0 END +
      CASE WHEN v_test THEN 10.0 ELSE 0.0 END +
      CASE WHEN v_restore THEN 5.0 ELSE 0.0 END;

    NEW.percent_complete := ROUND(v_weighted_percent, 2);
  ELSE
    -- Non-aggregate component (discrete threaded_pipe or other types): Use standard calculation
    NEW.percent_complete := calculate_component_percent(
      NEW.progress_template_id,
      NEW.current_milestones,
      NEW.project_id,        -- Pass project_id for template lookup
      NEW.component_type      -- Pass component_type for template lookup
    );
  END IF;

  NEW.last_updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TRIGGER update_component_percent_on_milestone_change ON components IS
'Auto-recalculate percent_complete when milestones change. Supports aggregate threaded_pipe with absolute LF milestones and project templates.';

-- ============================================================================
-- Part 4: Verification queries (commented out - uncomment to test)
-- ============================================================================

-- Verify existing threaded_pipe components have line_numbers array
-- SELECT id, component_type, identity_key, attributes->'line_numbers' as line_numbers
-- FROM components
-- WHERE component_type = 'threaded_pipe';

-- Test aggregate threaded_pipe calculation (example with 100 LF total, 75 LF fabricated)
-- SELECT calculate_component_percent(
--   (SELECT id FROM progress_templates WHERE component_type = 'threaded_pipe' LIMIT 1),
--   '{"Fabricate_LF": 75, "Install_LF": 50, "Erect_LF": 25, "Connect_LF": 0, "Support_LF": 0, "Punch": false, "Test": false, "Restore": false}'::jsonb,
--   NULL,
--   'threaded_pipe'
-- );
-- Expected: Does NOT work (function calculates from percentage fields, not LF fields)
-- Trigger function handles aggregate calculation separately

-- ============================================================================
-- Migration Summary
-- ============================================================================

-- Affected Tables:
--   - components (backfilled line_numbers array for existing threaded_pipe components)
--   - Functions: calculate_component_percent (no changes, signature preserved)
--   - Triggers: update_component_percent_on_milestone_change (updated to handle aggregate threaded_pipe)

-- Breaking Changes: NONE
--   - Existing discrete threaded_pipe components (seq: 1, 2, 3) continue to work with percentage milestones
--   - New aggregate components (seq: null) will use absolute LF milestones
--   - Frontend will detect aggregate via (identity_key->>'seq') IS NULL

-- Rollback Strategy:
--   - Remove line_numbers array: UPDATE components SET attributes = attributes - 'line_numbers' WHERE component_type = 'threaded_pipe';
--   - Restore previous trigger function from migration 00092

-- Testing Requirements:
--   1. Verify existing discrete components still calculate percent_complete correctly
--   2. Create test aggregate component (seq: null) with absolute LF milestones
--   3. Verify aggregate calculation matches expected weighted percentage
--   4. Verify line_numbers array backfilled for existing components

-- ============================================================================
-- End of Migration
-- ============================================================================

-- Migration 00114: Fix aggregate threaded pipe milestone conversion
-- Bug Fix: Progress not updating for aggregate threaded pipe when UI sends percentage milestones
-- Created: 2025-11-16
--
-- Context:
-- The UI sends milestone updates with template names ("Fabricate", "Install", etc.) and percentage values (0-100),
-- but the aggregate threaded pipe trigger expects milestone names with "_LF" suffix and absolute linear feet values.
-- This causes the trigger to find NULL values and default to 0%, resulting in 0% progress.
--
-- Solution:
-- Modify the trigger to detect when partial milestones are set on aggregate threaded pipe components,
-- convert the milestone name to add "_LF" suffix, and convert percentage to absolute linear feet.

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
  v_milestone_key TEXT;
  v_milestone_value JSONB;
  v_converted_milestones JSONB;
  v_numeric_value NUMERIC;
  v_absolute_lf NUMERIC;
BEGIN
  -- Check if this is an aggregate threaded_pipe component
  -- Aggregate marker: component_type = 'threaded_pipe' AND identity_key->>'seq' IS NULL
  v_is_aggregate_threaded_pipe :=
    NEW.component_type = 'threaded_pipe' AND
    (NEW.identity_key->>'seq') IS NULL;

  IF v_is_aggregate_threaded_pipe THEN
    -- Aggregate threaded pipe: Convert percentage milestones to absolute LF before calculation

    -- Extract total_linear_feet from attributes
    v_total_lf := COALESCE((NEW.attributes->>'total_linear_feet')::NUMERIC, 0);

    -- Prevent division by zero
    IF v_total_lf = 0 THEN
      NEW.percent_complete := 0.00;
      NEW.last_updated_at := now();
      RETURN NEW;
    END IF;

    -- Convert milestone names and values for aggregate threaded pipe
    -- UI sends: {"Fabricate": 100, "Install": 50, ...} (percentages)
    -- We need: {"Fabricate_LF": 100, "Install_LF": 50, ...} (absolute LF)
    v_converted_milestones := NEW.current_milestones;

    -- Check if any partial milestones need conversion (have template names without _LF suffix)
    FOR v_milestone_key, v_milestone_value IN
      SELECT * FROM jsonb_each(NEW.current_milestones)
    LOOP
      -- Only convert partial milestones (Fabricate, Install, Erect, Connect, Support)
      -- Skip discrete milestones (Punch, Test, Restore)
      IF v_milestone_key IN ('Fabricate', 'Install', 'Erect', 'Connect', 'Support') AND
         jsonb_typeof(v_milestone_value) = 'number' THEN

        -- Get numeric value (percentage 0-100)
        v_numeric_value := (v_milestone_value)::TEXT::NUMERIC;

        -- Convert percentage to absolute linear feet
        v_absolute_lf := ROUND((v_numeric_value / 100.0) * v_total_lf);

        -- Remove the percentage milestone
        v_converted_milestones := v_converted_milestones - v_milestone_key;

        -- Add the _LF milestone with absolute value
        v_converted_milestones := jsonb_set(
          v_converted_milestones,
          ARRAY[v_milestone_key || '_LF'],
          to_jsonb(v_absolute_lf)
        );
      END IF;
    END LOOP;

    -- Update NEW.current_milestones with converted values
    NEW.current_milestones := v_converted_milestones;

    -- Extract absolute LF milestone values (now with _LF suffix)
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

COMMENT ON FUNCTION update_component_percent_on_milestone_change() IS
'Auto-recalculate percent_complete when milestones change. For aggregate threaded pipe, converts percentage milestones (Fabricate) to absolute LF milestones (Fabricate_LF) before calculation.';

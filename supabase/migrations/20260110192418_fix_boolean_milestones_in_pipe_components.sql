-- Migration: Fix boolean milestone values in current_milestones JSONB
--
-- Problem: Some components have boolean values (true/false) in current_milestones
-- instead of numeric values (0-100). The update_component_milestone RPC fails
-- when trying to cast these as NUMERIC: "invalid input syntax for type numeric: "false""
--
-- Solution: Convert all boolean values in current_milestones to numeric:
-- - false -> 0
-- - true -> 100

-- Function to convert boolean milestone values to numeric
CREATE OR REPLACE FUNCTION fix_boolean_milestone_values()
RETURNS void AS $$
DECLARE
  v_component RECORD;
  v_key TEXT;
  v_value JSONB;
  v_new_milestones JSONB;
  v_fixed_count INTEGER := 0;
BEGIN
  -- Find all components with boolean values in current_milestones
  FOR v_component IN
    SELECT id, current_milestones
    FROM components
    WHERE current_milestones IS NOT NULL
      AND current_milestones::text ~ '(true|false)'
  LOOP
    v_new_milestones := '{}'::JSONB;

    -- Iterate through each key in current_milestones
    FOR v_key, v_value IN
      SELECT key, value FROM jsonb_each(v_component.current_milestones)
    LOOP
      -- Convert boolean to numeric, keep numeric as-is
      IF jsonb_typeof(v_value) = 'boolean' THEN
        IF v_value::text = 'true' THEN
          v_new_milestones := jsonb_set(v_new_milestones, ARRAY[v_key], '100'::JSONB);
        ELSE
          v_new_milestones := jsonb_set(v_new_milestones, ARRAY[v_key], '0'::JSONB);
        END IF;
      ELSE
        v_new_milestones := jsonb_set(v_new_milestones, ARRAY[v_key], v_value);
      END IF;
    END LOOP;

    -- Update the component with fixed milestones
    UPDATE components
    SET current_milestones = v_new_milestones
    WHERE id = v_component.id;

    v_fixed_count := v_fixed_count + 1;
  END LOOP;

  RAISE NOTICE 'Fixed % components with boolean milestone values', v_fixed_count;
END;
$$ LANGUAGE plpgsql;

-- Execute the fix
SELECT fix_boolean_milestone_values();

-- Drop the temporary function
DROP FUNCTION fix_boolean_milestone_values();

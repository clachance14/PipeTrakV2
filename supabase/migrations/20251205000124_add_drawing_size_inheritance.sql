-- Migration: Add drawing size inheritance for spools and field_welds
-- For components without a SIZE field, inherit the most common size from the drawing
-- Threaded pipe without size gets fallback weight of 1

-- Drop and recreate the function with size inheritance logic
CREATE OR REPLACE FUNCTION create_manhour_budget(
  p_project_id UUID,
  p_total_budgeted_manhours NUMERIC,
  p_revision_reason TEXT,
  p_effective_date DATE DEFAULT CURRENT_DATE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_user_role TEXT;
  v_budget_id UUID;
  v_version_number INTEGER;
  v_total_weight NUMERIC := 0;
  v_component RECORD;
  v_size_value TEXT;
  v_diameter NUMERIC;
  v_weight NUMERIC;
  v_linear_feet NUMERIC;
  v_is_threaded BOOLEAN;
  v_fallback_weight NUMERIC;
  v_total_components INTEGER := 0;
  v_components_allocated INTEGER := 0;
  v_components_with_warnings INTEGER := 0;
  v_warnings JSONB := '[]'::JSONB;
  v_per_weight_unit NUMERIC;
  v_inherited_size TEXT;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'UNAUTHORIZED: Not authenticated'
    );
  END IF;

  -- Check user's role via organization (single-org architecture)
  SELECT uo.role INTO v_user_role
  FROM user_organizations uo
  JOIN projects p ON p.organization_id = uo.organization_id
  WHERE p.id = p_project_id AND uo.user_id = v_user_id;

  IF v_user_role IS NULL OR v_user_role NOT IN ('owner', 'admin', 'project_manager') THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'UNAUTHORIZED: Must be Owner, Admin, or PM to create budgets'
    );
  END IF;

  -- Get next version number
  SELECT COALESCE(MAX(version_number), 0) + 1 INTO v_version_number
  FROM project_manhour_budgets
  WHERE project_id = p_project_id;

  -- Create the budget record (trigger will handle deactivating old budgets)
  INSERT INTO project_manhour_budgets (
    project_id,
    total_budgeted_manhours,
    version_number,
    revision_reason,
    effective_date,
    is_active,
    created_by
  ) VALUES (
    p_project_id,
    p_total_budgeted_manhours,
    v_version_number,
    p_revision_reason,
    p_effective_date,
    true,
    v_user_id
  )
  RETURNING id INTO v_budget_id;

  -- First pass: Calculate weights for all non-retired components
  -- Using a temporary table to store weights
  CREATE TEMP TABLE temp_component_weights (
    component_id UUID PRIMARY KEY,
    weight NUMERIC NOT NULL DEFAULT 0.5,
    has_warning BOOLEAN DEFAULT false,
    warning_reason TEXT
  ) ON COMMIT DROP;

  -- Calculate most common size per drawing for inheritance
  CREATE TEMP TABLE temp_drawing_sizes (
    drawing_id UUID PRIMARY KEY,
    most_common_size TEXT,
    size_count INTEGER
  ) ON COMMIT DROP;

  -- Find most common size per drawing (only from components that have SIZE)
  INSERT INTO temp_drawing_sizes (drawing_id, most_common_size, size_count)
  SELECT DISTINCT ON (c.drawing_id)
    c.drawing_id,
    COALESCE(
      c.identity_key->>'size',
      c.identity_key->>'SIZE'
    ) as size_val,
    COUNT(*) as cnt
  FROM components c
  WHERE c.project_id = p_project_id
    AND c.is_retired = false
    AND c.drawing_id IS NOT NULL
    AND (c.identity_key->>'size' IS NOT NULL OR c.identity_key->>'SIZE' IS NOT NULL)
  GROUP BY c.drawing_id, COALESCE(c.identity_key->>'size', c.identity_key->>'SIZE')
  ORDER BY c.drawing_id, cnt DESC;

  -- Process each component
  FOR v_component IN
    SELECT
      c.id,
      c.component_type,
      c.identity_key,
      c.drawing_id
    FROM components c
    WHERE c.project_id = p_project_id
      AND c.is_retired = false
  LOOP
    v_total_components := v_total_components + 1;
    v_size_value := NULL;
    v_inherited_size := NULL;
    v_is_threaded := UPPER(COALESCE(v_component.component_type, '')) LIKE '%THREADED%';

    -- Determine fallback weight based on component type
    -- Threaded pipe gets fallback of 1, others get 0.5
    IF v_is_threaded THEN
      v_fallback_weight := 1.0;
    ELSE
      v_fallback_weight := 0.5;
    END IF;

    v_weight := v_fallback_weight; -- Default fallback weight

    -- Try to get SIZE from identity_key
    v_size_value := COALESCE(
      v_component.identity_key->>'size',
      v_component.identity_key->>'SIZE'
    );

    -- If no SIZE and component is spool or field_weld, try to inherit from drawing
    IF v_size_value IS NULL AND v_component.component_type IN ('spool', 'field_weld') THEN
      SELECT most_common_size INTO v_inherited_size
      FROM temp_drawing_sizes
      WHERE drawing_id = v_component.drawing_id;

      IF v_inherited_size IS NOT NULL THEN
        v_size_value := v_inherited_size;
      END IF;
    END IF;

    -- Parse the size value
    IF v_size_value IS NOT NULL AND TRIM(v_size_value) != '' THEN
      -- Handle special cases
      IF UPPER(TRIM(v_size_value)) = 'NOSIZE' THEN
        v_diameter := NULL;
      ELSIF UPPER(TRIM(v_size_value)) = 'HALF' THEN
        v_diameter := 0.5;
      -- Handle reducers (e.g., "2X4", "1/2X3/4")
      ELSIF v_size_value ~* '^.+X.+$' THEN
        DECLARE
          v_parts TEXT[];
          v_d1 NUMERIC;
          v_d2 NUMERIC;
        BEGIN
          v_parts := regexp_split_to_array(UPPER(TRIM(v_size_value)), 'X');
          -- Parse first part
          IF v_parts[1] ~ '^\d+$' THEN
            v_d1 := v_parts[1]::NUMERIC;
          ELSIF v_parts[1] ~ '^\d+/\d+$' THEN
            v_d1 := (split_part(v_parts[1], '/', 1)::NUMERIC) / (split_part(v_parts[1], '/', 2)::NUMERIC);
          ELSE
            v_d1 := NULL;
          END IF;
          -- Parse second part
          IF v_parts[2] ~ '^\d+$' THEN
            v_d2 := v_parts[2]::NUMERIC;
          ELSIF v_parts[2] ~ '^\d+/\d+$' THEN
            v_d2 := (split_part(v_parts[2], '/', 1)::NUMERIC) / (split_part(v_parts[2], '/', 2)::NUMERIC);
          ELSE
            v_d2 := NULL;
          END IF;
          -- Calculate average diameter
          IF v_d1 IS NOT NULL AND v_d2 IS NOT NULL THEN
            v_diameter := (v_d1 + v_d2) / 2;
          ELSE
            v_diameter := NULL;
          END IF;
        END;
      -- Handle fractions (e.g., "1/2", "3/4")
      ELSIF v_size_value ~ '^\d+/\d+$' THEN
        v_diameter := (split_part(v_size_value, '/', 1)::NUMERIC) / (split_part(v_size_value, '/', 2)::NUMERIC);
      -- Handle integers
      ELSIF v_size_value ~ '^\d+$' THEN
        v_diameter := v_size_value::NUMERIC;
      ELSE
        v_diameter := NULL;
      END IF;
    ELSE
      v_diameter := NULL;
    END IF;

    -- Calculate weight based on diameter
    IF v_diameter IS NOT NULL AND v_diameter > 0 THEN
      v_linear_feet := NULL;

      IF v_is_threaded THEN
        v_linear_feet := COALESCE(
          (v_component.identity_key->>'linear_feet')::NUMERIC,
          (v_component.identity_key->>'LINEAR_FEET')::NUMERIC
        );
      END IF;

      IF v_is_threaded AND v_linear_feet IS NOT NULL THEN
        -- Threaded pipe: diameter^1.5 * linear_feet * 0.1
        v_weight := POWER(v_diameter, 1.5) * v_linear_feet * 0.1;
      ELSE
        -- Standard: diameter^1.5
        v_weight := POWER(v_diameter, 1.5);
      END IF;

      INSERT INTO temp_component_weights (component_id, weight, has_warning, warning_reason)
      VALUES (v_component.id, v_weight, false, NULL);
    ELSE
      -- Fallback weight with warning (1.0 for threaded, 0.5 for others)
      INSERT INTO temp_component_weights (component_id, weight, has_warning, warning_reason)
      VALUES (v_component.id, v_fallback_weight, true, 'unparseable_size');

      v_components_with_warnings := v_components_with_warnings + 1;
      v_warnings := v_warnings || jsonb_build_object(
        'component_id', v_component.id,
        'message', format('Using fallback weight %s - no parseable size', v_fallback_weight)
      );
    END IF;

    v_total_weight := v_total_weight + v_weight;
  END LOOP;

  -- Calculate per-weight-unit value
  IF v_total_weight > 0 THEN
    v_per_weight_unit := p_total_budgeted_manhours / v_total_weight;
  ELSE
    -- Edge case: no weight, distribute equally
    v_per_weight_unit := p_total_budgeted_manhours / NULLIF(v_total_components, 0);
  END IF;

  -- Second pass: Update components with allocated manhours
  UPDATE components c
  SET
    budgeted_manhours = ROUND(tw.weight * v_per_weight_unit, 4),
    manhour_weight = ROUND(tw.weight, 4),
    last_updated_at = NOW(),
    last_updated_by = v_user_id
  FROM temp_component_weights tw
  WHERE c.id = tw.component_id;

  GET DIAGNOSTICS v_components_allocated = ROW_COUNT;

  -- Return success with summary
  RETURN jsonb_build_object(
    'success', true,
    'budget_id', v_budget_id,
    'version_number', v_version_number,
    'distribution_summary', jsonb_build_object(
      'total_components', v_total_components,
      'components_allocated', v_components_allocated,
      'components_with_warnings', v_components_with_warnings,
      'total_weight', ROUND(v_total_weight, 4),
      'total_allocated_mh', ROUND(p_total_budgeted_manhours, 4)
    ),
    'warnings', v_warnings
  );
END;
$$;

-- Add comment explaining the size inheritance logic
COMMENT ON FUNCTION create_manhour_budget IS
'Creates a new manhour budget and distributes to components.
Size inheritance: Spools and field_welds without a SIZE field inherit
the most common size from other components on the same drawing.
Weight formula: diameter^1.5 (threaded pipe: diameter^1.5 * linear_feet * 0.1)
Fallback weights: threaded_pipe=1.0, all others=0.5';

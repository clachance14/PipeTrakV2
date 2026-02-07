-- Migration: Fix create_manhour_budget RPC for aggregate pipe/threaded_pipe components
-- Issue: Aggregate components store size and linear_feet in `attributes`, not `identity_key`.
--        The RPC only read from identity_key, causing all aggregates to get fallback weight 0.5.
-- Fix: Detect aggregates via `identity_key ? 'pipe_id'` and read from attributes instead.

CREATE OR REPLACE FUNCTION create_manhour_budget(
  p_project_id UUID,
  p_total_budgeted_manhours NUMERIC,
  p_revision_reason TEXT,
  p_effective_date DATE DEFAULT CURRENT_DATE
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_budget_id UUID;
  v_version_number INTEGER;
  v_total_components INTEGER;
  v_components_allocated INTEGER := 0;
  v_components_with_warnings INTEGER := 0;
  v_total_weight NUMERIC := 0;
  v_warnings JSONB := '[]'::JSONB;
  v_component RECORD;
  v_diameter NUMERIC;
  v_weight NUMERIC;
  v_linear_feet NUMERIC;
  v_budgeted_mh NUMERIC;
  v_is_aggregate BOOLEAN;
  v_size_source TEXT;
BEGIN
  -- VALIDATION 1: Check permission
  IF NOT check_manhour_permission(p_project_id) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'UNAUTHORIZED',
      'message', 'Only Owner, Admin, or Project Manager can create budgets'
    );
  END IF;

  -- VALIDATION 2: Check budget amount
  IF p_total_budgeted_manhours <= 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'INVALID_BUDGET',
      'message', 'Total budgeted manhours must be greater than 0'
    );
  END IF;

  -- VALIDATION 3: Check project has components
  SELECT COUNT(*) INTO v_total_components
  FROM components
  WHERE project_id = p_project_id AND NOT is_retired;

  IF v_total_components = 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'NO_COMPONENTS',
      'message', 'Project has no non-retired components'
    );
  END IF;

  -- GET NEXT VERSION NUMBER
  SELECT COALESCE(MAX(version_number), 0) + 1 INTO v_version_number
  FROM project_manhour_budgets
  WHERE project_id = p_project_id;

  -- CREATE BUDGET RECORD (trigger will deactivate previous active budget)
  INSERT INTO project_manhour_budgets (
    project_id,
    version_number,
    total_budgeted_manhours,
    revision_reason,
    effective_date,
    is_active,
    created_by
  ) VALUES (
    p_project_id,
    v_version_number,
    p_total_budgeted_manhours,
    p_revision_reason,
    p_effective_date,
    true,
    auth.uid()
  ) RETURNING id INTO v_budget_id;

  -- PHASE 1: Calculate weights for all components
  FOR v_component IN
    SELECT id, component_type, identity_key, attributes
    FROM components
    WHERE project_id = p_project_id AND NOT is_retired
  LOOP
    -- Detect aggregate components (pipe/threaded_pipe rolled up from individual segments)
    v_is_aggregate := (v_component.identity_key ? 'pipe_id');

    -- Read size and linear_feet from the correct source
    IF v_is_aggregate THEN
      -- Aggregate: read from attributes
      v_diameter := parse_size_diameter(COALESCE(v_component.attributes->>'size', ''));
      v_linear_feet := (v_component.attributes->>'total_linear_feet')::NUMERIC;
      v_size_source := 'attributes';
    ELSE
      -- Non-aggregate: read from identity_key
      v_diameter := parse_size_diameter(v_component.identity_key->>'size');
      v_linear_feet := (v_component.identity_key->>'linear_feet')::NUMERIC;
      v_size_source := 'identity_key';
    END IF;

    -- Calculate weight based on component type and size
    IF v_diameter IS NULL OR v_diameter <= 0 THEN
      -- No parseable size: fixed weight
      v_weight := 0.5;
      v_components_with_warnings := v_components_with_warnings + 1;
      v_warnings := v_warnings || jsonb_build_object(
        'component_id', v_component.id,
        'identity_key', v_component.identity_key,
        'reason', format('No parseable size from %s, fixed weight (0.5) assigned', v_size_source)
      );
    ELSIF v_component.component_type IN ('pipe', 'threaded_pipe')
          AND v_linear_feet IS NOT NULL
          AND v_linear_feet > 0 THEN
      -- Pipe or threaded pipe with linear feet: diameter^1.5 * linear_feet * 0.1
      v_weight := POWER(v_diameter, 1.5) * v_linear_feet * 0.1;
    ELSIF v_component.component_type IN ('pipe', 'threaded_pipe')
          AND v_is_aggregate
          AND (v_linear_feet IS NULL OR v_linear_feet = 0) THEN
      -- Aggregate pipe/threaded_pipe with diameter but no footage: diameter-only with warning
      v_weight := POWER(v_diameter, 1.5);
      v_components_with_warnings := v_components_with_warnings + 1;
      v_warnings := v_warnings || jsonb_build_object(
        'component_id', v_component.id,
        'identity_key', v_component.identity_key,
        'reason', 'Aggregate pipe/threaded_pipe has size but no total_linear_feet in attributes, using diameter-only weight'
      );
    ELSE
      -- Standard component: diameter^1.5
      v_weight := POWER(v_diameter, 1.5);
    END IF;

    -- Update component with calculated weight
    UPDATE components
    SET manhour_weight = v_weight
    WHERE id = v_component.id;

    v_total_weight := v_total_weight + v_weight;
    v_components_allocated := v_components_allocated + 1;
  END LOOP;

  -- VALIDATION 4: Check total weight is not zero
  IF v_total_weight = 0 THEN
    -- Rollback by deleting the budget
    DELETE FROM project_manhour_budgets WHERE id = v_budget_id;
    RETURN jsonb_build_object(
      'success', false,
      'error', 'ZERO_WEIGHT',
      'message', 'Sum of component weights is zero, cannot distribute budget'
    );
  END IF;

  -- PHASE 2: Distribute manhours proportionally by weight
  FOR v_component IN
    SELECT id, manhour_weight
    FROM components
    WHERE project_id = p_project_id AND NOT is_retired
  LOOP
    -- Calculate proportional manhours: (component_weight / total_weight) * total_budget
    v_budgeted_mh := ROUND((v_component.manhour_weight / v_total_weight) * p_total_budgeted_manhours, 4);

    UPDATE components
    SET budgeted_manhours = v_budgeted_mh
    WHERE id = v_component.id;
  END LOOP;

  -- RETURN SUCCESS
  RETURN jsonb_build_object(
    'success', true,
    'budget_id', v_budget_id,
    'version_number', v_version_number,
    'distribution_summary', jsonb_build_object(
      'total_components', v_total_components,
      'components_allocated', v_components_allocated,
      'components_with_warnings', v_components_with_warnings,
      'total_weight', ROUND(v_total_weight, 4),
      'total_allocated_mh', p_total_budgeted_manhours
    ),
    'warnings', v_warnings
  );
END;
$$;

COMMENT ON FUNCTION create_manhour_budget IS 'Create project manhour budget and auto-distribute to components by weight (SECURITY DEFINER, Owner/Admin/PM only). Reads size/footage from attributes for aggregate pipe/threaded_pipe components.';

-- Migration: Create manhour budget RPC
-- Feature: 032-manhour-earned-value
-- Description: SECURITY DEFINER RPC to create budget and distribute manhours to components
--
-- Prerequisites:
--   - Migration 20251204162330 (manhour columns on components)
--   - Migration 20251204162348 (project_manhour_budgets table)

-- ============================================================================
-- PART 1: PERMISSION CHECK HELPER
-- ============================================================================

-- Check if caller has financial role on project (Owner, Admin, PM)
CREATE OR REPLACE FUNCTION check_manhour_permission(p_project_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_user_role TEXT;
  v_org_id UUID;
BEGIN
  -- Get user's organization and role
  SELECT organization_id, role INTO v_org_id, v_user_role
  FROM users
  WHERE id = auth.uid();

  -- Check if project belongs to user's organization
  IF NOT EXISTS (
    SELECT 1 FROM projects
    WHERE id = p_project_id AND organization_id = v_org_id
  ) THEN
    RETURN FALSE;
  END IF;

  -- Check if user has financial role
  RETURN v_user_role IN ('owner', 'admin', 'project_manager');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION check_manhour_permission IS 'Check if caller has Owner/Admin/PM role for manhour operations';

-- ============================================================================
-- PART 2: SIZE PARSING HELPER
-- ============================================================================

-- Parse SIZE field from identity_key to extract diameter
-- Handles: integers ("2"), fractions ("1/2"), reducers ("2X4"), HALF, NOSIZE
CREATE OR REPLACE FUNCTION parse_size_diameter(p_size TEXT)
RETURNS NUMERIC AS $$
DECLARE
  v_match TEXT[];
  v_num1 NUMERIC;
  v_num2 NUMERIC;
BEGIN
  -- NULL or empty
  IF p_size IS NULL OR TRIM(p_size) = '' THEN
    RETURN NULL;
  END IF;

  -- NOSIZE or invalid
  IF UPPER(p_size) = 'NOSIZE' THEN
    RETURN NULL;
  END IF;

  -- HALF special case
  IF UPPER(p_size) = 'HALF' THEN
    RETURN 0.5;
  END IF;

  -- Reducer format: "2X4" or "2x4" (return average)
  IF p_size ~ '^\d+(\.\d+)?[Xx]\d+(\.\d+)?$' THEN
    v_match := regexp_match(p_size, '^(\d+(?:\.\d+)?)[Xx](\d+(?:\.\d+)?)$');
    v_num1 := v_match[1]::NUMERIC;
    v_num2 := v_match[2]::NUMERIC;
    RETURN (v_num1 + v_num2) / 2.0;
  END IF;

  -- Fraction format: "1/2", "3/4"
  IF p_size ~ '^\d+/\d+$' THEN
    v_match := regexp_match(p_size, '^(\d+)/(\d+)$');
    RETURN v_match[1]::NUMERIC / v_match[2]::NUMERIC;
  END IF;

  -- Simple number: "2", "4", "2.5"
  IF p_size ~ '^\d+(\.\d+)?$' THEN
    RETURN p_size::NUMERIC;
  END IF;

  -- Unparseable
  RETURN NULL;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION parse_size_diameter IS 'Parse SIZE field to numeric diameter (handles integers, fractions, reducers)';

-- ============================================================================
-- PART 3: CREATE MANHOUR BUDGET RPC
-- ============================================================================

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
    SELECT id, component_type, identity_key
    FROM components
    WHERE project_id = p_project_id AND NOT is_retired
  LOOP
    -- Parse size from identity_key
    v_diameter := parse_size_diameter(v_component.identity_key->>'size');
    v_linear_feet := (v_component.identity_key->>'linear_feet')::NUMERIC;

    -- Calculate weight based on component type and size
    IF v_diameter IS NULL THEN
      -- No parseable size: fixed weight
      v_weight := 0.5;
      v_components_with_warnings := v_components_with_warnings + 1;
      v_warnings := v_warnings || jsonb_build_object(
        'component_id', v_component.id,
        'identity_key', v_component.identity_key,
        'reason', 'No parseable size, fixed weight (0.5) assigned'
      );
    ELSIF v_component.component_type = 'threaded_pipe' AND v_linear_feet IS NOT NULL THEN
      -- Threaded pipe with linear feet: diameter^1.5 * linear_feet * 0.1
      v_weight := POWER(v_diameter, 1.5) * v_linear_feet * 0.1;
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

COMMENT ON FUNCTION create_manhour_budget IS 'Create project manhour budget and auto-distribute to components by weight (SECURITY DEFINER, Owner/Admin/PM only)';

-- ============================================================================
-- MIGRATION COMPLETE: 20251204162418_manhour_create_budget_rpc.sql
-- ============================================================================
-- Functions created: 3
--   - check_manhour_permission (permission helper)
--   - parse_size_diameter (size parsing)
--   - create_manhour_budget (main RPC)
-- Next step: Push migrations with ./db-push.sh
-- ============================================================================

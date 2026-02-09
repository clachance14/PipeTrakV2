-- CodeRabbit review fixes for PR #31
--
-- 1. Add missing GRANT EXECUTE on create_unplanned_weld (dropped by 20260209250000)
-- 2. Add SET search_path = public to get_field_weld_delta_by_dimension (20260209240000)
-- 3. Fix progress template lookup ORDER BY in create_unplanned_weld

-- ============================================================================
-- Fix 1: Restore GRANT EXECUTE on create_unplanned_weld
-- ============================================================================
-- Migration 20260209250000 dropped and recreated the function, which removed
-- the GRANT from migration 00120. Without this, authenticated users cannot
-- call the RPC.

GRANT EXECUTE ON FUNCTION create_unplanned_weld(UUID, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, NUMERIC) TO authenticated;

-- ============================================================================
-- Fix 2: Add SET search_path = public to delta RPC
-- ============================================================================
-- SECURITY DEFINER functions should pin search_path to prevent hijacking.

ALTER FUNCTION get_field_weld_delta_by_dimension(UUID, TEXT, TIMESTAMPTZ, TIMESTAMPTZ)
  SET search_path = public;

-- ============================================================================
-- Fix 3: Fix progress template lookup ORDER BY in create_unplanned_weld
-- ============================================================================
-- The LIMIT 1 without ORDER BY returns an arbitrary row when multiple
-- template versions exist. Must use ORDER BY version DESC for consistency
-- with other RPCs (e.g., 20260202220024_add_nde_audit_and_rpcs).

DROP FUNCTION IF EXISTS create_unplanned_weld(UUID, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, NUMERIC);

CREATE FUNCTION create_unplanned_weld(
  p_project_id UUID,
  p_drawing_id UUID,
  p_weld_number TEXT,
  p_weld_type TEXT,
  p_weld_size TEXT,
  p_spec TEXT,
  p_schedule TEXT DEFAULT NULL,
  p_base_metal TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_xray_percentage NUMERIC(5,2) DEFAULT 5.0
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_user_role TEXT;
  v_drawing_record RECORD;
  v_component_id UUID;
  v_field_weld_id UUID;
  v_progress_template_id UUID;
  v_duplicate_check INTEGER;
  v_result json;
BEGIN
  -- ============================================================================
  -- Permission Check
  -- ============================================================================

  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required'
      USING ERRCODE = '42501';
  END IF;

  SELECT role INTO v_user_role
  FROM users
  WHERE id = v_user_id;

  IF v_user_role IS NULL THEN
    RAISE EXCEPTION 'User not found'
      USING ERRCODE = '02000';
  END IF;

  IF v_user_role NOT IN ('owner', 'admin', 'project_manager', 'foreman', 'qc_inspector') THEN
    RAISE EXCEPTION 'Permission denied: User role % cannot create welds', v_user_role
      USING ERRCODE = '42501';
  END IF;

  -- ============================================================================
  -- Input Validation
  -- ============================================================================

  IF p_weld_type NOT IN ('BW', 'SW', 'FW', 'TW') THEN
    RAISE EXCEPTION 'Invalid weld type: Must be BW, SW, FW, or TW'
      USING ERRCODE = '23514';
  END IF;

  IF p_xray_percentage IS NOT NULL AND (p_xray_percentage < 0 OR p_xray_percentage > 100) THEN
    RAISE EXCEPTION 'Invalid xray_percentage: Must be between 0 and 100'
      USING ERRCODE = '23514';
  END IF;

  IF p_weld_number IS NULL OR trim(p_weld_number) = '' THEN
    RAISE EXCEPTION 'Weld number is required'
      USING ERRCODE = '23514';
  END IF;

  IF p_weld_size IS NULL OR trim(p_weld_size) = '' THEN
    RAISE EXCEPTION 'Weld size is required'
      USING ERRCODE = '23514';
  END IF;

  IF p_spec IS NULL OR trim(p_spec) = '' THEN
    RAISE EXCEPTION 'Spec is required'
      USING ERRCODE = '23514';
  END IF;

  -- ============================================================================
  -- Drawing Validation and Metadata Fetch
  -- ============================================================================

  SELECT id, project_id, area_id, system_id, test_package_id
  INTO v_drawing_record
  FROM drawings
  WHERE id = p_drawing_id;

  IF v_drawing_record.id IS NULL THEN
    RAISE EXCEPTION 'Drawing not found: %', p_drawing_id
      USING ERRCODE = '02000';
  END IF;

  IF v_drawing_record.project_id != p_project_id THEN
    RAISE EXCEPTION 'Drawing does not belong to project'
      USING ERRCODE = '23503';
  END IF;

  -- ============================================================================
  -- Weld Number Uniqueness Check
  -- ============================================================================

  SELECT COUNT(*) INTO v_duplicate_check
  FROM components
  WHERE project_id = p_project_id
    AND component_type = 'field_weld'
    AND identity_key->>'weld_number' = p_weld_number;

  IF v_duplicate_check > 0 THEN
    RAISE EXCEPTION 'Duplicate weld number: % already exists in project', p_weld_number
      USING ERRCODE = '23505';
  END IF;

  -- ============================================================================
  -- Progress Template Lookup (ORDER BY version DESC for latest)
  -- ============================================================================

  SELECT id INTO v_progress_template_id
  FROM progress_templates
  WHERE component_type = 'field_weld'
  ORDER BY version DESC
  LIMIT 1;

  IF v_progress_template_id IS NULL THEN
    RAISE EXCEPTION 'Progress template not found for field_weld component type'
      USING ERRCODE = '02000';
  END IF;

  -- ============================================================================
  -- Atomic Transaction: Create Component and Field Weld
  -- ============================================================================

  v_component_id := gen_random_uuid();
  v_field_weld_id := gen_random_uuid();

  INSERT INTO components (
    id,
    project_id,
    drawing_id,
    component_type,
    identity_key,
    progress_template_id,
    area_id,
    system_id,
    test_package_id,
    current_milestones,
    percent_complete,
    created_by,
    last_updated_by,
    last_updated_at
  ) VALUES (
    v_component_id,
    p_project_id,
    p_drawing_id,
    'field_weld',
    jsonb_build_object('weld_number', p_weld_number),
    v_progress_template_id,
    v_drawing_record.area_id,
    v_drawing_record.system_id,
    v_drawing_record.test_package_id,
    '{}'::jsonb,
    0.00,
    v_user_id,
    v_user_id,
    now()
  );

  INSERT INTO field_welds (
    id,
    component_id,
    project_id,
    weld_type,
    weld_size,
    spec,
    schedule,
    base_metal,
    xray_percentage,
    notes,
    is_unplanned,
    nde_required,
    status,
    created_by,
    created_at,
    updated_at
  ) VALUES (
    v_field_weld_id,
    v_component_id,
    p_project_id,
    p_weld_type,
    p_weld_size,
    p_spec,
    p_schedule,
    p_base_metal,
    p_xray_percentage,
    p_notes,
    true,
    false,
    'active',
    v_user_id,
    now(),
    now()
  );

  -- ============================================================================
  -- Build Response JSON
  -- ============================================================================

  SELECT json_build_object(
    'field_weld', row_to_json(fw.*),
    'component', row_to_json(c.*)
  ) INTO v_result
  FROM field_welds fw
  JOIN components c ON c.id = fw.component_id
  WHERE fw.id = v_field_weld_id;

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    RAISE;
END;
$$;

-- Restore GRANT after recreating function
GRANT EXECUTE ON FUNCTION create_unplanned_weld(UUID, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, NUMERIC) TO authenticated;

COMMENT ON FUNCTION create_unplanned_weld IS
'Creates an unplanned field weld with atomic component creation.

Permissions: Owner, Admin, Project Manager, Foreman, QC Inspector
Returns: JSON with field_weld and component records
Raises: Exception if permissions denied, duplicate weld number, or invalid references

Feature: 028-add-unplanned-welds
Created: 2025-11-17
Updated: 2026-02-09 (CodeRabbit fixes: GRANT EXECUTE, ORDER BY version DESC)
';

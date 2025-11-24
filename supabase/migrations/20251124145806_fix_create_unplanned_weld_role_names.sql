-- Fix: Correct role names in create_unplanned_weld RPC
--
-- Issue: RPC uses abbreviated role names ('qc', 'pm') that don't match
--        actual database role values ('qc_inspector', 'project_manager')
--
-- Root cause: Permission check uses non-existent role names
--   - Uses 'qc' but database has 'qc_inspector'
--   - Uses 'pm' but database has 'project_manager'
--
-- Solution: Update role check to use correct database role names

-- Drop old function (same signature, just fixing logic)
DROP FUNCTION IF EXISTS create_unplanned_weld(UUID, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, NUMERIC);

-- Recreate with corrected role names
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

  -- Get current user ID from auth
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required'
      USING ERRCODE = '42501'; -- insufficient_privilege
  END IF;

  -- Get user role
  SELECT role INTO v_user_role
  FROM users
  WHERE id = v_user_id;

  IF v_user_role IS NULL THEN
    RAISE EXCEPTION 'User not found'
      USING ERRCODE = '02000'; -- no_data
  END IF;

  -- Check if user role is allowed to create welds
  -- FIX: Use actual database role names (qc_inspector, project_manager)
  IF v_user_role NOT IN ('owner', 'admin', 'project_manager', 'foreman', 'qc_inspector') THEN
    RAISE EXCEPTION 'Permission denied: User role % cannot create welds', v_user_role
      USING ERRCODE = '42501'; -- insufficient_privilege
  END IF;

  -- ============================================================================
  -- Input Validation
  -- ============================================================================

  -- Validate weld_type
  IF p_weld_type NOT IN ('BW', 'SW', 'FW', 'TW') THEN
    RAISE EXCEPTION 'Invalid weld type: Must be BW, SW, FW, or TW'
      USING ERRCODE = '23514'; -- check_violation
  END IF;

  -- Validate xray_percentage
  IF p_xray_percentage IS NOT NULL AND (p_xray_percentage < 0 OR p_xray_percentage > 100) THEN
    RAISE EXCEPTION 'Invalid xray_percentage: Must be between 0 and 100'
      USING ERRCODE = '23514'; -- check_violation
  END IF;

  -- Validate required fields
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
      USING ERRCODE = '02000'; -- no_data
  END IF;

  IF v_drawing_record.project_id != p_project_id THEN
    RAISE EXCEPTION 'Drawing does not belong to project'
      USING ERRCODE = '23503'; -- foreign_key_violation
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
      USING ERRCODE = '23505'; -- unique_violation
  END IF;

  -- ============================================================================
  -- Progress Template Lookup
  -- ============================================================================

  SELECT id INTO v_progress_template_id
  FROM progress_templates
  WHERE component_type = 'field_weld'
  LIMIT 1;

  IF v_progress_template_id IS NULL THEN
    RAISE EXCEPTION 'Progress template not found for field_weld component type'
      USING ERRCODE = '02000'; -- no_data
  END IF;

  -- ============================================================================
  -- Atomic Transaction: Create Component and Field Weld
  -- ============================================================================

  -- Generate UUIDs
  v_component_id := gen_random_uuid();
  v_field_weld_id := gen_random_uuid();

  -- Insert component record
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
    '{}'::jsonb, -- All milestones start as incomplete
    0.00, -- 0% complete initially
    v_user_id,
    v_user_id,
    now()
  );

  -- Insert field_weld record
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
    false, -- NDE not required by default
    'active', -- Default status
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
    -- Transaction will auto-rollback on exception
    RAISE;
END;
$$;

COMMENT ON FUNCTION create_unplanned_weld IS
'Creates an unplanned field weld with atomic component creation.

Permissions: Owner, Admin, Project Manager, Foreman, QC Inspector
Returns: JSON with field_weld and component records
Raises: Exception if permissions denied, duplicate weld number, or invalid references

Parameters:
  - p_xray_percentage: X-ray percentage (default 5.0 = 5%)
    Common values: 5.0, 10.0, 100.0

Example usage:
SELECT create_unplanned_weld(
  p_project_id := ''project-uuid'',
  p_drawing_id := ''drawing-uuid'',
  p_weld_number := ''W-051'',
  p_weld_type := ''BW'',
  p_weld_size := ''2"'',
  p_spec := ''HC05'',
  p_schedule := ''XS'',
  p_base_metal := ''CS'',
  p_xray_percentage := 5.0,
  p_notes := ''Field change per client request''
);

Feature: 028-add-unplanned-welds
Created: 2025-11-17
Updated: 2025-11-24 (fixed role names: qc to qc_inspector, pm to project_manager)
';

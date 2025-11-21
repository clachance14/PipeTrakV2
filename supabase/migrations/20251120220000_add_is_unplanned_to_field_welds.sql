-- Migration: Add is_unplanned flag to field_welds
-- Feature: Unplanned weld notes requirement
-- Created: 2025-11-20
--
-- Purpose: Add is_unplanned boolean column to track welds created as unplanned
--          and enforce notes requirement for unplanned welds.
--
-- Changes:
-- 1. Add is_unplanned BOOLEAN column to field_welds table
-- 2. Add CHECK constraint requiring notes for unplanned welds
-- 3. Update create_unplanned_weld() RPC to set is_unplanned = true
-- 4. Add validation for notes in RPC function

-- ============================================================================
-- Step 1: Add is_unplanned column to field_welds table
-- ============================================================================

ALTER TABLE field_welds
ADD COLUMN IF NOT EXISTS is_unplanned BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN field_welds.is_unplanned IS
'Indicates whether this weld was created as an unplanned weld (true) or was part of the original design/import (false). Unplanned welds require notes to document the reason for creation.';

-- ============================================================================
-- Step 2: Add CHECK constraint requiring notes for unplanned welds
-- ============================================================================

-- Drop constraint if it exists (for safe re-runs)
ALTER TABLE field_welds
DROP CONSTRAINT IF EXISTS field_welds_unplanned_notes_required;

-- Add constraint: if is_unplanned = true, notes must be non-null and non-empty
ALTER TABLE field_welds
ADD CONSTRAINT field_welds_unplanned_notes_required
CHECK (
  is_unplanned = false OR
  (is_unplanned = true AND notes IS NOT NULL AND trim(notes) != '')
);

-- ============================================================================
-- Step 3: Update create_unplanned_weld RPC function
-- ============================================================================

CREATE OR REPLACE FUNCTION create_unplanned_weld(
  p_project_id UUID,
  p_drawing_id UUID,
  p_weld_number TEXT,
  p_weld_type TEXT,
  p_weld_size TEXT,
  p_spec TEXT,
  p_schedule TEXT DEFAULT NULL,
  p_base_metal TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
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
  IF v_user_role NOT IN ('owner', 'admin', 'pm', 'foreman', 'qc') THEN
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

  -- NEW: Validate notes are provided for unplanned welds
  IF p_notes IS NULL OR trim(p_notes) = '' THEN
    RAISE EXCEPTION 'Notes are required for unplanned welds. Please provide a reason for creating this weld (e.g., "Field change per client request").'
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

  -- Insert field_weld record (NEW: set is_unplanned = true)
  INSERT INTO field_welds (
    id,
    component_id,
    project_id,
    weld_type,
    weld_size,
    spec,
    schedule,
    base_metal,
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
    p_notes,
    true, -- NEW: Mark as unplanned weld
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

-- ============================================================================
-- Step 4: Update Function Documentation
-- ============================================================================

COMMENT ON FUNCTION create_unplanned_weld IS
'Creates an unplanned field weld with atomic component creation.

Permissions: Owner, Admin, PM, Foreman, QC Inspector
Returns: JSON with field_weld and component records
Raises: Exception if permissions denied, duplicate weld number, invalid references, or notes missing

IMPORTANT: Notes are REQUIRED for unplanned welds to document the reason for creation.

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
  p_notes := ''Field change per client request - reroute to avoid interference''
);

Feature: 028-add-unplanned-welds (enhanced)
Updated: 2025-11-20
';

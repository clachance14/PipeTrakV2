-- Migration 00027: Fix Single Drawing Assignment to Support NO_CHANGE
-- Feature 011: Drawing & Component Metadata Assignment UI
-- Purpose: Prevent overwriting existing metadata when user only wants to change one field
-- Issue: assign_drawing_with_inheritance unconditionally updates all fields, treating NULL as "set to NULL"
--        instead of "don't change". This causes existing area/system to be cleared when adding test package.

-- ============================================================================
-- Drop old function signature (UUID parameters)
-- ============================================================================
DROP FUNCTION IF EXISTS assign_drawing_with_inheritance(UUID, UUID, UUID, UUID, UUID);

-- ============================================================================
-- Function: assign_drawing_with_inheritance (FIXED with NO_CHANGE support)
-- ============================================================================
-- Now accepts TEXT parameters to support sentinel values:
--   - 'NO_CHANGE' = preserve existing value (don't update)
--   - NULL or empty string = explicitly clear the field (set to NULL)
--   - UUID string = set to that UUID value
--
-- This allows single-drawing mode to work like bulk mode, where users can
-- selectively update only the fields they want to change.

CREATE OR REPLACE FUNCTION assign_drawing_with_inheritance(
  p_drawing_id UUID,
  p_area_id TEXT DEFAULT NULL,
  p_system_id TEXT DEFAULT NULL,
  p_test_package_id TEXT DEFAULT NULL,
  p_user_id UUID DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_area_inherited INTEGER := 0;
  v_system_inherited INTEGER := 0;
  v_package_inherited INTEGER := 0;
  v_area_kept INTEGER := 0;
  v_system_kept INTEGER := 0;
  v_package_kept INTEGER := 0;
  v_result JSONB;
  v_current_area_id UUID;
  v_current_system_id UUID;
  v_current_test_package_id UUID;
  v_new_area_id UUID;
  v_new_system_id UUID;
  v_new_test_package_id UUID;
BEGIN
  -- Fetch current drawing values (needed for NO_CHANGE handling)
  SELECT area_id, system_id, test_package_id
  INTO v_current_area_id, v_current_system_id, v_current_test_package_id
  FROM drawings
  WHERE id = p_drawing_id;

  -- Determine new values based on parameters:
  -- 'NO_CHANGE' = keep current value
  -- NULL or empty = set to NULL
  -- UUID string = set to that UUID
  v_new_area_id := CASE
    WHEN p_area_id = 'NO_CHANGE' THEN v_current_area_id
    WHEN p_area_id IS NULL OR p_area_id = '' THEN NULL
    ELSE p_area_id::UUID
  END;

  v_new_system_id := CASE
    WHEN p_system_id = 'NO_CHANGE' THEN v_current_system_id
    WHEN p_system_id IS NULL OR p_system_id = '' THEN NULL
    ELSE p_system_id::UUID
  END;

  v_new_test_package_id := CASE
    WHEN p_test_package_id = 'NO_CHANGE' THEN v_current_test_package_id
    WHEN p_test_package_id IS NULL OR p_test_package_id = '' THEN NULL
    ELSE p_test_package_id::UUID
  END;

  -- Update drawing metadata with resolved values
  UPDATE drawings
  SET area_id = v_new_area_id,
      system_id = v_new_system_id,
      test_package_id = v_new_test_package_id
  WHERE id = p_drawing_id;

  -- Count components before update for tracking
  -- Components that will inherit (currently NULL and new value is not NULL)
  SELECT
    COUNT(*) FILTER (WHERE area_id IS NULL AND v_new_area_id IS NOT NULL),
    COUNT(*) FILTER (WHERE system_id IS NULL AND v_new_system_id IS NOT NULL),
    COUNT(*) FILTER (WHERE test_package_id IS NULL AND v_new_test_package_id IS NOT NULL)
  INTO v_area_inherited, v_system_inherited, v_package_inherited
  FROM components
  WHERE drawing_id = p_drawing_id;

  -- Components that will keep existing values (not NULL)
  SELECT
    COUNT(*) FILTER (WHERE area_id IS NOT NULL),
    COUNT(*) FILTER (WHERE system_id IS NOT NULL),
    COUNT(*) FILTER (WHERE test_package_id IS NOT NULL)
  INTO v_area_kept, v_system_kept, v_package_kept
  FROM components
  WHERE drawing_id = p_drawing_id;

  -- Inherit to components where fields are NULL
  -- Uses COALESCE to only update NULL fields
  UPDATE components
  SET area_id = COALESCE(area_id, v_new_area_id),
      system_id = COALESCE(system_id, v_new_system_id),
      test_package_id = COALESCE(test_package_id, v_new_test_package_id)
  WHERE drawing_id = p_drawing_id
    AND (area_id IS NULL OR system_id IS NULL OR test_package_id IS NULL);

  -- Return summary with total inherited count
  v_result := jsonb_build_object(
    'drawing_updated', true,
    'components_inherited', v_area_inherited + v_system_inherited + v_package_inherited,
    'components_kept_existing', GREATEST(v_area_kept, v_system_kept, v_package_kept)
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION assign_drawing_with_inheritance IS
'Assigns metadata (area, system, test_package) to a drawing and inherits to components with NULL values. Supports NO_CHANGE sentinel to preserve existing values. Fixed in migration 00027.';

-- ============================================================================
-- Note: assign_drawings_bulk function already works correctly
-- ============================================================================
-- The bulk function already handles 'NO_CHANGE' properly via TEXT parameters
-- and calls assign_drawing_with_inheritance, so it will now benefit from
-- this fix automatically.

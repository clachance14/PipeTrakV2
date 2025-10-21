-- Migration 00026: Fix Drawing Assignment RPC Functions
-- Feature 011: Drawing & Component Metadata Assignment UI
-- Purpose: Remove references to non-existent updated_at/updated_by columns in drawings table
-- Issue: Migration 00024 included these columns but drawings table doesn't have them

-- ============================================================================
-- Function 1: assign_drawing_with_inheritance (FIXED)
-- ============================================================================

CREATE OR REPLACE FUNCTION assign_drawing_with_inheritance(
  p_drawing_id UUID,
  p_area_id UUID DEFAULT NULL,
  p_system_id UUID DEFAULT NULL,
  p_test_package_id UUID DEFAULT NULL,
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
BEGIN
  -- Update drawing metadata (FIXED: removed updated_at and updated_by)
  UPDATE drawings
  SET area_id = p_area_id,
      system_id = p_system_id,
      test_package_id = p_test_package_id
  WHERE id = p_drawing_id;

  -- Count components before update for tracking
  -- Components that will inherit (currently NULL)
  SELECT
    COUNT(*) FILTER (WHERE area_id IS NULL AND p_area_id IS NOT NULL),
    COUNT(*) FILTER (WHERE system_id IS NULL AND p_system_id IS NOT NULL),
    COUNT(*) FILTER (WHERE test_package_id IS NULL AND p_test_package_id IS NOT NULL)
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
  -- FIXED: removed updated_at and updated_by from components update
  UPDATE components
  SET area_id = COALESCE(area_id, p_area_id),
      system_id = COALESCE(system_id, p_system_id),
      test_package_id = COALESCE(test_package_id, p_test_package_id)
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
'Assigns metadata (area, system, test_package) to a drawing and inherits to components with NULL values. Returns JSONB summary. Fixed in migration 00026 to remove updated_at/updated_by columns.';

-- ============================================================================
-- Note: assign_drawings_bulk function doesn't need changes
-- ============================================================================
-- The bulk function calls assign_drawing_with_inheritance, so fixing the single
-- function above automatically fixes the bulk operation as well.

-- Migration 00024: Drawing Assignment RPC Functions
-- Feature 011: Drawing & Component Metadata Assignment UI
-- Purpose: Add RPC functions for single and bulk drawing assignment with inheritance logic

-- ============================================================================
-- Function 1: assign_drawing_with_inheritance
-- ============================================================================
-- Assigns metadata to a single drawing and propagates to components with NULL values
-- Returns summary of what changed (components inherited vs kept existing)

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
  -- Update drawing metadata
  UPDATE drawings
  SET area_id = p_area_id,
      system_id = p_system_id,
      test_package_id = p_test_package_id,
      updated_at = NOW(),
      updated_by = p_user_id
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
  UPDATE components
  SET area_id = COALESCE(area_id, p_area_id),
      system_id = COALESCE(system_id, p_system_id),
      test_package_id = COALESCE(test_package_id, p_test_package_id),
      updated_at = NOW(),
      updated_by = p_user_id
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

-- Add comment for documentation
COMMENT ON FUNCTION assign_drawing_with_inheritance IS
'Assigns metadata (area, system, test_package) to a drawing and inherits to components with NULL values. Returns JSONB summary.';

-- ============================================================================
-- Function 2: assign_drawings_bulk
-- ============================================================================
-- Assigns metadata to multiple drawings in a single transaction
-- Supports 'NO_CHANGE' string literal to preserve existing values

CREATE OR REPLACE FUNCTION assign_drawings_bulk(
  p_drawing_ids UUID[],
  p_area_id TEXT DEFAULT NULL,
  p_system_id TEXT DEFAULT NULL,
  p_test_package_id TEXT DEFAULT NULL,
  p_user_id UUID DEFAULT NULL
) RETURNS JSONB[] AS $$
DECLARE
  v_results JSONB[] := '{}';
  v_drawing_id UUID;
  v_area_uuid UUID;
  v_system_uuid UUID;
  v_package_uuid UUID;
BEGIN
  -- Convert TEXT to UUID, handling 'NO_CHANGE' sentinel
  v_area_uuid := CASE
    WHEN p_area_id = 'NO_CHANGE' OR p_area_id IS NULL THEN NULL
    ELSE p_area_id::UUID
  END;

  v_system_uuid := CASE
    WHEN p_system_id = 'NO_CHANGE' OR p_system_id IS NULL THEN NULL
    ELSE p_system_id::UUID
  END;

  v_package_uuid := CASE
    WHEN p_test_package_id = 'NO_CHANGE' OR p_test_package_id IS NULL THEN NULL
    ELSE p_test_package_id::UUID
  END;

  -- Loop through each drawing and call single assignment function
  FOREACH v_drawing_id IN ARRAY p_drawing_ids
  LOOP
    -- Handle 'NO_CHANGE' by fetching current values
    IF p_area_id = 'NO_CHANGE' OR p_system_id = 'NO_CHANGE' OR p_test_package_id = 'NO_CHANGE' THEN
      -- Get current drawing values
      WITH current_values AS (
        SELECT area_id, system_id, test_package_id
        FROM drawings
        WHERE id = v_drawing_id
      )
      SELECT
        CASE WHEN p_area_id = 'NO_CHANGE' THEN cv.area_id ELSE v_area_uuid END,
        CASE WHEN p_system_id = 'NO_CHANGE' THEN cv.system_id ELSE v_system_uuid END,
        CASE WHEN p_test_package_id = 'NO_CHANGE' THEN cv.test_package_id ELSE v_package_uuid END
      INTO v_area_uuid, v_system_uuid, v_package_uuid
      FROM current_values cv;
    END IF;

    -- Call single assignment function
    v_results := array_append(v_results, assign_drawing_with_inheritance(
      v_drawing_id,
      v_area_uuid,
      v_system_uuid,
      v_package_uuid,
      p_user_id
    ));
  END LOOP;

  RETURN v_results;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment for documentation
COMMENT ON FUNCTION assign_drawings_bulk IS
'Bulk assigns metadata to multiple drawings with inheritance. Supports NO_CHANGE string to preserve existing values. Returns array of JSONB summaries.';

-- ============================================================================
-- Permissions
-- ============================================================================
-- Both functions use SECURITY DEFINER and rely on existing RLS policies
-- on drawings and components tables to enforce access control

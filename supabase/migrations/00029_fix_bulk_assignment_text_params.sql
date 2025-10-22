-- Migration 00029: Fix Bulk Assignment to Use TEXT Parameters
-- Feature 011: Drawing & Component Metadata Assignment UI
-- Purpose: Update assign_drawings_bulk to cast UUID to TEXT when calling assign_drawing_with_inheritance
-- Issue: Migration 00027 changed assign_drawing_with_inheritance to accept TEXT params,
--        but assign_drawings_bulk still passes UUID variables, causing:
--        "function assign_drawing_with_inheritance(uuid, uuid, uuid, uuid, uuid) does not exist"

-- ============================================================================
-- Function: assign_drawings_bulk (FIXED to pass TEXT parameters)
-- ============================================================================

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

    -- FIXED: Cast UUID variables to TEXT before passing to assign_drawing_with_inheritance
    -- The function signature changed in migration 00027 from (UUID, UUID, UUID, UUID, UUID)
    -- to (UUID, TEXT, TEXT, TEXT, UUID)
    v_results := array_append(v_results, assign_drawing_with_inheritance(
      v_drawing_id,
      v_area_uuid::TEXT,           -- Cast UUID to TEXT
      v_system_uuid::TEXT,         -- Cast UUID to TEXT
      v_package_uuid::TEXT,        -- Cast UUID to TEXT
      p_user_id
    ));
  END LOOP;

  RETURN v_results;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION assign_drawings_bulk IS
'Bulk assigns metadata to multiple drawings with inheritance. Supports NO_CHANGE string to preserve existing values. Fixed in migration 00029 to cast UUID to TEXT parameters.';

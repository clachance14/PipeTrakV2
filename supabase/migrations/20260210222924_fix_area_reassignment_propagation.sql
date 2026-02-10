-- Migration: Fix area reassignment propagation in assign_drawing_with_inheritance
--
-- Bug: When a drawing's area is changed (e.g., from "Tidal Road Crossing" to
--       "North Pipe Rack"), the COALESCE logic only filled NULL area_ids on
--       components. Components that already had an area_id from a previous
--       assignment kept the old value, causing area report mismatches.
--
-- Fix:
--   1. Change assign_drawing_with_inheritance to unconditionally set area_id
--      on all components when a drawing's area changes (not just NULLs)
--   2. Same fix for system_id and test_package_id
--   3. Backfill: sync components metadata from drawings where mismatched

-- ============================================================================
-- PART 1: Fix assign_drawing_with_inheritance
-- ============================================================================
-- Note: drawings table has no updated_at/updated_by columns (see 00026)
-- Note: components table uses last_updated_at / last_updated_by

CREATE OR REPLACE FUNCTION assign_drawing_with_inheritance(
  p_drawing_id UUID,
  p_area_id UUID DEFAULT NULL,
  p_system_id UUID DEFAULT NULL,
  p_test_package_id UUID DEFAULT NULL,
  p_user_id UUID DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_old_area_id UUID;
  v_old_system_id UUID;
  v_old_package_id UUID;
  v_area_updated INTEGER := 0;
  v_system_updated INTEGER := 0;
  v_package_updated INTEGER := 0;
  v_result JSONB;
BEGIN
  -- Get current drawing metadata to detect changes
  SELECT area_id, system_id, test_package_id
  INTO v_old_area_id, v_old_system_id, v_old_package_id
  FROM drawings
  WHERE id = p_drawing_id;

  -- Update drawing metadata (no updated_at on drawings table)
  UPDATE drawings
  SET area_id = p_area_id,
      system_id = p_system_id,
      test_package_id = p_test_package_id
  WHERE id = p_drawing_id;

  -- Propagate area_id to ALL components on this drawing when area changed
  -- (Previously used COALESCE which only filled NULLs — now overwrites all)
  IF p_area_id IS DISTINCT FROM v_old_area_id THEN
    UPDATE components
    SET area_id = p_area_id,
        last_updated_at = NOW(),
        last_updated_by = p_user_id
    WHERE drawing_id = p_drawing_id
      AND (area_id IS DISTINCT FROM p_area_id);

    GET DIAGNOSTICS v_area_updated = ROW_COUNT;
  END IF;

  -- Propagate system_id to ALL components on this drawing when system changed
  IF p_system_id IS DISTINCT FROM v_old_system_id THEN
    UPDATE components
    SET system_id = p_system_id,
        last_updated_at = NOW(),
        last_updated_by = p_user_id
    WHERE drawing_id = p_drawing_id
      AND (system_id IS DISTINCT FROM p_system_id);

    GET DIAGNOSTICS v_system_updated = ROW_COUNT;
  END IF;

  -- Propagate test_package_id to ALL components on this drawing when package changed
  IF p_test_package_id IS DISTINCT FROM v_old_package_id THEN
    UPDATE components
    SET test_package_id = p_test_package_id,
        last_updated_at = NOW(),
        last_updated_by = p_user_id
    WHERE drawing_id = p_drawing_id
      AND (test_package_id IS DISTINCT FROM p_test_package_id);

    GET DIAGNOSTICS v_package_updated = ROW_COUNT;
  END IF;

  -- Return summary
  v_result := jsonb_build_object(
    'drawing_updated', true,
    'components_inherited', v_area_updated + v_system_updated + v_package_updated,
    'components_kept_existing', 0
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION assign_drawing_with_inheritance(UUID, UUID, UUID, UUID, UUID) IS
'Assigns metadata (area, system, test_package) to a drawing and propagates changes to ALL components on that drawing. Returns JSONB summary.';


-- ============================================================================
-- PART 2: Data backfill — sync components metadata from drawings
-- ============================================================================
-- Fix any component whose area_id doesn't match its drawing's area_id

UPDATE components c
SET area_id = d.area_id,
    last_updated_at = NOW()
FROM drawings d
WHERE c.drawing_id = d.id
  AND d.area_id IS NOT NULL
  AND c.area_id IS DISTINCT FROM d.area_id;

-- Also sync system_id
UPDATE components c
SET system_id = d.system_id,
    last_updated_at = NOW()
FROM drawings d
WHERE c.drawing_id = d.id
  AND d.system_id IS NOT NULL
  AND c.system_id IS DISTINCT FROM d.system_id;

-- Also sync test_package_id
UPDATE components c
SET test_package_id = d.test_package_id,
    last_updated_at = NOW()
FROM drawings d
WHERE c.drawing_id = d.id
  AND d.test_package_id IS NOT NULL
  AND c.test_package_id IS DISTINCT FROM d.test_package_id;

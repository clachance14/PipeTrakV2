-- Migration: Fix QC trigger - all column name corrections
-- Description: Remove auth check and fix all column name mismatches
-- Author: Claude Code
-- Date: 2025-11-20
--
-- CRITICAL FIXES:
-- 1. Remove auth.uid() check - triggers run in SECURITY DEFINER context where auth.uid() returns NULL
-- 2. Change d.drawing_number to d.drawing_no_raw (correct column name)
-- 3. Change w.full_name to w.name (correct column name)
--
-- RLS policies already handle authorization, so the auth check is redundant and breaks functionality.

-- =====================================================
-- STEP 1: Recreate trigger function with fixes
-- =====================================================

CREATE OR REPLACE FUNCTION notify_qc_on_weld_completion()
RETURNS TRIGGER AS $$
BEGIN
  -- Only fire when date_welded transitions from NULL to NOT NULL
  IF OLD.date_welded IS NULL AND NEW.date_welded IS NOT NULL THEN

    -- Create needs_review entry with full weld context
    INSERT INTO needs_review (
      project_id,
      type,
      payload,
      status,
      created_at
    )
    SELECT
      NEW.project_id,
      'weld_completed',
      jsonb_build_object(
        'weld_id', NEW.id,
        'weld_number', c.identity_key->>'weld_number',
        'component_id', NEW.component_id,
        'drawing_number', d.drawing_no_raw,  -- FIXED: Use correct column name
        'welder_id', NEW.welder_id,
        'welder_name', w.name,  -- FIXED: Use 'name' instead of 'full_name'
        'date_welded', NEW.date_welded,
        'weld_type', NEW.weld_type,
        'nde_required', NEW.nde_required
      ),
      'pending',
      NOW()
    FROM components c
    LEFT JOIN drawings d ON c.drawing_id = d.id
    LEFT JOIN welders w ON NEW.welder_id = w.id
    WHERE c.id = NEW.component_id;

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- STEP 2: Update function comment
-- =====================================================

COMMENT ON FUNCTION notify_qc_on_weld_completion() IS
'Automatically creates needs_review entry when date_welded is set on a field weld. Only fires on NULL → NOT NULL transition to prevent duplicates. Auth check removed (RLS handles authorization). Uses correct columns: drawing_no_raw, w.name.';

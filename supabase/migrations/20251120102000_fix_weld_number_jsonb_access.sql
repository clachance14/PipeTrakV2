-- Migration: Fix weld_number JSONB access in QC notification trigger
-- Description: Correct the weld_number reference to use identity_key->>'weld_number' instead of non-existent column
-- Author: Claude Code
-- Date: 2025-11-20

-- =====================================================
-- STEP 1: Recreate trigger function with correct JSONB access
-- =====================================================

CREATE OR REPLACE FUNCTION notify_qc_on_weld_completion()
RETURNS TRIGGER AS $$
BEGIN
  -- Verify user is authorized to update field welds
  IF NOT EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role IN ('owner', 'admin', 'project_manager', 'foreman', 'qc_inspector')
  ) THEN
    RAISE EXCEPTION 'Unauthorized: user cannot update field welds';
  END IF;

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
        'weld_number', c.identity_key->>'weld_number',  -- FIXED: Access JSONB field correctly
        'component_id', NEW.component_id,
        'drawing_number', d.drawing_number,
        'welder_id', NEW.welder_id,
        'welder_name', w.full_name,
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
'Automatically creates needs_review entry when date_welded is set on a field weld. Only fires on NULL → NOT NULL transition to prevent duplicates. FIXED: Uses identity_key->>''weld_number'' for correct JSONB access.';

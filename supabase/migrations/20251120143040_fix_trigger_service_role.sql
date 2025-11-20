-- Migration: Fix QC Trigger Service-Role Auth
-- Description: Allow service-role operations (imports, demo population) to bypass auth check
-- Author: Claude Code
-- Date: 2025-11-20

-- =====================================================
-- Recreate trigger function with service-role exemption
-- =====================================================

CREATE OR REPLACE FUNCTION notify_qc_on_weld_completion()
RETURNS TRIGGER AS $$
BEGIN
  -- Only check authorization if user context exists (auth.uid() IS NOT NULL)
  -- Service-role operations (auth.uid() = NULL) are exempt
  IF auth.uid() IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role IN ('owner', 'admin', 'project_manager', 'foreman', 'qc_inspector')
    ) THEN
      RAISE EXCEPTION 'Unauthorized: user cannot update field welds';
    END IF;
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
        'weld_number', c.identity_key->>'weld_number',
        'component_id', NEW.component_id,
        'drawing_number', d.drawing_no_raw,
        'welder_id', NEW.welder_id,
        'welder_name', w.name,
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

COMMENT ON FUNCTION notify_qc_on_weld_completion() IS
'Automatically creates needs_review entry when date_welded is set on a field weld. Only fires on NULL → NOT NULL transition to prevent duplicates. Allows service-role operations (imports, demo population) to bypass auth check.';

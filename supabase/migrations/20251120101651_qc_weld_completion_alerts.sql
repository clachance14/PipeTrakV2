-- Migration: QC Weld Completion Alerts
-- Description: Automatically notify QC inspectors when date_welded is set on field welds
-- Author: Claude Code
-- Date: 2025-11-20

-- =====================================================
-- STEP 0: Update needs_review type constraint
-- =====================================================

-- Drop existing constraint
ALTER TABLE needs_review DROP CONSTRAINT IF EXISTS needs_review_type_check;

-- Add updated constraint with weld_completed
ALTER TABLE needs_review ADD CONSTRAINT needs_review_type_check
CHECK (type IN (
  'out_of_sequence',
  'rollback',
  'delta_quantity',
  'drawing_change',
  'similar_drawing',
  'verify_welder',
  'weld_completed'  -- NEW type
));

-- =====================================================
-- STEP 1: Update RLS SELECT policy on needs_review
-- =====================================================

-- Drop existing policy (if exists)
DROP POLICY IF EXISTS "Users can view needs_review in their organization" ON needs_review;

-- Create updated policy with weld_completed filtering
CREATE POLICY "Users can view needs_review in their organization" ON needs_review
FOR SELECT USING (
  -- User must be in same organization as project
  auth.uid() IN (
    SELECT id FROM users
    WHERE organization_id = (
      SELECT organization_id FROM projects
      WHERE id = needs_review.project_id
    )
  )
  AND (
    -- Non-QC review types: visible to everyone in org
    type != 'weld_completed'
    OR
    -- weld_completed type: only visible to QC inspectors
    (type = 'weld_completed' AND auth.uid() IN (
      SELECT id FROM users WHERE role = 'qc_inspector'
    ))
  )
);

-- =====================================================
-- STEP 2: Create trigger function
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
        'weld_number', c.weld_number,
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
-- STEP 3: Register trigger
-- =====================================================

DROP TRIGGER IF EXISTS weld_completion_notification ON field_welds;

CREATE TRIGGER weld_completion_notification
AFTER UPDATE ON field_welds
FOR EACH ROW
EXECUTE FUNCTION notify_qc_on_weld_completion();

-- =====================================================
-- STEP 4: Add helpful comment
-- =====================================================

COMMENT ON FUNCTION notify_qc_on_weld_completion() IS
'Automatically creates needs_review entry when date_welded is set on a field weld. Only fires on NULL → NOT NULL transition to prevent duplicates.';

COMMENT ON TRIGGER weld_completion_notification ON field_welds IS
'Notifies QC inspectors via needs_review queue when weld completion date is recorded.';

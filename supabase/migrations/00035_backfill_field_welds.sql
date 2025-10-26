-- Migration 00035: Backfill missing field_welds records
-- Issue: 12 field_weld components exist but have no corresponding field_welds records
-- Cause: Bug in takeoff import workflow (Feature 009)
-- Fix: Create field_welds records for all orphaned field_weld components

-- Insert field_welds records for all field_weld components that don't have them yet
INSERT INTO field_welds (
  component_id,
  project_id,
  weld_type,
  weld_size,
  schedule,
  base_metal,
  spec,
  welder_id,
  date_welded,
  nde_required,
  nde_type,
  nde_result,
  nde_date,
  nde_notes,
  status,
  original_weld_id,
  created_by,
  created_at,
  updated_at
)
SELECT
  c.id AS component_id,
  c.project_id,
  'BW' AS weld_type,  -- Default to Butt Weld (most common type)
  NULL AS weld_size,
  NULL AS schedule,
  NULL AS base_metal,
  NULL AS spec,
  NULL AS welder_id,
  NULL AS date_welded,
  false AS nde_required,
  NULL AS nde_type,
  NULL AS nde_result,
  NULL AS nde_date,
  NULL AS nde_notes,
  'active' AS status,
  NULL AS original_weld_id,
  -- Use created_by from component if available, otherwise use first user from project's organization
  COALESCE(
    c.created_by,
    (SELECT u.id FROM users u
     JOIN projects p ON p.organization_id = u.organization_id
     WHERE p.id = c.project_id
     LIMIT 1)
  ) AS created_by,
  c.created_at,
  c.created_at AS updated_at
FROM components c
WHERE c.component_type = 'field_weld'
  AND NOT EXISTS (
    SELECT 1 FROM field_welds fw
    WHERE fw.component_id = c.id
  );

-- Verify the backfill
DO $$
DECLARE
  component_count INTEGER;
  field_weld_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO component_count
  FROM components
  WHERE component_type = 'field_weld';

  SELECT COUNT(*) INTO field_weld_count
  FROM field_welds;

  RAISE NOTICE 'Backfill complete:';
  RAISE NOTICE '  field_weld components: %', component_count;
  RAISE NOTICE '  field_welds records: %', field_weld_count;

  IF component_count != field_weld_count THEN
    RAISE WARNING 'Mismatch detected! % components but % field_welds records', component_count, field_weld_count;
  ELSE
    RAISE NOTICE '  ✓ All field_weld components now have corresponding field_welds records';
  END IF;
END $$;

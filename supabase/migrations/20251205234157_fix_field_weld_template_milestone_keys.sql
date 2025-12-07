-- Migration: Fix Field Weld Template Milestone Keys
-- Feature: 033-timeline-report-filter
--
-- Problem: progress_templates uses old milestone names (Fit-Up, Weld Made)
-- but components.current_milestones uses new names (Fit-up, Weld Complete).
-- This causes percent_complete calculations to miss 70% of the weight.
--
-- Root Cause: Migration 20251124191721 renamed keys in components but not in templates.
--
-- Fix: Update progress_templates.milestones_config for field_weld to use new names.
-- Also update milestone_events to use new names for consistency.

-- Step 1: Update progress_templates for field_weld
UPDATE progress_templates
SET milestones_config = '[
  {"name": "Fit-up", "order": 1, "weight": 10, "is_partial": false, "requires_welder": false},
  {"name": "Weld Complete", "order": 2, "weight": 60, "is_partial": false, "requires_welder": true},
  {"name": "Punch", "order": 3, "weight": 10, "is_partial": false, "requires_welder": false},
  {"name": "Test", "order": 4, "weight": 15, "is_partial": false, "requires_welder": false},
  {"name": "Restore", "order": 5, "weight": 5, "is_partial": false, "requires_welder": false}
]'::jsonb
WHERE component_type = 'field_weld';

-- Step 2: Update milestone_events to use new key names
-- This ensures future delta calculations match the template
UPDATE milestone_events
SET milestone_name = 'Fit-up'
WHERE milestone_name = 'Fit-Up';

UPDATE milestone_events
SET milestone_name = 'Weld Complete'
WHERE milestone_name = 'Weld Made';

-- Step 3: Update project_progress_templates if any exist for field_weld
UPDATE project_progress_templates
SET milestone_name = 'Fit-up'
WHERE milestone_name = 'Fit-Up'
  AND component_type = 'field_weld';

UPDATE project_progress_templates
SET milestone_name = 'Weld Complete'
WHERE milestone_name = 'Weld Made'
  AND component_type = 'field_weld';

-- Step 4: Update the get_milestone_standard_category function to handle new names
CREATE OR REPLACE FUNCTION get_milestone_standard_category(
  p_component_type TEXT,
  p_milestone_name TEXT
) RETURNS TEXT AS $$
BEGIN
  CASE LOWER(p_milestone_name)
    -- RECEIVE category
    WHEN 'receive' THEN RETURN 'receive';

    -- INSTALL category (varies by component type)
    WHEN 'fit-up' THEN RETURN 'install';
    WHEN 'weld made' THEN RETURN 'install';
    WHEN 'weld complete' THEN RETURN 'install';
    WHEN 'install' THEN RETURN 'install';
    WHEN 'erect' THEN RETURN 'install';
    WHEN 'connect' THEN RETURN 'install';
    WHEN 'fabricate' THEN RETURN 'install';
    WHEN 'support' THEN RETURN 'install';

    -- PUNCH category
    WHEN 'punch' THEN RETURN 'punch';
    WHEN 'punch complete' THEN RETURN 'punch';
    WHEN 'repair complete' THEN RETURN 'punch';

    -- TEST category
    WHEN 'hydrotest' THEN RETURN 'test';
    WHEN 'nde final' THEN RETURN 'test';
    WHEN 'test' THEN RETURN 'test';

    -- RESTORE category
    WHEN 'restore' THEN RETURN 'restore';
    WHEN 'insulate' THEN RETURN 'restore';
    WHEN 'paint' THEN RETURN 'restore';
    WHEN 'turnover' THEN RETURN 'restore';

    ELSE RETURN NULL;
  END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Verify the fix
DO $$
DECLARE
  v_template_keys TEXT[];
  v_event_keys TEXT[];
BEGIN
  -- Get template milestone names
  SELECT ARRAY_AGG(m->>'name' ORDER BY (m->>'order')::int)
  INTO v_template_keys
  FROM progress_templates pt,
       LATERAL jsonb_array_elements(pt.milestones_config) AS m
  WHERE pt.component_type = 'field_weld'
    AND pt.version = 1;

  RAISE NOTICE 'Template milestone names: %', v_template_keys;

  -- Get unique event milestone names for field_welds
  SELECT ARRAY_AGG(DISTINCT me.milestone_name ORDER BY me.milestone_name)
  INTO v_event_keys
  FROM milestone_events me
  JOIN components c ON c.id = me.component_id
  WHERE c.component_type = 'field_weld';

  RAISE NOTICE 'Event milestone names: %', v_event_keys;
END $$;

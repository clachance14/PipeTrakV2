-- Migration: Convert current_milestones from 0/1 scale to 0/100 scale
-- Feature: 033-timeline-report-filter
--
-- Problem: components.current_milestones uses value=1 for complete DISCRETE milestones,
-- but calculate_component_percent expects value=100 (standard scale).
-- This causes the percent_complete calculation to not match actual progress.
--
-- Fix: Convert ONLY discrete milestone values from 1 to 100 in current_milestones.
-- Partial milestones (is_partial=true) keep their actual percentage values.
-- This matches the standard established in milestone_events.

-- Update discrete milestone values from 1 to 100 (and booleans to numeric)
-- IMPORTANT: Only convert value=1 for DISCRETE milestones that exist in template
-- If milestone name doesn't match template, leave it unchanged (data inconsistency)
UPDATE components c
SET current_milestones = (
  SELECT jsonb_object_agg(
    kv.key,
    CASE
      -- Convert boolean true to 100 (only for milestones that exist in template as discrete)
      WHEN jsonb_typeof(kv.value) = 'boolean'
           AND kv.value::text = 'true'
           AND EXISTS (
             SELECT 1 FROM progress_templates pt,
                          LATERAL jsonb_array_elements(pt.milestones_config) AS m(milestone)
             WHERE pt.id = c.progress_template_id
               AND m.milestone->>'name' = kv.key
               AND COALESCE((m.milestone->>'is_partial')::boolean, false) = false
           )
      THEN to_jsonb(100)
      -- Convert boolean false to 0 (only for milestones that exist in template)
      WHEN jsonb_typeof(kv.value) = 'boolean'
           AND kv.value::text = 'false'
           AND EXISTS (
             SELECT 1 FROM progress_templates pt,
                          LATERAL jsonb_array_elements(pt.milestones_config) AS m(milestone)
             WHERE pt.id = c.progress_template_id
               AND m.milestone->>'name' = kv.key
           )
      THEN to_jsonb(0)
      -- Convert numeric 1 to 100 ONLY for discrete milestones (is_partial = false)
      -- AND only if the milestone name exists in the template
      WHEN jsonb_typeof(kv.value) = 'number'
           AND (kv.value::text)::numeric = 1
           AND EXISTS (
             SELECT 1 FROM progress_templates pt,
                          LATERAL jsonb_array_elements(pt.milestones_config) AS m(milestone)
             WHERE pt.id = c.progress_template_id
               AND m.milestone->>'name' = kv.key
               AND COALESCE((m.milestone->>'is_partial')::boolean, false) = false
           )
      THEN to_jsonb(100)
      -- Keep other values as-is (0, 100, partial values, or unmatched milestones)
      ELSE kv.value
    END
  )
  FROM jsonb_each(c.current_milestones) AS kv
)
WHERE c.current_milestones IS NOT NULL
  AND c.current_milestones != '{}'::jsonb
  -- Only update if there are any values that need conversion
  AND EXISTS (
    SELECT 1 FROM jsonb_each(c.current_milestones) AS kv2
    WHERE (jsonb_typeof(kv2.value) = 'boolean')
       OR (jsonb_typeof(kv2.value) = 'number' AND (kv2.value::text)::numeric = 1)
  );

-- Recalculate percent_complete for all affected components
-- This ensures the stored percent matches the milestone state
UPDATE components c
SET percent_complete = calculate_component_percent(
  c.progress_template_id,
  c.current_milestones,
  c.project_id,
  c.component_type
)
WHERE c.current_milestones IS NOT NULL
  AND c.current_milestones != '{}'::jsonb;

-- Verify the fix
DO $$
DECLARE
  v_old_scale_count INTEGER;
  v_new_scale_count INTEGER;
  v_boolean_count INTEGER;
BEGIN
  -- Count milestones still using old scale (value = 1)
  SELECT COUNT(*) INTO v_old_scale_count
  FROM components c,
       LATERAL jsonb_each(c.current_milestones) AS kv
  WHERE jsonb_typeof(kv.value) = 'number'
    AND (kv.value::text)::numeric = 1;

  -- Count milestones using new scale (value = 100)
  SELECT COUNT(*) INTO v_new_scale_count
  FROM components c,
       LATERAL jsonb_each(c.current_milestones) AS kv
  WHERE jsonb_typeof(kv.value) = 'number'
    AND (kv.value::text)::numeric = 100;

  -- Count any remaining booleans
  SELECT COUNT(*) INTO v_boolean_count
  FROM components c,
       LATERAL jsonb_each(c.current_milestones) AS kv
  WHERE jsonb_typeof(kv.value) = 'boolean';

  IF v_old_scale_count > 0 THEN
    RAISE WARNING '% milestone values still using old scale (value=1)', v_old_scale_count;
  END IF;

  IF v_boolean_count > 0 THEN
    RAISE WARNING '% milestone values still using boolean type', v_boolean_count;
  END IF;

  IF v_old_scale_count = 0 AND v_boolean_count = 0 THEN
    RAISE NOTICE 'All milestone values converted to 100 scale. % milestones at value=100', v_new_scale_count;
  END IF;
END $$;

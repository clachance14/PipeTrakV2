-- Migration: Create Recent Activity View (SUPERSEDED by 00054 and 00055)
-- Feature: 018-activity-feed
-- Description: View joining milestone_events, components, users, drawings for activity feed
-- NOTE: This migration created the initial view skeleton. See migration 00055 for the complete implementation with formatting.

CREATE OR REPLACE VIEW vw_recent_activity AS
SELECT
  me.id,
  c.project_id,
  me.user_id,

  -- TODO T015: Replace with LATERAL unnest + string_agg pattern for multi-word names
  -- Placeholder: Extract initials from user full_name or email
  CASE
    WHEN u.full_name IS NOT NULL THEN
      -- Simple placeholder: first 2 chars of full_name (will be enhanced in T015)
      upper(substring(u.full_name, 1, 2))
    ELSE
      -- Email fallback: first 2 chars before @
      upper(substring(u.email, 1, 2))
  END as user_initials,

  -- T010: Component identity formatting for all 11 component types
  -- T011: Milestone action formatting (complete vs. partial percentage with previous value)
  -- T012: Drawing number display logic with fallback
  concat(
    u.full_name,
    ' marked ',
    me.milestone_name,
    ' ',
    -- T011: Action formatting with previous value
    CASE
      WHEN me.value = 1 THEN 'complete'
      ELSE concat('to ', (me.value * 100)::integer, '%')
    END,
    CASE
      WHEN me.previous_value IS NOT NULL AND me.previous_value < me.value THEN
        concat(' (was ', (me.previous_value * 100)::integer, '%)')
      ELSE ''
    END,
    ' for ',
    -- T010: Component identity formatting
    CASE c.component_type
      WHEN 'spool' THEN concat('Spool ', c.identity_key->>'spool_id')
      WHEN 'field_weld' THEN concat('Field Weld ', c.identity_key->>'weld_number')
      WHEN 'support' THEN concat('Support ',
                                 c.identity_key->>'commodity_code', ' ',
                                 c.identity_key->>'size')
      WHEN 'valve' THEN concat('Valve ', c.identity_key->>'tag_number')
      WHEN 'fitting' THEN concat('Fitting ', c.identity_key->>'fitting_id')
      WHEN 'flange' THEN concat('Flange ', c.identity_key->>'flange_id')
      WHEN 'instrument' THEN concat('Instrument ', c.identity_key->>'tag_number')
      WHEN 'tubing' THEN concat('Tubing ', c.identity_key->>'tubing_id')
      WHEN 'hose' THEN concat('Hose ', c.identity_key->>'hose_id')
      WHEN 'misc_component' THEN concat('Misc Component ', c.identity_key->>'component_id')
      WHEN 'threaded_pipe' THEN concat('Threaded Pipe ', c.identity_key->>'pipe_id')
      ELSE concat('Component ', c.id::text)  -- Fallback for unknown types
    END,
    -- T012: Drawing display logic
    CASE
      WHEN d.drawing_no_raw IS NOT NULL THEN concat(' on Drawing ', d.drawing_no_raw)
      ELSE ' (no drawing assigned)'
    END
  ) as description,

  me.created_at as timestamp

FROM milestone_events me
INNER JOIN components c ON me.component_id = c.id
INNER JOIN users u ON me.user_id = u.id
LEFT JOIN drawings d ON c.drawing_id = d.id

ORDER BY me.created_at DESC;

-- Grant permissions
GRANT SELECT ON vw_recent_activity TO authenticated;

-- Migration: Fix Activity View Percentage Display Bug
-- Bug: vw_recent_activity was multiplying milestone values by 100, causing "10000%" display
-- Root Cause: Values are stored as 0-100 (not 0.0-1.0), so multiplication is incorrect
-- Fix: Remove multiplication and update "complete" condition from value=1 to value=100

DROP VIEW IF EXISTS vw_recent_activity;

CREATE VIEW vw_recent_activity AS
SELECT
  me.id,
  c.project_id,
  me.user_id,

  -- User initials (placeholder - will be enhanced in T015)
  CASE
    WHEN u.full_name IS NOT NULL THEN
      upper(substring(u.full_name, 1, 2))
    ELSE
      upper(substring(u.email, 1, 2))
  END as user_initials,

  -- Component identity and milestone action formatting
  concat(
    u.full_name,
    ' marked ',
    me.milestone_name,
    ' ',
    -- FIXED: Values are stored as 0-100, not 0.0-1.0
    CASE
      WHEN me.value = 100 THEN 'complete'  -- Changed from me.value = 1
      ELSE concat('to ', me.value::integer, '%')  -- Removed * 100
    END,
    CASE
      WHEN me.previous_value IS NOT NULL AND me.previous_value < me.value THEN
        concat(' (was ', me.previous_value::integer, '%)')  -- Removed * 100
      ELSE ''
    END,
    ' for ',
    -- Component identity formatting
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
      ELSE concat('Component ', c.id::text)
    END,
    -- Drawing display logic
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

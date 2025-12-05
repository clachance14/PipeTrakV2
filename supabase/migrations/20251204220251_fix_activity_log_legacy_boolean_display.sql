-- Migration: Fix Activity Log Legacy Boolean Display
-- Issue: Old milestone records stored value=1 (boolean true) instead of value=100 (new scale)
-- This caused "Erect 1%" to display instead of "Erect complete"
-- Fix: Treat both 1 and 100 as "complete"

DROP VIEW IF EXISTS vw_recent_activity;

CREATE VIEW vw_recent_activity AS
SELECT
  me.id,
  c.project_id,
  me.user_id,

  -- User initials
  CASE
    WHEN u.full_name IS NOT NULL THEN
      upper(substring(u.full_name, 1, 2))
    ELSE
      upper(substring(u.email, 1, 2))
  END as user_initials,

  -- Activity message formatting
  concat(
    u.full_name,
    -- Verb changes based on whether it's a completion or update
    -- Treat value=1 (legacy boolean) same as value=100 (new scale)
    CASE
      WHEN me.value IN (1, 100) THEN ' marked '
      ELSE ' updated '
    END,
    -- Component identity
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
    ': ',
    me.milestone_name,
    ' ',
    -- Value display: treat both 1 (legacy boolean) and 100 as "complete"
    CASE
      WHEN me.value IN (1, 100) THEN 'complete'
      WHEN me.value = 0 THEN 'cleared'
      ELSE concat(me.value::integer, '%')
    END,
    -- Drawing display
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

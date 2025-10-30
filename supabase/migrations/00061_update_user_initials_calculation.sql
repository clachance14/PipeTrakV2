-- Migration: Update User Initials Calculation with LATERAL unnest Pattern
-- Feature: 018-activity-feed
-- Task: T015 [US4] - Implement proper multi-word name initials calculation
-- Description: Replace simple substring with LATERAL unnest + string_agg pattern
--
-- Edge Cases Handled:
-- - Multi-word names: "John Smith" → "JS"
-- - Single-word names: "Madonna" → "M"
-- - NULL full_name: Falls back to email prefix (e.g., "john@example.com" → "JO")

-- Drop and recreate the view with enhanced user_initials calculation
DROP VIEW IF EXISTS vw_recent_activity;

CREATE VIEW vw_recent_activity AS
SELECT
  me.id,
  c.project_id,
  me.user_id,

  -- T015: User initials using LATERAL unnest + string_agg pattern
  -- Handles multi-word names (e.g., "John Smith" → "JS", "Madonna" → "M")
  -- Falls back to email prefix when full_name is NULL
  CASE
    WHEN u.full_name IS NOT NULL THEN
      upper(string_agg(substring(word, 1, 1), ''))
    ELSE
      -- Email fallback: first 2 chars before @
      upper(substring(u.email, 1, 2))
  END as user_initials,

  -- Component identity and milestone action formatting
  concat(
    u.full_name,
    ' marked ',
    me.milestone_name,
    ' ',
    -- Action formatting with previous value
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
    -- Component identity formatting (corrected to match actual schema)
    -- Class-A components: spool (spool_id), field_weld (weld_number)
    -- Class-B components: support, valve, fitting, flange, instrument (commodity_code + size)
    -- Other: tubing, hose, misc_component, threaded_pipe (fallback patterns)
    CASE c.component_type
      WHEN 'spool' THEN concat('Spool ', c.identity_key->>'spool_id')
      WHEN 'field_weld' THEN concat('Field Weld ', c.identity_key->>'weld_number')
      WHEN 'support' THEN concat('Support ',
                                 c.identity_key->>'commodity_code', ' ',
                                 c.identity_key->>'size')
      WHEN 'valve' THEN concat('Valve ',
                              c.identity_key->>'commodity_code', ' ',
                              c.identity_key->>'size')
      WHEN 'fitting' THEN concat('Fitting ',
                                 c.identity_key->>'commodity_code', ' ',
                                 c.identity_key->>'size')
      WHEN 'flange' THEN concat('Flange ',
                               c.identity_key->>'commodity_code', ' ',
                               c.identity_key->>'size')
      WHEN 'instrument' THEN concat('Instrument ',
                                    c.identity_key->>'commodity_code', ' ',
                                    c.identity_key->>'size')
      WHEN 'tubing' THEN concat('Tubing ', c.identity_key->>'tubing_id')
      WHEN 'hose' THEN concat('Hose ', c.identity_key->>'hose_id')
      WHEN 'misc_component' THEN concat('Misc Component ', c.identity_key->>'component_id')
      WHEN 'threaded_pipe' THEN concat('Threaded Pipe ', c.identity_key->>'pipe_id')
      ELSE concat('Component ', c.id::text)  -- Fallback for unknown types
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
-- T015: LATERAL join for unnesting full_name into words for initials calculation
LEFT JOIN LATERAL unnest(string_to_array(u.full_name, ' ')) AS word ON true

-- T015: GROUP BY required for string_agg aggregation in user_initials
GROUP BY
  me.id,
  c.project_id,
  me.user_id,
  u.full_name,
  u.email,
  c.id,
  c.component_type,
  c.identity_key,
  d.drawing_no_raw,
  me.milestone_name,
  me.value,
  me.previous_value,
  me.created_at

ORDER BY me.created_at DESC;

-- Grant permissions
GRANT SELECT ON vw_recent_activity TO authenticated;

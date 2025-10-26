-- Migration 00034: Create field_weld progress template
-- Feature 014: Field Weld QC Module
-- 3-milestone workflow: Fit-up (30%), Weld Complete (65%), Accepted (5%)

-- Only insert if it doesn't already exist
INSERT INTO progress_templates (
  component_type,
  version,
  workflow_type,
  milestones_config
)
SELECT
  'field_weld',
  1,
  'discrete',
  '[
    {
      "name": "Fit-up",
      "weight": 30
    },
    {
      "name": "Weld Complete",
      "weight": 65
    },
    {
      "name": "Accepted",
      "weight": 5
    }
  ]'::jsonb
WHERE NOT EXISTS (
  SELECT 1 FROM progress_templates
  WHERE component_type = 'field_weld' AND version = 1
);

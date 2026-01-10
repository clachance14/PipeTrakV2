-- Migration: Revise pipe component type milestones from 2-stage discrete to 7-stage hybrid
-- Feature: 035-revise-pipe-milestones
-- Context: No production pipe components exist - clean template update

-- Insert new version (v2) of pipe template with 7 milestones
-- Weights: Receive 5%, Erect 30%, Connect 30%, Support 20%, Punch 5%, Test 5%, Restore 5% = 100%
-- Workflow: hybrid (first 4 partial 0-100%, last 3 discrete 0/1)

INSERT INTO progress_templates (
  component_type,
  version,
  workflow_type,
  milestones_config
) VALUES (
  'pipe',
  2,
  'hybrid',
  '[
    {"name": "Receive", "weight": 5, "order": 1, "is_partial": true, "requires_welder": false},
    {"name": "Erect", "weight": 30, "order": 2, "is_partial": true, "requires_welder": false},
    {"name": "Connect", "weight": 30, "order": 3, "is_partial": true, "requires_welder": false},
    {"name": "Support", "weight": 20, "order": 4, "is_partial": true, "requires_welder": false},
    {"name": "Punch", "weight": 5, "order": 5, "is_partial": false, "requires_welder": false},
    {"name": "Test", "weight": 5, "order": 6, "is_partial": false, "requires_welder": false},
    {"name": "Restore", "weight": 5, "order": 7, "is_partial": false, "requires_welder": false}
  ]'::jsonb
);

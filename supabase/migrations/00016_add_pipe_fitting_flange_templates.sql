-- Migration: Add progress templates for Pipe, Fitting, and Flange component types
-- Feature: 009-sprint-3-material
-- Date: 2025-10-18

-- Add 3 new progress templates for material component types
-- Uses ON CONFLICT DO NOTHING to make migration idempotent
INSERT INTO progress_templates (
  component_type,
  version,
  workflow_type,
  milestones_config
) VALUES
  -- Pipe template: Receive (50%) → Install (50%)
  (
    'pipe',
    1,
    'discrete',
    '[
      {"name": "Receive", "weight": 50, "order": 1, "is_partial": false, "requires_welder": false},
      {"name": "Install", "weight": 50, "order": 2, "is_partial": false, "requires_welder": false}
    ]'::jsonb
  ),

  -- Fitting template: Receive (50%) → Install (50%)
  (
    'fitting',
    1,
    'discrete',
    '[
      {"name": "Receive", "weight": 50, "order": 1, "is_partial": false, "requires_welder": false},
      {"name": "Install", "weight": 50, "order": 2, "is_partial": false, "requires_welder": false}
    ]'::jsonb
  ),

  -- Flange template: Receive (50%) → Install (50%)
  (
    'flange',
    1,
    'discrete',
    '[
      {"name": "Receive", "weight": 50, "order": 1, "is_partial": false, "requires_welder": false},
      {"name": "Install", "weight": 50, "order": 2, "is_partial": false, "requires_welder": false}
    ]'::jsonb
  )
ON CONFLICT (component_type, version) DO NOTHING;

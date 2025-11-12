-- Migration: Create project_progress_templates table
-- Feature: 026-editable-milestone-templates
-- Phase: 1 (Setup)
-- Task: T001
-- Description: Per-project milestone weight configuration table

-- Enable RLS
CREATE TABLE IF NOT EXISTS project_progress_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  component_type text NOT NULL,
  milestone_name text NOT NULL,
  weight integer NOT NULL CHECK (weight >= 0 AND weight <= 100),
  milestone_order integer NOT NULL,
  is_partial boolean DEFAULT false NOT NULL,
  requires_welder boolean DEFAULT false NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(project_id, component_type, milestone_name)
);

-- Enable Row Level Security
ALTER TABLE project_progress_templates ENABLE ROW LEVEL SECURITY;

-- Create index for fast lookup by project and component type
CREATE INDEX idx_project_templates_lookup
ON project_progress_templates(project_id, component_type);

-- Create index for recalculation queries
CREATE INDEX idx_project_templates_type
ON project_progress_templates(component_type);

-- Add comment
COMMENT ON TABLE project_progress_templates IS
'Per-project milestone weight templates, cloned from system progress_templates. Allows projects to customize milestone weights.';

COMMENT ON COLUMN project_progress_templates.weight IS
'Percentage weight (0-100) for this milestone. All weights for a component type must sum to 100%.';

COMMENT ON COLUMN project_progress_templates.is_partial IS
'True if milestone has partial completion (0-100%). False if discrete (boolean).';

COMMENT ON COLUMN project_progress_templates.requires_welder IS
'True if milestone requires welder assignment (e.g., "Weld Made" for field welds).';

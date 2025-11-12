-- Migration: Create project_template_changes audit table
-- Feature: 026-editable-milestone-templates
-- Phase: 1 (Setup)
-- Task: T003
-- Description: Immutable audit log of all template weight modifications

CREATE TABLE IF NOT EXISTS project_template_changes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  component_type text NOT NULL,
  changed_by uuid REFERENCES users(id) ON DELETE SET NULL,
  old_weights jsonb NOT NULL,
  new_weights jsonb NOT NULL,
  applied_to_existing boolean NOT NULL,
  affected_component_count integer NOT NULL,
  changed_at timestamptz DEFAULT now() NOT NULL
);

-- Enable Row Level Security
ALTER TABLE project_template_changes ENABLE ROW LEVEL SECURITY;

-- Create index for audit log queries (chronological by project/component type)
CREATE INDEX idx_template_changes_project
ON project_template_changes(project_id, component_type, changed_at DESC);

-- Create index for user audit queries
CREATE INDEX idx_template_changes_user
ON project_template_changes(changed_by, changed_at DESC);

-- Add comments
COMMENT ON TABLE project_template_changes IS
'Immutable audit log of all template weight modifications. Provides accountability and debugging trail.';

COMMENT ON COLUMN project_template_changes.old_weights IS
'JSONB array of {milestone_name: string, weight: integer} before change. Example: [{"milestone_name":"Weld Made","weight":60}, ...]';

COMMENT ON COLUMN project_template_changes.new_weights IS
'JSONB array of {milestone_name: string, weight: integer} after change. Example: [{"milestone_name":"Weld Made","weight":70}, ...]';

COMMENT ON COLUMN project_template_changes.applied_to_existing IS
'True if weight changes were retroactively applied to existing components (recalculation performed).';

COMMENT ON COLUMN project_template_changes.affected_component_count IS
'Number of components affected by recalculation. 0 if applied_to_existing = false.';

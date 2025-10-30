-- Migration: Create report_configs table for saving report configurations
-- Feature: Weekly Progress Reports by Area/System/Test Package

-- Create function to automatically update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create report_configs table
CREATE TABLE IF NOT EXISTS report_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  grouping_dimension TEXT NOT NULL
    CHECK (grouping_dimension IN ('area', 'system', 'test_package')),
  hierarchical_grouping BOOLEAN NOT NULL DEFAULT false,
  component_type_filter TEXT[], -- NULL = all types, or array of specific types
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,

  -- Constraints
  CONSTRAINT report_configs_name_not_empty CHECK (length(trim(name)) > 0)
);

-- Create indexes for performance
CREATE INDEX idx_report_configs_project ON report_configs(project_id);
CREATE INDEX idx_report_configs_created_by ON report_configs(created_by);
CREATE INDEX idx_report_configs_grouping_dimension ON report_configs(grouping_dimension);

-- Add updated_at trigger
CREATE TRIGGER update_report_configs_updated_at
  BEFORE UPDATE ON report_configs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE report_configs ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view report configs in their organization's projects
CREATE POLICY "Users can view report configs in their org projects"
  ON report_configs FOR SELECT
  USING (
    project_id IN (
      SELECT p.id
      FROM projects p
      INNER JOIN users u ON u.organization_id = p.organization_id
      WHERE u.id = auth.uid()
    )
  );

-- RLS Policy: Users can create report configs in their organization's projects
CREATE POLICY "Users can create report configs in their org projects"
  ON report_configs FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT p.id
      FROM projects p
      INNER JOIN users u ON u.organization_id = p.organization_id
      WHERE u.id = auth.uid()
    )
  );

-- RLS Policy: Users can update report configs they created
CREATE POLICY "Users can update report configs they created"
  ON report_configs FOR UPDATE
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- RLS Policy: Users can delete report configs they created
CREATE POLICY "Users can delete report configs they created"
  ON report_configs FOR DELETE
  USING (created_by = auth.uid());

-- Add comment for documentation
COMMENT ON TABLE report_configs IS 'Stores saved report configurations for weekly progress reports by Area/System/Test Package';
COMMENT ON COLUMN report_configs.grouping_dimension IS 'Primary dimension for grouping: area, system, or test_package';
COMMENT ON COLUMN report_configs.hierarchical_grouping IS 'When true, enables multi-level grouping (e.g., Area -> System -> Test Package)';
COMMENT ON COLUMN report_configs.component_type_filter IS 'Array of component types to include in report. NULL means all types.';

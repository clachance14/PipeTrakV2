-- Migration 00033: Create field_welds table with triggers
-- Feature 014: Field Weld QC Module
-- Creates field_welds table, triggers for rejection workflow and repair auto-start
-- Note: welders table already exists from migration 00011

-- ============================================================================
-- UPDATE WELDERS TABLE (if needed)
-- ============================================================================

-- Add updated_at column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'welders' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE welders ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
  END IF;
END $$;

-- ============================================================================
-- FIELD WELDS TABLE
-- ============================================================================

CREATE TABLE field_welds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  component_id UUID NOT NULL UNIQUE REFERENCES components(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Weld specifications
  weld_type TEXT NOT NULL CHECK (weld_type IN ('BW', 'SW', 'FW', 'TW')),
  weld_size TEXT,
  schedule TEXT,
  base_metal TEXT,
  spec TEXT,

  -- Welder assignment
  welder_id UUID REFERENCES welders(id) ON DELETE SET NULL,
  date_welded DATE,

  -- NDE tracking
  nde_required BOOLEAN NOT NULL DEFAULT false,
  nde_type TEXT CHECK (nde_type IN ('RT', 'UT', 'PT', 'MT') OR nde_type IS NULL),
  nde_result TEXT CHECK (nde_result IN ('PASS', 'FAIL', 'PENDING') OR nde_result IS NULL),
  nde_date DATE,
  nde_notes TEXT,

  -- Status and repair tracking
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'accepted', 'rejected')),
  original_weld_id UUID REFERENCES field_welds(id) ON DELETE SET NULL,
  is_repair BOOLEAN GENERATED ALWAYS AS (original_weld_id IS NOT NULL) STORED,

  -- Audit fields
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID NOT NULL REFERENCES users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE UNIQUE INDEX idx_field_welds_component_id ON field_welds(component_id);
CREATE INDEX idx_field_welds_project_id ON field_welds(project_id);
CREATE INDEX idx_field_welds_welder_id ON field_welds(welder_id);
CREATE INDEX idx_field_welds_original_weld_id ON field_welds(original_weld_id);
CREATE INDEX idx_field_welds_status_active ON field_welds(status) WHERE status = 'active';

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Trigger 1: Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_field_weld_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_field_weld_timestamp
  BEFORE UPDATE ON field_welds
  FOR EACH ROW
  EXECUTE FUNCTION update_field_weld_timestamp();

-- Trigger 2: Handle weld rejection on NDE FAIL
-- Sets status='rejected' and marks component 100% complete
CREATE OR REPLACE FUNCTION handle_weld_rejection()
RETURNS TRIGGER AS $$
BEGIN
  -- Only trigger when nde_result changes to FAIL
  IF NEW.nde_result = 'FAIL' AND (OLD.nde_result IS NULL OR OLD.nde_result != 'FAIL') THEN
    -- Set status to rejected
    NEW.status = 'rejected';

    -- Mark component 100% complete (all milestones true)
    UPDATE components
    SET
      percent_complete = 100,
      progress_state = (
        SELECT jsonb_object_agg(key, true)
        FROM jsonb_object_keys((
          SELECT milestones_config::jsonb
          FROM progress_templates
          WHERE component_type = 'field_weld'
          LIMIT 1
        )) AS key
      )
    WHERE id = NEW.component_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_handle_weld_rejection
  BEFORE UPDATE ON field_welds
  FOR EACH ROW
  EXECUTE FUNCTION handle_weld_rejection();

-- Trigger 3: Auto-start repair welds at 30% (Fit-up complete)
CREATE OR REPLACE FUNCTION auto_start_repair_welds()
RETURNS TRIGGER AS $$
BEGIN
  -- Only trigger for repair welds (original_weld_id NOT NULL)
  IF NEW.original_weld_id IS NOT NULL THEN
    -- Mark "Fit-up" milestone complete on component (30%)
    UPDATE components
    SET
      percent_complete = 30,
      progress_state = jsonb_set(
        COALESCE(progress_state, '{}'::jsonb),
        '{Fit-up}',
        'true'::jsonb
      )
    WHERE id = NEW.component_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_start_repair_welds
  AFTER INSERT ON field_welds
  FOR EACH ROW
  EXECUTE FUNCTION auto_start_repair_welds();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on field_welds (welders RLS already enabled in migration 00011)
ALTER TABLE field_welds ENABLE ROW LEVEL SECURITY;

-- Field Welds: SELECT - all team members can view
CREATE POLICY "Users can view field_welds in their organization"
ON field_welds FOR SELECT
USING (
  project_id IN (
    SELECT id FROM projects
    WHERE organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  )
);

-- Field Welds: INSERT - foremen, QC, admins can create
CREATE POLICY "Users can insert field_welds in their organization"
ON field_welds FOR INSERT
WITH CHECK (
  project_id IN (
    SELECT id FROM projects
    WHERE organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  )
  AND EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role IN ('owner', 'admin', 'project_manager', 'foreman', 'qc_inspector')
  )
);

-- Field Welds: UPDATE - same as insert
CREATE POLICY "Users can update field_welds if they have permission"
ON field_welds FOR UPDATE
USING (
  project_id IN (
    SELECT id FROM projects
    WHERE organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  )
  AND EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role IN ('owner', 'admin', 'project_manager', 'foreman', 'qc_inspector')
  )
);

-- Field Welds: DELETE - only owner/admin
CREATE POLICY "Users can delete field_welds if they are admin"
ON field_welds FOR DELETE
USING (
  project_id IN (
    SELECT id FROM projects
    WHERE organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  )
  AND EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role IN ('owner', 'admin')
  )
);

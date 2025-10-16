-- Migration 00010: Component Tracking (Sprint 1 Core)
-- Feature: 005-sprint-1-core
-- Phase: 3.4
-- Description: Create component and milestone event tracking tables with auto-calculation
--
-- Prerequisites: Migration 00009 must be applied (progress_templates table exists)
--
-- Tables created: components, milestone_events
-- Lines: ~400

-- ============================================================================
-- PART 1: TABLES (2 tables)
-- ============================================================================

-- Table 1: components
-- Purpose: Core entity representing physical pipe components (supports 1M+ rows)
CREATE TABLE components (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  drawing_id UUID REFERENCES drawings(id) ON DELETE SET NULL,  -- Optional drawing reference
  component_type TEXT NOT NULL,  -- One of 11 types: spool, field_weld, support, valve, fitting, flange, instrument, tubing, hose, misc_component, threaded_pipe
  progress_template_id UUID NOT NULL REFERENCES progress_templates(id) ON DELETE RESTRICT,  -- Prevent template deletion if components reference it
  identity_key JSONB NOT NULL,  -- Type-specific identity (FR-004)
  area_id UUID REFERENCES areas(id) ON DELETE SET NULL,  -- Optional area assignment
  system_id UUID REFERENCES systems(id) ON DELETE SET NULL,  -- Optional system assignment
  test_package_id UUID REFERENCES test_packages(id) ON DELETE SET NULL,  -- Optional package assignment
  attributes JSONB,  -- Flexible type-specific fields (max 10KB)
  current_milestones JSONB NOT NULL DEFAULT '{}',  -- Milestone state (discrete: {"Receive": true, ...}, hybrid: {"Fabricate": 85.00, ...})
  percent_complete NUMERIC(5,2) NOT NULL DEFAULT 0.00,  -- Cached ROC calculation 0.00-100.00
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES users(id),
  last_updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_updated_by UUID REFERENCES users(id),
  is_retired BOOLEAN NOT NULL DEFAULT false,  -- Soft delete flag
  retire_reason TEXT
);

COMMENT ON TABLE components IS 'Physical pipe components with flexible identity keys and automated progress calculation (FR-003 to FR-006, FR-012 to FR-015)';
COMMENT ON COLUMN components.identity_key IS 'Type-specific identity: spool {"spool_id": "SP-001"}, field_weld {"weld_number": "W-001"}, support {"drawing_norm": "P-001", "commodity_code": "CS-2", "size": "2IN", "seq": 1}';
COMMENT ON COLUMN components.current_milestones IS 'Milestone state: discrete {"Receive": true, "Erect": false}, hybrid {"Fabricate": 85.00} (partial %)';
COMMENT ON COLUMN components.percent_complete IS 'Weighted ROC % (0.00-100.00), auto-calculated via trigger when current_milestones changes';

-- Table 2: milestone_events
-- Purpose: Audit record of milestone state changes (full audit trail)
CREATE TABLE milestone_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  component_id UUID NOT NULL REFERENCES components(id) ON DELETE CASCADE,
  milestone_name TEXT NOT NULL,  -- Name of milestone that changed
  action TEXT NOT NULL CHECK (action IN ('complete', 'rollback', 'update')),  -- Type of change
  value NUMERIC(5,2),  -- For partial % milestones (0.00-100.00), NULL for discrete boolean toggles
  previous_value NUMERIC(5,2),  -- Old value before change
  user_id UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB  -- Additional context (max 5KB): welder info, out-of-sequence warnings, etc.
);

COMMENT ON TABLE milestone_events IS 'Audit trail of milestone state changes with metadata (FR-013 to FR-015)';
COMMENT ON COLUMN milestone_events.metadata IS 'Context: {"welder_id": "uuid", "stencil": "JD42"} for Weld Made, {"prerequisite": "Install", "event_id": "uuid"} for out-of-sequence';

-- ============================================================================
-- PART 2: INDEXES (~12 indexes)
-- ============================================================================

-- Primary keys already created above

-- components indexes
CREATE INDEX idx_components_project_id ON components(project_id);  -- Critical for RLS performance
CREATE INDEX idx_components_drawing_id ON components(drawing_id);
CREATE INDEX idx_components_type ON components(component_type);
CREATE INDEX idx_components_template_id ON components(progress_template_id);
CREATE INDEX idx_components_area_id ON components(area_id);
CREATE INDEX idx_components_system_id ON components(system_id);
CREATE INDEX idx_components_package_id ON components(test_package_id);
CREATE INDEX idx_components_percent ON components(percent_complete);
CREATE INDEX idx_components_updated ON components(last_updated_at DESC);

-- UNIQUE index on components identity (project + type + identity_key), excluding retired
CREATE UNIQUE INDEX idx_components_identity_unique ON components(project_id, component_type, identity_key) WHERE NOT is_retired;

-- GIN indexes for JSONB columns
CREATE INDEX idx_components_identity ON components USING gin(identity_key);
CREATE INDEX idx_components_attrs ON components USING gin(attributes);

-- milestone_events indexes
CREATE INDEX idx_events_component_id ON milestone_events(component_id);
CREATE INDEX idx_events_created_at ON milestone_events(created_at DESC);
CREATE INDEX idx_events_user_id ON milestone_events(user_id);
CREATE INDEX idx_events_milestone ON milestone_events(milestone_name);

-- ============================================================================
-- PART 3: VALIDATION FUNCTIONS (2 functions)
-- ============================================================================

-- Function: validate_component_identity_key
-- Purpose: Validate identity_key structure matches component_type (FR-041)
CREATE OR REPLACE FUNCTION validate_component_identity_key(
  p_component_type TEXT,
  p_identity_key JSONB
) RETURNS BOOLEAN AS $$
BEGIN
  RETURN CASE p_component_type
    WHEN 'spool' THEN
      p_identity_key ? 'spool_id' AND
      jsonb_typeof(p_identity_key->'spool_id') = 'string'

    WHEN 'field_weld' THEN
      p_identity_key ? 'weld_number' AND
      jsonb_typeof(p_identity_key->'weld_number') = 'string'

    WHEN 'support' THEN
      p_identity_key ? 'drawing_norm' AND
      p_identity_key ? 'commodity_code' AND
      p_identity_key ? 'size' AND
      p_identity_key ? 'seq' AND
      jsonb_typeof(p_identity_key->'seq') = 'number'

    WHEN 'valve' THEN
      p_identity_key ? 'drawing_norm' AND
      p_identity_key ? 'commodity_code' AND
      p_identity_key ? 'size' AND
      p_identity_key ? 'seq' AND
      jsonb_typeof(p_identity_key->'seq') = 'number'

    WHEN 'fitting' THEN
      p_identity_key ? 'drawing_norm' AND
      p_identity_key ? 'commodity_code' AND
      p_identity_key ? 'size' AND
      p_identity_key ? 'seq' AND
      jsonb_typeof(p_identity_key->'seq') = 'number'

    WHEN 'flange' THEN
      p_identity_key ? 'drawing_norm' AND
      p_identity_key ? 'commodity_code' AND
      p_identity_key ? 'size' AND
      p_identity_key ? 'seq' AND
      jsonb_typeof(p_identity_key->'seq') = 'number'

    WHEN 'instrument' THEN
      p_identity_key ? 'drawing_norm' AND
      p_identity_key ? 'commodity_code' AND
      p_identity_key ? 'size' AND
      p_identity_key ? 'seq' AND
      jsonb_typeof(p_identity_key->'seq') = 'number'

    WHEN 'tubing' THEN
      p_identity_key ? 'drawing_norm' AND
      p_identity_key ? 'commodity_code' AND
      p_identity_key ? 'size' AND
      p_identity_key ? 'seq' AND
      jsonb_typeof(p_identity_key->'seq') = 'number'

    WHEN 'hose' THEN
      p_identity_key ? 'drawing_norm' AND
      p_identity_key ? 'commodity_code' AND
      p_identity_key ? 'size' AND
      p_identity_key ? 'seq' AND
      jsonb_typeof(p_identity_key->'seq') = 'number'

    WHEN 'misc_component' THEN
      p_identity_key ? 'drawing_norm' AND
      p_identity_key ? 'commodity_code' AND
      p_identity_key ? 'size' AND
      p_identity_key ? 'seq' AND
      jsonb_typeof(p_identity_key->'seq') = 'number'

    WHEN 'threaded_pipe' THEN
      p_identity_key ? 'drawing_norm' AND
      p_identity_key ? 'commodity_code' AND
      p_identity_key ? 'size' AND
      p_identity_key ? 'seq'

    ELSE FALSE  -- Unknown component type
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION validate_component_identity_key IS 'Validate identity_key structure matches component_type schema (FR-041)';

-- Function: calculate_component_percent
-- Purpose: Calculate weighted ROC % based on completed milestones (FR-011, FR-012)
CREATE OR REPLACE FUNCTION calculate_component_percent(p_component_id UUID)
RETURNS NUMERIC(5,2) AS $$
DECLARE
  v_template_id UUID;
  v_current_milestones JSONB;
  v_milestones_config JSONB;
  v_total_weight NUMERIC(5,2) := 0;
  v_milestone JSONB;
BEGIN
  -- Fetch component data
  SELECT progress_template_id, current_milestones
  INTO v_template_id, v_current_milestones
  FROM components
  WHERE id = p_component_id;

  -- Fetch template milestones config
  SELECT milestones_config
  INTO v_milestones_config
  FROM progress_templates
  WHERE id = v_template_id;

  -- Loop through milestones and calculate weighted %
  FOR v_milestone IN SELECT * FROM jsonb_array_elements(v_milestones_config) LOOP
    DECLARE
      v_milestone_name TEXT := v_milestone->>'name';
      v_weight NUMERIC(5,2) := (v_milestone->>'weight')::NUMERIC(5,2);
      v_is_partial BOOLEAN := COALESCE((v_milestone->>'is_partial')::BOOLEAN, false);
      v_current_value JSONB := v_current_milestones->v_milestone_name;
    BEGIN
      IF v_current_value IS NOT NULL THEN
        IF v_is_partial THEN
          -- Hybrid workflow: partial % (e.g., "Fabricate": 75.00 → 16% * 0.75 = 12.00%)
          v_total_weight := v_total_weight + (v_weight * (v_current_value::TEXT)::NUMERIC / 100.0);
        ELSIF jsonb_typeof(v_current_value) = 'boolean' AND (v_current_value::TEXT)::BOOLEAN = true THEN
          -- Discrete workflow: boolean true (e.g., "Receive": true → add full 5%)
          v_total_weight := v_total_weight + v_weight;
        END IF;
      END IF;
    END;
  END LOOP;

  RETURN ROUND(v_total_weight, 2);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_component_percent IS 'Calculate weighted ROC % from current_milestones (FR-011, FR-012)';

-- ============================================================================
-- PART 4: CHECK CONSTRAINTS (4 constraints)
-- ============================================================================

-- Constraint 1: identity_key structure must match component_type
ALTER TABLE components
ADD CONSTRAINT chk_identity_key_structure
CHECK (validate_component_identity_key(component_type, identity_key));

-- Constraint 2: percent_complete must be in range 0.00-100.00
ALTER TABLE components
ADD CONSTRAINT chk_percent_complete_range
CHECK (percent_complete >= 0.00 AND percent_complete <= 100.00);

-- Constraint 3: attributes max 10KB JSON
ALTER TABLE components
ADD CONSTRAINT chk_attributes_max_size
CHECK (pg_column_size(attributes) <= 10240);  -- 10KB

-- Constraint 4: milestone_events metadata max 5KB JSON
ALTER TABLE milestone_events
ADD CONSTRAINT chk_metadata_max_size
CHECK (pg_column_size(metadata) <= 5120);  -- 5KB

-- ============================================================================
-- PART 5: TRIGGERS (1 trigger)
-- ============================================================================

-- Trigger: update_component_percent_on_milestone_change
-- Purpose: Auto-recalculate percent_complete when current_milestones changes
CREATE OR REPLACE FUNCTION update_component_percent_on_milestone_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Recalculate percent_complete
  NEW.percent_complete := calculate_component_percent(NEW.id);
  NEW.last_updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_component_percent_on_milestone_change
BEFORE UPDATE OF current_milestones ON components
FOR EACH ROW
EXECUTE FUNCTION update_component_percent_on_milestone_change();

COMMENT ON TRIGGER update_component_percent_on_milestone_change ON components IS 'Auto-recalculate percent_complete when milestones change (FR-012)';

-- ============================================================================
-- PART 6: RLS POLICIES (~8 policies across 2 tables)
-- ============================================================================

-- Enable RLS on both tables
ALTER TABLE components ENABLE ROW LEVEL SECURITY;
ALTER TABLE milestone_events ENABLE ROW LEVEL SECURITY;

-- components policies
CREATE POLICY "Users can view components in their organization"
ON components FOR SELECT
USING (
  project_id IN (
    SELECT id FROM projects
    WHERE organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  )
);

CREATE POLICY "Users can insert components in their organization"
ON components FOR INSERT
WITH CHECK (
  project_id IN (
    SELECT id FROM projects
    WHERE organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  )
);

CREATE POLICY "Users can update components if they have permission"
ON components FOR UPDATE
USING (
  project_id IN (
    SELECT id FROM projects
    WHERE organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  )
  AND EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role IN ('owner', 'admin', 'project_manager', 'foreman', 'qc_inspector', 'welder')  -- All roles except viewer have can_update_milestones
  )
);

CREATE POLICY "Users can delete components in their organization"
ON components FOR DELETE
USING (
  project_id IN (
    SELECT id FROM projects
    WHERE organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  )
);

-- milestone_events policies
CREATE POLICY "Users can view milestone_events in their organization"
ON milestone_events FOR SELECT
USING (
  component_id IN (
    SELECT id FROM components
    WHERE project_id IN (
      SELECT id FROM projects
      WHERE organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
    )
  )
);

CREATE POLICY "Users can insert milestone_events for their organization components"
ON milestone_events FOR INSERT
WITH CHECK (
  component_id IN (
    SELECT id FROM components
    WHERE project_id IN (
      SELECT id FROM projects
      WHERE organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
    )
  )
);

-- ============================================================================
-- MIGRATION COMPLETE: 00010_component_tracking.sql
-- ============================================================================
-- Tables created: 2 (components, milestone_events)
-- Indexes created: ~16 (including PRIMARY KEY, UNIQUE, GIN, foreign keys)
-- Validation functions: 2 (validate_component_identity_key, calculate_component_percent)
-- CHECK constraints: 4 (identity structure, percent range, JSON size limits)
-- Triggers: 1 (auto-recalculate percent_complete)
-- RLS policies: ~6 policies (multi-tenant isolation + permission checks)
-- Next migration: 00011_welder_field_weld_qc.sql
-- ============================================================================

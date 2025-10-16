-- Migration 00009: Foundation Tables (Sprint 1 Core)
-- Feature: 005-sprint-1-core
-- Phase: 3.3
-- Description: Create foundation tables for pipe tracking (drawings, areas, systems, test_packages, progress_templates)
--
-- This migration creates the first 5 of 11 new tables needed for Sprint 1.
-- Includes: pg_trgm extension, indexes, RLS policies, seed data for 11 progress templates.
--
-- Tables created: drawings, areas, systems, test_packages, progress_templates
-- Lines: ~300

-- ============================================================================
-- PART 1: EXTENSIONS
-- ============================================================================

-- Enable pg_trgm for drawing similarity detection (FR-037 to FR-040)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================================================
-- PART 2: TABLES (5 tables)
-- ============================================================================

-- Table 1: drawings
-- Purpose: Store construction drawings with normalized numbers for exact and fuzzy matching
CREATE TABLE drawings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  drawing_no_raw TEXT NOT NULL,  -- Original drawing number as imported (max 255 chars)
  drawing_no_norm TEXT NOT NULL,  -- Normalized: UPPERCASE, trimmed, separators collapsed, leading zeros removed
  title TEXT,  -- Drawing title/description
  rev TEXT,  -- Revision number
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_retired BOOLEAN NOT NULL DEFAULT false,  -- Soft delete flag (FR-006)
  retire_reason TEXT  -- Why drawing was retired
);

COMMENT ON TABLE drawings IS 'Construction drawings with normalized numbers for similarity detection';
COMMENT ON COLUMN drawings.drawing_no_norm IS 'Normalized drawing number (UPPER, trimmed, de-zeroed) for exact and fuzzy matching';

-- Table 2: areas
-- Purpose: Physical area grouping for components (e.g., "B-68", "Tank Farm")
CREATE TABLE areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE areas IS 'Physical area grouping for pipe components (FR-016 to FR-018)';

-- Table 3: systems
-- Purpose: System grouping for components (e.g., "HC-05" hydraulic, "E-200" electrical)
CREATE TABLE systems (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE systems IS 'System grouping for pipe components (FR-016 to FR-018)';

-- Table 4: test_packages
-- Purpose: Collections of components ready for testing by target date
CREATE TABLE test_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  target_date DATE,  -- When test package must be ready
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE test_packages IS 'Test package collections with target completion dates (FR-016 to FR-018, FR-034)';

-- Table 5: progress_templates
-- Purpose: Define milestone workflows for component types (versioned)
CREATE TABLE progress_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  component_type TEXT NOT NULL,  -- One of 11 types: spool, field_weld, support, valve, fitting, flange, instrument, tubing, hose, misc_component, threaded_pipe
  version INTEGER NOT NULL,  -- Template version (v1 for Sprint 1)
  workflow_type TEXT NOT NULL CHECK (workflow_type IN ('discrete', 'quantity', 'hybrid')),
  milestones_config JSONB NOT NULL,  -- Array of milestone objects with name, weight, order, optional flags
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE progress_templates IS 'Milestone workflow definitions for component types (FR-007 to FR-011)';
COMMENT ON COLUMN progress_templates.milestones_config IS 'JSONB array: [{"name": "Receive", "weight": 5, "order": 1, "is_partial": false, "requires_welder": false}, ...]';

-- ============================================================================
-- PART 3: INDEXES (~15 indexes)
-- ============================================================================

-- Primary keys already created above

-- drawings indexes
CREATE UNIQUE INDEX idx_drawings_project_norm ON drawings(project_id, drawing_no_norm) WHERE NOT is_retired;
CREATE INDEX idx_drawings_project_id ON drawings(project_id);
CREATE INDEX idx_drawings_norm_trgm ON drawings USING gin(drawing_no_norm gin_trgm_ops);  -- For similarity search

-- areas indexes
CREATE UNIQUE INDEX idx_areas_project_name ON areas(project_id, name);

-- systems indexes
CREATE UNIQUE INDEX idx_systems_project_name ON systems(project_id, name);

-- test_packages indexes
CREATE INDEX idx_packages_project_id ON test_packages(project_id);
CREATE INDEX idx_packages_target_date ON test_packages(target_date);

-- progress_templates indexes
CREATE UNIQUE INDEX idx_templates_type_version ON progress_templates(component_type, version);

-- ============================================================================
-- PART 4: VALIDATION FUNCTIONS
-- ============================================================================

-- Function: validate_milestone_weights
-- Purpose: Ensure milestone weights total exactly 100% (FR-042)
CREATE OR REPLACE FUNCTION validate_milestone_weights(p_milestones_config JSONB)
RETURNS BOOLEAN AS $$
DECLARE
  total_weight NUMERIC(5,2) := 0;
  milestone JSONB;
BEGIN
  FOR milestone IN SELECT * FROM jsonb_array_elements(p_milestones_config) LOOP
    total_weight := total_weight + (milestone->>'weight')::NUMERIC(5,2);
  END LOOP;

  RETURN total_weight = 100.00;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION validate_milestone_weights IS 'Validate that milestone weights sum to exactly 100%';

-- ============================================================================
-- PART 5: CHECK CONSTRAINTS
-- ============================================================================

-- progress_templates: milestone weights must total 100%
ALTER TABLE progress_templates
ADD CONSTRAINT chk_milestone_weights_total_100
CHECK (validate_milestone_weights(milestones_config));

-- drawings: normalized drawing number must not be empty
ALTER TABLE drawings
ADD CONSTRAINT chk_drawing_no_norm_not_empty
CHECK (length(trim(drawing_no_norm)) > 0);

-- ============================================================================
-- PART 6: HELPER FUNCTIONS
-- ============================================================================

-- Function: normalize_drawing_number
-- Purpose: Normalize drawing numbers (UPPER, TRIM, de-zero leading zeros)
CREATE OR REPLACE FUNCTION normalize_drawing_number(raw TEXT)
RETURNS TEXT AS $$
BEGIN
  -- UPPER, TRIM, collapse multiple spaces/dashes, remove leading zeros from numeric parts
  RETURN UPPER(TRIM(regexp_replace(raw, '\s+', ' ', 'g')));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION normalize_drawing_number IS 'Normalize drawing numbers for exact matching (UPPER, TRIM)';

-- ============================================================================
-- PART 7: TRIGGERS
-- ============================================================================

-- Trigger: normalize_drawing_on_insert
-- Purpose: Auto-normalize drawing_no_norm when drawing_no_raw is inserted
CREATE OR REPLACE FUNCTION normalize_drawing_on_insert()
RETURNS TRIGGER AS $$
BEGIN
  NEW.drawing_no_norm := normalize_drawing_number(NEW.drawing_no_raw);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER normalize_drawing_on_insert
BEFORE INSERT ON drawings
FOR EACH ROW
EXECUTE FUNCTION normalize_drawing_on_insert();

-- ============================================================================
-- PART 8: RLS POLICIES (~15 policies across 5 tables)
-- ============================================================================

-- Enable RLS on all 5 tables
ALTER TABLE drawings ENABLE ROW LEVEL SECURITY;
ALTER TABLE areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE systems ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE progress_templates ENABLE ROW LEVEL SECURITY;

-- drawings policies
CREATE POLICY "Users can view drawings in their organization"
ON drawings FOR SELECT
USING (
  project_id IN (
    SELECT id FROM projects
    WHERE organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  )
);

CREATE POLICY "Users can insert drawings in their organization"
ON drawings FOR INSERT
WITH CHECK (
  project_id IN (
    SELECT id FROM projects
    WHERE organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  )
);

CREATE POLICY "Users can update drawings in their organization"
ON drawings FOR UPDATE
USING (
  project_id IN (
    SELECT id FROM projects
    WHERE organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  )
);

-- areas policies
CREATE POLICY "Users can view areas in their organization"
ON areas FOR SELECT
USING (
  project_id IN (
    SELECT id FROM projects
    WHERE organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  )
);

CREATE POLICY "Users can insert areas in their organization"
ON areas FOR INSERT
WITH CHECK (
  project_id IN (
    SELECT id FROM projects
    WHERE organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  )
);

-- systems policies
CREATE POLICY "Users can view systems in their organization"
ON systems FOR SELECT
USING (
  project_id IN (
    SELECT id FROM projects
    WHERE organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  )
);

CREATE POLICY "Users can insert systems in their organization"
ON systems FOR INSERT
WITH CHECK (
  project_id IN (
    SELECT id FROM projects
    WHERE organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  )
);

-- test_packages policies
CREATE POLICY "Users can view test_packages in their organization"
ON test_packages FOR SELECT
USING (
  project_id IN (
    SELECT id FROM projects
    WHERE organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  )
);

CREATE POLICY "Users can insert test_packages in their organization"
ON test_packages FOR INSERT
WITH CHECK (
  project_id IN (
    SELECT id FROM projects
    WHERE organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  )
);

-- progress_templates policies (global, readable by all authenticated users)
CREATE POLICY "Authenticated users can view progress_templates"
ON progress_templates FOR SELECT
USING (auth.role() = 'authenticated');

-- ============================================================================
-- PART 9: SEED DATA (11 progress templates)
-- ============================================================================

INSERT INTO progress_templates (component_type, version, workflow_type, milestones_config) VALUES
-- 1. Spool (discrete, 6 milestones)
('spool', 1, 'discrete', '[
  {"name": "Receive", "weight": 5, "order": 1, "is_partial": false, "requires_welder": false},
  {"name": "Erect", "weight": 40, "order": 2, "is_partial": false, "requires_welder": false},
  {"name": "Connect", "weight": 40, "order": 3, "is_partial": false, "requires_welder": false},
  {"name": "Punch", "weight": 5, "order": 4, "is_partial": false, "requires_welder": false},
  {"name": "Test", "weight": 5, "order": 5, "is_partial": false, "requires_welder": false},
  {"name": "Restore", "weight": 5, "order": 6, "is_partial": false, "requires_welder": false}
]'::jsonb),

-- 2. Field Weld (discrete, 5 milestones)
('field_weld', 1, 'discrete', '[
  {"name": "Fit-Up", "weight": 10, "order": 1, "is_partial": false, "requires_welder": false},
  {"name": "Weld Made", "weight": 60, "order": 2, "is_partial": false, "requires_welder": true},
  {"name": "Punch", "weight": 10, "order": 3, "is_partial": false, "requires_welder": false},
  {"name": "Test", "weight": 15, "order": 4, "is_partial": false, "requires_welder": false},
  {"name": "Restore", "weight": 5, "order": 5, "is_partial": false, "requires_welder": false}
]'::jsonb),

-- 3. Support (discrete, 5 milestones)
('support', 1, 'discrete', '[
  {"name": "Receive", "weight": 10, "order": 1, "is_partial": false, "requires_welder": false},
  {"name": "Install", "weight": 60, "order": 2, "is_partial": false, "requires_welder": false},
  {"name": "Punch", "weight": 10, "order": 3, "is_partial": false, "requires_welder": false},
  {"name": "Test", "weight": 15, "order": 4, "is_partial": false, "requires_welder": false},
  {"name": "Restore", "weight": 5, "order": 5, "is_partial": false, "requires_welder": false}
]'::jsonb),

-- 4. Valve (discrete, 5 milestones)
('valve', 1, 'discrete', '[
  {"name": "Receive", "weight": 10, "order": 1, "is_partial": false, "requires_welder": false},
  {"name": "Install", "weight": 60, "order": 2, "is_partial": false, "requires_welder": false},
  {"name": "Punch", "weight": 10, "order": 3, "is_partial": false, "requires_welder": false},
  {"name": "Test", "weight": 15, "order": 4, "is_partial": false, "requires_welder": false},
  {"name": "Restore", "weight": 5, "order": 5, "is_partial": false, "requires_welder": false}
]'::jsonb),

-- 5. Fitting (discrete, 5 milestones)
('fitting', 1, 'discrete', '[
  {"name": "Receive", "weight": 10, "order": 1, "is_partial": false, "requires_welder": false},
  {"name": "Install", "weight": 60, "order": 2, "is_partial": false, "requires_welder": false},
  {"name": "Punch", "weight": 10, "order": 3, "is_partial": false, "requires_welder": false},
  {"name": "Test", "weight": 15, "order": 4, "is_partial": false, "requires_welder": false},
  {"name": "Restore", "weight": 5, "order": 5, "is_partial": false, "requires_welder": false}
]'::jsonb),

-- 6. Flange (discrete, 5 milestones)
('flange', 1, 'discrete', '[
  {"name": "Receive", "weight": 10, "order": 1, "is_partial": false, "requires_welder": false},
  {"name": "Install", "weight": 60, "order": 2, "is_partial": false, "requires_welder": false},
  {"name": "Punch", "weight": 10, "order": 3, "is_partial": false, "requires_welder": false},
  {"name": "Test", "weight": 15, "order": 4, "is_partial": false, "requires_welder": false},
  {"name": "Restore", "weight": 5, "order": 5, "is_partial": false, "requires_welder": false}
]'::jsonb),

-- 7. Instrument (discrete, 5 milestones)
('instrument', 1, 'discrete', '[
  {"name": "Receive", "weight": 10, "order": 1, "is_partial": false, "requires_welder": false},
  {"name": "Install", "weight": 60, "order": 2, "is_partial": false, "requires_welder": false},
  {"name": "Punch", "weight": 10, "order": 3, "is_partial": false, "requires_welder": false},
  {"name": "Test", "weight": 15, "order": 4, "is_partial": false, "requires_welder": false},
  {"name": "Restore", "weight": 5, "order": 5, "is_partial": false, "requires_welder": false}
]'::jsonb),

-- 8. Tubing (discrete, 5 milestones)
('tubing', 1, 'discrete', '[
  {"name": "Receive", "weight": 10, "order": 1, "is_partial": false, "requires_welder": false},
  {"name": "Install", "weight": 60, "order": 2, "is_partial": false, "requires_welder": false},
  {"name": "Punch", "weight": 10, "order": 3, "is_partial": false, "requires_welder": false},
  {"name": "Test", "weight": 15, "order": 4, "is_partial": false, "requires_welder": false},
  {"name": "Restore", "weight": 5, "order": 5, "is_partial": false, "requires_welder": false}
]'::jsonb),

-- 9. Hose (discrete, 5 milestones)
('hose', 1, 'discrete', '[
  {"name": "Receive", "weight": 10, "order": 1, "is_partial": false, "requires_welder": false},
  {"name": "Install", "weight": 60, "order": 2, "is_partial": false, "requires_welder": false},
  {"name": "Punch", "weight": 10, "order": 3, "is_partial": false, "requires_welder": false},
  {"name": "Test", "weight": 15, "order": 4, "is_partial": false, "requires_welder": false},
  {"name": "Restore", "weight": 5, "order": 5, "is_partial": false, "requires_welder": false}
]'::jsonb),

-- 10. Misc Component (discrete, 5 milestones)
('misc_component', 1, 'discrete', '[
  {"name": "Receive", "weight": 10, "order": 1, "is_partial": false, "requires_welder": false},
  {"name": "Install", "weight": 60, "order": 2, "is_partial": false, "requires_welder": false},
  {"name": "Punch", "weight": 10, "order": 3, "is_partial": false, "requires_welder": false},
  {"name": "Test", "weight": 15, "order": 4, "is_partial": false, "requires_welder": false},
  {"name": "Restore", "weight": 5, "order": 5, "is_partial": false, "requires_welder": false}
]'::jsonb),

-- 11. Threaded Pipe (hybrid, 8 milestones with partial % support)
('threaded_pipe', 1, 'hybrid', '[
  {"name": "Fabricate", "weight": 16, "order": 1, "is_partial": true, "requires_welder": false},
  {"name": "Install", "weight": 16, "order": 2, "is_partial": true, "requires_welder": false},
  {"name": "Erect", "weight": 16, "order": 3, "is_partial": true, "requires_welder": false},
  {"name": "Connect", "weight": 16, "order": 4, "is_partial": true, "requires_welder": false},
  {"name": "Support", "weight": 16, "order": 5, "is_partial": true, "requires_welder": false},
  {"name": "Punch", "weight": 5, "order": 6, "is_partial": false, "requires_welder": false},
  {"name": "Test", "weight": 10, "order": 7, "is_partial": false, "requires_welder": false},
  {"name": "Restore", "weight": 5, "order": 8, "is_partial": false, "requires_welder": false}
]'::jsonb);

-- ============================================================================
-- MIGRATION COMPLETE: 00009_foundation_tables.sql
-- ============================================================================
-- Tables created: 5 (drawings, areas, systems, test_packages, progress_templates)
-- Indexes created: ~9 (PRIMARY KEYS + UNIQUE + GIN trigram)
-- RLS policies: ~11 policies
-- Seed data: 11 progress templates (validated weights total 100%)
-- Next migration: 00010_component_tracking.sql
-- ============================================================================

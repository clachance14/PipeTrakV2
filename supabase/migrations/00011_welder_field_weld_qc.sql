-- Migration 00011: Welder & Field Weld QC (Sprint 1 Core)
-- Feature: 005-sprint-1-core
-- Phase: 3.5
-- Description: Create welder registry and field weld inspection QC tracking tables
--
-- Prerequisites: Migration 00010 must be applied (components table exists)
--
-- Tables created: welders, field_weld_inspections
-- Lines: ~500

-- ============================================================================
-- PART 1: TABLES (2 tables)
-- ============================================================================

-- Table 1: welders
-- Purpose: Registry of welders per project with verification workflow (FR-019 to FR-022)
CREATE TABLE welders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,  -- Welder's full name
  stencil TEXT NOT NULL,  -- Raw stencil as imported
  stencil_norm TEXT NOT NULL,  -- Normalized: UPPER(TRIM(stencil)), validated against regex [A-Z0-9-]{2,12}
  status TEXT NOT NULL CHECK (status IN ('unverified', 'verified')) DEFAULT 'unverified',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES users(id),
  verified_at TIMESTAMPTZ,  -- When welder was verified (NULL if unverified)
  verified_by UUID REFERENCES users(id)  -- Who verified the welder (NULL if unverified)
);

COMMENT ON TABLE welders IS 'Welder registry with verification workflow (FR-019 to FR-022)';
COMMENT ON COLUMN welders.stencil_norm IS 'Normalized stencil (UPPER, TRIM) matching regex [A-Z0-9-]{2,12}';

-- Table 2: field_weld_inspections
-- Purpose: Detailed QC tracking for field welds beyond construction milestones (FR-053 to FR-060)
CREATE TABLE field_weld_inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  component_id UUID NOT NULL REFERENCES components(id) ON DELETE CASCADE,  -- Link to field_weld component
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,  -- For RLS performance

  -- Weld identification
  weld_id_number NUMERIC(10,2) NOT NULL,  -- Supports repairs: 42, 42.1, 42.2 (FR-056)
  parent_weld_id UUID REFERENCES field_weld_inspections(id),  -- NULL for original welds, set for repairs
  repair_sequence INTEGER NOT NULL DEFAULT 0,  -- 0 = original, 1+ = repair number

  -- Drawing and package references
  drawing_iso_number TEXT,
  tie_in_number TEXT,
  package_number TEXT,

  -- Weld specifications
  spec TEXT,  -- Pipe specification (e.g., "A106-B")
  system_code TEXT,  -- System reference (e.g., "HC-05")
  weld_size TEXT,
  schedule TEXT,  -- Pipe schedule
  weld_type TEXT CHECK (weld_type IN ('BW', 'SW', 'FW', 'TW')),  -- Butt Weld, Socket Weld, Fillet Weld, Tack Weld
  base_metal TEXT,
  test_pressure NUMERIC(8,2),  -- Test pressure in PSI

  -- Welder assignment (set by FOREMAN when marking "Weld Made" milestone, FR-054)
  welder_id UUID REFERENCES welders(id),
  welder_stencil TEXT,  -- Denormalized stencil for historical record
  date_welded DATE,

  -- X-ray tracking (FR-057)
  xray_percentage TEXT,  -- "5%", "10%", "100%" (informational only)
  flagged_for_xray BOOLEAN NOT NULL DEFAULT false,  -- QC manually flags welds for x-ray
  xray_flagged_by UUID REFERENCES users(id),
  xray_flagged_date DATE,
  xray_shot_number TEXT,
  xray_result TEXT,

  -- Hydro testing
  hydro_complete BOOLEAN NOT NULL DEFAULT false,
  hydro_complete_date DATE,
  restored_date DATE,

  -- PMI (Positive Material Identification)
  pmi_required BOOLEAN NOT NULL DEFAULT false,
  pmi_complete BOOLEAN NOT NULL DEFAULT false,
  pmi_date DATE,
  pmi_result TEXT,

  -- PWHT (Post-Weld Heat Treatment)
  pwht_required BOOLEAN NOT NULL DEFAULT false,
  pwht_complete BOOLEAN NOT NULL DEFAULT false,
  pwht_date DATE,

  -- NDE (Non-Destructive Examination)
  nde_type_performed TEXT,  -- e.g., "RT", "UT"
  nde_result TEXT,

  -- Client turnover (FR-058)
  turned_over_to_client BOOLEAN NOT NULL DEFAULT false,
  turnover_date DATE,

  -- Additional info
  optional_info TEXT,
  comments TEXT,

  -- Audit fields
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES users(id),
  last_updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_updated_by UUID REFERENCES users(id)
);

COMMENT ON TABLE field_weld_inspections IS 'QC tracking for field welds: hydro, PMI, PWHT, NDE, x-ray, repairs, turnover (FR-053 to FR-060)';
COMMENT ON COLUMN field_weld_inspections.weld_id_number IS 'Decimal weld ID supporting repairs: 42.0 (original), 42.1, 42.2 (repairs)';
COMMENT ON COLUMN field_weld_inspections.flagged_for_xray IS 'QC inspector manually flags welds for x-ray examination (FR-057)';
COMMENT ON COLUMN field_weld_inspections.turned_over_to_client IS 'Weld has been turned over to client (FR-058)';

-- ============================================================================
-- PART 2: INDEXES (~15 indexes)
-- ============================================================================

-- welders indexes
CREATE UNIQUE INDEX idx_welders_project_stencil ON welders(project_id, stencil_norm);  -- FR-020: unique stencil within project
CREATE INDEX idx_welders_project_id ON welders(project_id);
CREATE INDEX idx_welders_status ON welders(status) WHERE status = 'unverified';  -- Partial index for verification queue

-- field_weld_inspections indexes
CREATE UNIQUE INDEX idx_weld_inspections_project_weld_number ON field_weld_inspections(project_id, weld_id_number);  -- FR-055
CREATE INDEX idx_weld_inspections_component_id ON field_weld_inspections(component_id);
CREATE INDEX idx_weld_inspections_project_id ON field_weld_inspections(project_id);  -- Critical for RLS performance
CREATE INDEX idx_weld_inspections_welder_id ON field_weld_inspections(welder_id);
CREATE INDEX idx_weld_inspections_parent_weld ON field_weld_inspections(parent_weld_id);  -- For repair history queries

-- Partial indexes for QC queues
CREATE INDEX idx_weld_inspections_flagged_xray ON field_weld_inspections(flagged_for_xray) WHERE flagged_for_xray = true;
CREATE INDEX idx_weld_inspections_hydro ON field_weld_inspections(hydro_complete) WHERE NOT hydro_complete;
CREATE INDEX idx_weld_inspections_turnover ON field_weld_inspections(turned_over_to_client) WHERE NOT turned_over_to_client;

-- ============================================================================
-- PART 3: STORED PROCEDURES (1 function)
-- ============================================================================

-- Function: get_weld_repair_history
-- Purpose: Get original weld + all repairs ordered by weld_id_number (FR-056)
CREATE OR REPLACE FUNCTION get_weld_repair_history(p_parent_weld_id UUID)
RETURNS TABLE(
  id UUID,
  weld_id_number NUMERIC(10,2),
  repair_sequence INTEGER,
  welder_stencil TEXT,
  date_welded DATE,
  comments TEXT
) AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE repair_chain AS (
    -- Start with the given weld (could be original or repair)
    SELECT
      fwi.id,
      fwi.weld_id_number,
      fwi.repair_sequence,
      fwi.parent_weld_id,
      fwi.welder_stencil,
      fwi.date_welded,
      fwi.comments
    FROM field_weld_inspections fwi
    WHERE fwi.id = p_parent_weld_id

    UNION

    -- Find all repairs of the original weld
    SELECT
      fwi.id,
      fwi.weld_id_number,
      fwi.repair_sequence,
      fwi.parent_weld_id,
      fwi.welder_stencil,
      fwi.date_welded,
      fwi.comments
    FROM field_weld_inspections fwi
    INNER JOIN repair_chain rc ON fwi.parent_weld_id = rc.id OR (rc.parent_weld_id IS NOT NULL AND fwi.parent_weld_id = rc.parent_weld_id)
  )
  SELECT
    rc.id,
    rc.weld_id_number,
    rc.repair_sequence,
    rc.welder_stencil,
    rc.date_welded,
    rc.comments
  FROM repair_chain rc
  ORDER BY rc.weld_id_number;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_weld_repair_history IS 'Get complete repair history for a weld (original + all repairs ordered by weld_id_number)';

-- ============================================================================
-- PART 4: CHECK CONSTRAINTS (2 constraints)
-- ============================================================================

-- Constraint 1: welder stencil format validation (FR-043)
ALTER TABLE welders
ADD CONSTRAINT chk_welder_stencil_format
CHECK (stencil_norm ~ '^[A-Z0-9-]{2,12}$');

-- Constraint 2: weld repair tracking validation (FR-056)
-- parent_weld_id NULL iff repair_sequence = 0
ALTER TABLE field_weld_inspections
ADD CONSTRAINT chk_weld_repair_tracking
CHECK (
  (parent_weld_id IS NULL AND repair_sequence = 0) OR
  (parent_weld_id IS NOT NULL AND repair_sequence > 0)
);

-- ============================================================================
-- PART 5: TRIGGERS (1 trigger)
-- ============================================================================

-- Trigger: update_weld_inspection_timestamp
-- Purpose: Auto-update last_updated_at/by when QC data changes
CREATE OR REPLACE FUNCTION update_weld_inspection_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_updated_at := now();
  -- Note: last_updated_by should be set by application layer (auth.uid())
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_weld_inspection_timestamp
BEFORE UPDATE ON field_weld_inspections
FOR EACH ROW
EXECUTE FUNCTION update_weld_inspection_timestamp();

COMMENT ON TRIGGER update_weld_inspection_timestamp ON field_weld_inspections IS 'Auto-update last_updated_at timestamp on QC data changes';

-- ============================================================================
-- PART 6: RLS POLICIES (~8 policies across 2 tables)
-- ============================================================================

-- Enable RLS on both tables
ALTER TABLE welders ENABLE ROW LEVEL SECURITY;
ALTER TABLE field_weld_inspections ENABLE ROW LEVEL SECURITY;

-- welders policies
CREATE POLICY "Users can view welders in their organization"
ON welders FOR SELECT
USING (
  project_id IN (
    SELECT id FROM projects
    WHERE organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  )
);

CREATE POLICY "Users can insert welders in their organization"
ON welders FOR INSERT
WITH CHECK (
  project_id IN (
    SELECT id FROM projects
    WHERE organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  )
);

CREATE POLICY "Users can verify welders if they have permission"
ON welders FOR UPDATE
USING (
  project_id IN (
    SELECT id FROM projects
    WHERE organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  )
  AND EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role IN ('owner', 'admin', 'project_manager', 'foreman', 'qc_inspector')  -- Roles with can_manage_welders permission
  )
);

-- field_weld_inspections policies
CREATE POLICY "Users can view field_weld_inspections in their organization"
ON field_weld_inspections FOR SELECT
USING (
  project_id IN (
    SELECT id FROM projects
    WHERE organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  )
);

CREATE POLICY "Users can insert field_weld_inspections in their organization"
ON field_weld_inspections FOR INSERT
WITH CHECK (
  project_id IN (
    SELECT id FROM projects
    WHERE organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  )
);

CREATE POLICY "Users can update field_weld_inspections if they have permission"
ON field_weld_inspections FOR UPDATE
USING (
  project_id IN (
    SELECT id FROM projects
    WHERE organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  )
  AND EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role IN ('owner', 'admin', 'project_manager', 'foreman', 'qc_inspector')  -- QC tracking requires can_update_milestones permission
  )
);

CREATE POLICY "Users can delete field_weld_inspections in their organization"
ON field_weld_inspections FOR DELETE
USING (
  project_id IN (
    SELECT id FROM projects
    WHERE organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  )
  AND EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role IN ('owner', 'admin')  -- Only owner/admin can delete
  )
);

-- ============================================================================
-- MIGRATION COMPLETE: 00011_welder_field_weld_qc.sql
-- ============================================================================
-- Tables created: 2 (welders, field_weld_inspections)
-- Indexes created: ~11 (including PRIMARY KEY, UNIQUE, partial indexes for QC queues)
-- Stored procedures: 1 (get_weld_repair_history)
-- CHECK constraints: 2 (stencil format, repair tracking)
-- Triggers: 1 (auto-update last_updated_at timestamp)
-- RLS policies: ~7 policies (multi-tenant isolation + permission checks for verification and QC updates)
-- Next migration: 00012_exception_audit.sql
-- ============================================================================

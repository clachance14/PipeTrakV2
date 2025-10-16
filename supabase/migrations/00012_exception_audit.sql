-- Migration 00012: Exception & Audit (Sprint 1 Core)
-- Feature: 005-sprint-1-core
-- Phase: 3.6
-- Description: Create exception queue and audit trail tables
--
-- Prerequisites: Migration 00011 must be applied (field_weld_inspections table exists)
--
-- Tables created: needs_review, audit_log
-- Lines: ~300

-- ============================================================================
-- PART 1: TABLES (2 tables)
-- ============================================================================

-- Table 1: needs_review
-- Purpose: Exception queue for items requiring human review (FR-023 to FR-026)
CREATE TABLE needs_review (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  component_id UUID REFERENCES components(id) ON DELETE CASCADE,  -- NULL for project-level reviews

  -- Exception type (FR-023)
  type TEXT NOT NULL CHECK (type IN (
    'out_of_sequence',    -- Milestone completed without prerequisite
    'rollback',           -- Milestone rolled back
    'delta_quantity',     -- Import quantity change detected
    'drawing_change',     -- Component drawing changed
    'similar_drawing',    -- Similar drawing number detected
    'verify_welder'       -- Welder usage threshold reached (needs verification)
  )),

  -- Status (FR-024)
  status TEXT NOT NULL CHECK (status IN ('pending', 'resolved', 'ignored')) DEFAULT 'pending',

  -- Type-specific metadata (FR-025)
  payload JSONB NOT NULL,  -- Examples:
  -- out_of_sequence: {"milestone": "Test", "prerequisite": "Install", "event_id": "uuid"}
  -- delta_quantity: {"group_key": {...}, "old_count": 10, "new_count": 13, "delta": 3}
  -- drawing_change: {"weld_number": "W-001", "old_drawing_id": "uuid", "new_drawing_id": "uuid"}
  -- similar_drawing: {"new_drawing_norm": "P-001", "matches": [{"drawing_id": "uuid", "score": 0.92}, ...]}
  -- verify_welder: {"welder_id": "uuid", "usage_count": 7}

  -- Audit fields
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES users(id),
  resolved_at TIMESTAMPTZ,  -- When resolved/ignored (NULL if pending)
  resolved_by UUID REFERENCES users(id),  -- Who resolved/ignored (NULL if pending)
  resolution_note TEXT  -- Why resolved/ignored
);

COMMENT ON TABLE needs_review IS 'Exception queue for data quality issues requiring human review (FR-023 to FR-026)';
COMMENT ON COLUMN needs_review.type IS 'Exception type: out_of_sequence, rollback, delta_quantity, drawing_change, similar_drawing, verify_welder';
COMMENT ON COLUMN needs_review.payload IS 'Type-specific metadata with context for the exception';

-- Table 2: audit_log
-- Purpose: Comprehensive audit trail for compliance (FR-030 to FR-032)
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),

  -- Action details
  action_type TEXT NOT NULL,  -- Examples: 'milestone_update', 'rollback', 'import', 'resolve_review', 'bulk_update'
  entity_type TEXT NOT NULL,  -- Examples: 'component', 'drawing', 'welder', 'needs_review'
  entity_id UUID,  -- ID of entity that changed (NULL for bulk operations)

  -- Change tracking
  old_value JSONB,  -- State before change
  new_value JSONB,  -- State after change
  reason TEXT,  -- Optional reason for change

  -- Audit timestamp
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE audit_log IS 'Comprehensive audit trail for all data changes (FR-030 to FR-032)';
COMMENT ON COLUMN audit_log.action_type IS 'Type of action: milestone_update, rollback, import, resolve_review, bulk_update, etc.';
COMMENT ON COLUMN audit_log.entity_type IS 'Type of entity changed: component, drawing, welder, needs_review, etc.';

-- ============================================================================
-- PART 2: INDEXES (~8 indexes)
-- ============================================================================

-- needs_review indexes
CREATE INDEX idx_review_project_id ON needs_review(project_id);
CREATE INDEX idx_review_component_id ON needs_review(component_id);
CREATE INDEX idx_review_type ON needs_review(type);
CREATE INDEX idx_review_status ON needs_review(status) WHERE status = 'pending';  -- Partial index for review queue
CREATE INDEX idx_review_created_at ON needs_review(created_at DESC);

-- audit_log indexes
CREATE INDEX idx_audit_project_id ON audit_log(project_id);
CREATE INDEX idx_audit_entity ON audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_user_id ON audit_log(user_id);
CREATE INDEX idx_audit_created_at ON audit_log(created_at DESC);

-- ============================================================================
-- PART 3: RLS POLICIES (~7 policies across 2 tables)
-- ============================================================================

-- Enable RLS on both tables
ALTER TABLE needs_review ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- needs_review policies
CREATE POLICY "Users can view needs_review in their organization"
ON needs_review FOR SELECT
USING (
  project_id IN (
    SELECT id FROM projects
    WHERE organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  )
);

CREATE POLICY "Users can insert needs_review in their organization"
ON needs_review FOR INSERT
WITH CHECK (
  project_id IN (
    SELECT id FROM projects
    WHERE organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  )
);

CREATE POLICY "Users can resolve needs_review if they have permission"
ON needs_review FOR UPDATE
USING (
  project_id IN (
    SELECT id FROM projects
    WHERE organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  )
  AND EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role IN ('owner', 'admin', 'project_manager', 'foreman', 'qc_inspector')  -- Roles with can_resolve_reviews permission (FR-026, FR-047)
  )
);

CREATE POLICY "Users can delete needs_review in their organization"
ON needs_review FOR DELETE
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

-- audit_log policies (read-only for all users in organization)
CREATE POLICY "Users can view audit_log in their organization"
ON audit_log FOR SELECT
USING (
  project_id IN (
    SELECT id FROM projects
    WHERE organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  )
);

CREATE POLICY "Users can insert audit_log entries in their organization"
ON audit_log FOR INSERT
WITH CHECK (
  project_id IN (
    SELECT id FROM projects
    WHERE organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  )
);

-- Note: No UPDATE/DELETE policies on audit_log (immutable audit trail per FR-032)

-- ============================================================================
-- MIGRATION COMPLETE: 00012_exception_audit.sql
-- ============================================================================
-- Tables created: 2 (needs_review, audit_log)
-- Indexes created: ~9 (including PRIMARY KEY, partial index for pending reviews)
-- RLS policies: ~6 policies (multi-tenant isolation + permission checks for resolution)
-- Retention: audit_log retained indefinitely while project active (FR-032, FR-052)
-- Next migration: 00013_performance_optimization.sql
-- ============================================================================

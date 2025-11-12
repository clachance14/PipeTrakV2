-- Migration: RLS policies for template tables
-- Feature: 026-editable-milestone-templates
-- Phase: 2 (Foundational)
-- Task: T009
-- Description: Row Level Security policies for project_progress_templates and project_template_changes

-- ============================================================================
-- RLS Policies for project_progress_templates
-- ============================================================================

-- Policy 1: Project members can view templates
CREATE POLICY "Project members can view templates"
ON project_progress_templates
FOR SELECT
USING (
  project_id IN (
    SELECT id FROM projects
    WHERE organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  )
);

-- Policy 2: Admins and project managers can update templates
CREATE POLICY "Project admins and managers can update templates"
ON project_progress_templates
FOR UPDATE
USING (
  project_id IN (
    SELECT id FROM projects
    WHERE organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  )
  AND (SELECT role FROM users WHERE id = auth.uid()) IN ('owner', 'admin', 'project_manager')
);

-- Policy 3: Admins and project managers can insert templates (via RPC only, but policy needed for trigger)
CREATE POLICY "Project admins and managers can insert templates"
ON project_progress_templates
FOR INSERT
WITH CHECK (
  project_id IN (
    SELECT id FROM projects
    WHERE organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  )
  AND (SELECT role FROM users WHERE id = auth.uid()) IN ('owner', 'admin', 'project_manager')
);

-- Policy 4: No DELETE allowed (preserve templates for audit trail)
-- Intentionally omitted - no DELETE policy means DELETEs will fail

-- ============================================================================
-- RLS Policies for project_template_changes (Audit Table)
-- ============================================================================

-- Policy 1: Project members can view audit log
CREATE POLICY "Project members can view template changes"
ON project_template_changes
FOR SELECT
USING (
  project_id IN (
    SELECT id FROM projects
    WHERE organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  )
);

-- Policy 2: Admins and project managers can insert audit records (via RPC)
CREATE POLICY "Project admins and managers can insert audit records"
ON project_template_changes
FOR INSERT
WITH CHECK (
  project_id IN (
    SELECT id FROM projects
    WHERE organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  )
  AND (SELECT role FROM users WHERE id = auth.uid()) IN ('owner', 'admin', 'project_manager')
);

-- Policy 3: No UPDATE or DELETE allowed (immutable audit log)
-- Intentionally omitted - audit logs should never be modified

COMMENT ON POLICY "Project members can view templates" ON project_progress_templates IS
'Allow all project members to read milestone templates for their projects.';

COMMENT ON POLICY "Project admins and managers can update templates" ON project_progress_templates IS
'Only admins and project managers can modify milestone weights.';

COMMENT ON POLICY "Project admins and managers can insert templates" ON project_progress_templates IS
'Only admins and project managers can create templates (typically via auto-clone trigger).';

COMMENT ON POLICY "Project members can view template changes" ON project_template_changes IS
'Allow all project members to view audit trail of template modifications.';

COMMENT ON POLICY "Project admins and managers can insert audit records" ON project_template_changes IS
'Only admins and project managers can log template changes (via RPC).';

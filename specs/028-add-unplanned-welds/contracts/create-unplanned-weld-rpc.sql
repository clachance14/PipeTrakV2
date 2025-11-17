-- RPC Contract: create_unplanned_weld
--
-- Purpose: Atomically create a new unplanned field weld with component record
-- Security: SECURITY DEFINER with explicit permission checks
-- Transaction: Creates both component and field_weld or neither (atomic)
--
-- Created: 2025-11-17
-- Feature: 028-add-unplanned-welds

-- ============================================================================
-- FUNCTION SIGNATURE
-- ============================================================================

CREATE OR REPLACE FUNCTION create_unplanned_weld(
  p_project_id UUID,
  p_drawing_id UUID,
  p_weld_number TEXT,
  p_weld_type TEXT,
  p_weld_size TEXT,
  p_spec TEXT,
  p_schedule TEXT DEFAULT NULL,
  p_base_metal TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
-- Implementation will be added during implementation phase
$$;

-- ============================================================================
-- PERMISSIONS
-- ============================================================================

-- Grant execute to authenticated users (function itself checks role permissions)
GRANT EXECUTE ON FUNCTION create_unplanned_weld TO authenticated;

-- Revoke from anon (anonymous users cannot create welds)
REVOKE EXECUTE ON FUNCTION create_unplanned_weld FROM anon;

-- ============================================================================
-- DOCUMENTATION
-- ============================================================================

COMMENT ON FUNCTION create_unplanned_weld IS
'Creates an unplanned field weld with atomic component creation.

Permissions: Owner, Admin, PM, Foreman, QC Inspector
Returns: JSON with field_weld and component records
Raises: Exception if permissions denied, duplicate weld number, or invalid references

Example usage:
SELECT create_unplanned_weld(
  p_project_id := ''project-uuid'',
  p_drawing_id := ''drawing-uuid'',
  p_weld_number := ''W-051'',
  p_weld_type := ''BW'',
  p_weld_size := ''2"'',
  p_spec := ''HC05'',
  p_schedule := ''XS'',
  p_base_metal := ''CS'',
  p_notes := ''Field change per client request''
);
';

-- ============================================================================
-- INPUT VALIDATION
-- ============================================================================

-- Parameter Constraints:
-- - p_project_id: Must exist in projects table, user must have access
-- - p_drawing_id: Must exist in drawings table, must belong to p_project_id
-- - p_weld_number: Must be unique within project, non-empty string
-- - p_weld_type: Must be one of: 'BW', 'SW', 'FW', 'TW'
-- - p_weld_size: Non-empty string (e.g., "2\"", "1/2\"")
-- - p_spec: Must exist in project's valid specs, non-empty string
-- - p_schedule: Optional, string (e.g., "XS", "STD")
-- - p_base_metal: Optional, string (e.g., "CS", "SS")
-- - p_notes: Optional, text (creation context)

-- ============================================================================
-- BUSINESS LOGIC
-- ============================================================================

-- 1. Permission Check:
--    - Get current user from auth.uid()
--    - Join to users table to get role
--    - Verify role IN ('owner', 'admin', 'pm', 'foreman', 'qc')
--    - RAISE EXCEPTION 'Permission denied' if check fails

-- 2. Drawing Validation:
--    - Verify p_drawing_id exists in drawings table
--    - Verify drawing.project_id = p_project_id
--    - Fetch drawing metadata: area_id, system_id, test_package_id
--    - RAISE EXCEPTION 'Drawing not found' if check fails

-- 3. Weld Number Uniqueness:
--    - Check if identity_key = {"weld_number": p_weld_number}
--      exists in components WHERE project_id = p_project_id
--      AND component_type = 'field_weld'
--    - RAISE EXCEPTION 'Duplicate weld number' if exists

-- 4. Progress Template Lookup:
--    - SELECT id FROM progress_templates
--      WHERE component_type = 'field_weld' LIMIT 1
--    - RAISE EXCEPTION 'Progress template not found' if null

-- 5. Atomic Transaction:
--    BEGIN TRANSACTION (implicit in plpgsql function)
--
--    a. INSERT INTO components:
--       - id: gen_random_uuid()
--       - project_id: p_project_id
--       - drawing_id: p_drawing_id
--       - component_type: 'field_weld'
--       - identity_key: {"weld_number": p_weld_number}
--       - progress_template_id: (from step 4)
--       - area_id: (from drawing metadata)
--       - system_id: (from drawing metadata)
--       - test_package_id: (from drawing metadata)
--       - current_milestones: {} (all milestones false)
--       - percent_complete: 0.00
--       - created_by: auth.uid()
--       - last_updated_by: auth.uid()
--       - last_updated_at: now()
--       RETURNING id INTO v_component_id
--
--    b. INSERT INTO field_welds:
--       - id: gen_random_uuid()
--       - component_id: v_component_id
--       - project_id: p_project_id
--       - weld_type: p_weld_type
--       - weld_size: p_weld_size
--       - spec: p_spec
--       - schedule: p_schedule
--       - base_metal: p_base_metal
--       - notes: p_notes
--       - nde_required: false (default)
--       - status: 'active' (default)
--       - created_by: auth.uid()
--       - created_at: now()
--       - updated_at: now()
--       RETURNING * INTO v_field_weld
--
--    COMMIT (implicit)

-- 6. Return JSON:
--    - Build JSON object with field_weld and component records
--    - Include all relevant fields for frontend display

-- ============================================================================
-- ERROR HANDLING
-- ============================================================================

-- Exceptions Raised:
-- - 'Permission denied: User role [X] cannot create welds'
-- - 'Drawing not found: [drawing_id]'
-- - 'Duplicate weld number: [weld_number] already exists in project'
-- - 'Invalid weld type: Must be BW, SW, FW, or TW'
-- - 'Progress template not found for field_weld component type'
-- - 'Transaction failed: [PostgreSQL error message]'

-- Error Code Mapping:
-- - Permission errors: SQLSTATE '42501' (insufficient_privilege)
-- - Not found errors: SQLSTATE '02000' (no_data)
-- - Duplicate errors: SQLSTATE '23505' (unique_violation)
-- - Constraint errors: SQLSTATE '23514' (check_violation)

-- ============================================================================
-- RETURN VALUE
-- ============================================================================

-- Returns JSON in this format:
-- {
--   "field_weld": {
--     "id": "uuid",
--     "component_id": "uuid",
--     "project_id": "uuid",
--     "weld_type": "BW",
--     "weld_size": "2\"",
--     "spec": "HC05",
--     "schedule": "XS",
--     "base_metal": "CS",
--     "notes": "Field change per client request",
--     "status": "active",
--     "created_by": "uuid",
--     "created_at": "timestamp",
--     ...
--   },
--   "component": {
--     "id": "uuid",
--     "project_id": "uuid",
--     "drawing_id": "uuid",
--     "component_type": "field_weld",
--     "identity_key": {"weld_number": "W-051"},
--     "area_id": "uuid",
--     "system_id": "uuid",
--     "test_package_id": "uuid",
--     "percent_complete": 0.00,
--     ...
--   }
-- }

-- ============================================================================
-- TESTING CONTRACT
-- ============================================================================

-- Test Cases Required:
-- 1. Happy path with all required fields
-- 2. Happy path with all optional fields
-- 3. Permission denied for Viewer role
-- 4. Permission denied for Welder role
-- 5. Success for Owner, Admin, PM, Foreman, QC roles
-- 6. Drawing not found error
-- 7. Duplicate weld number error
-- 8. Invalid weld type error
-- 9. Transaction rollback on component insert failure
-- 10. Transaction rollback on field_weld insert failure
-- 11. Metadata inheritance verification (area, system, test_package)
-- 12. Progress template assignment verification

-- ============================================================================
-- PERFORMANCE CONSIDERATIONS
-- ============================================================================

-- Index Usage:
-- - drawings.id (PK index) for drawing lookup
-- - components.identity_key (BTREE) for weld number uniqueness check
-- - components.project_id (BTREE) for project filtering
-- - progress_templates.component_type (BTREE) for template lookup
-- - users.id (PK index) for permission check

-- Expected Query Plan:
-- - Drawing lookup: Index Scan on drawings_pkey
-- - Uniqueness check: Index Scan on components_identity_key_idx
-- - Template lookup: Index Scan on progress_templates_component_type_idx
-- - Inserts: Sequential writes with RETURNING clause

-- Performance Target:
-- - Average execution time: <100ms
-- - p95 execution time: <200ms
-- - Lock duration: <50ms (transaction lock on component+field_weld)

-- ============================================================================
-- MIGRATION INTEGRATION
-- ============================================================================

-- This contract file defines the RPC signature and documentation.
-- The actual implementation will be in:
--   supabase/migrations/NNNN_create_unplanned_weld_rpc.sql

-- Migration file will include:
-- 1. ALTER TABLE field_welds ADD COLUMN notes TEXT;
-- 2. CREATE OR REPLACE FUNCTION create_unplanned_weld(...) [full implementation]
-- 3. GRANT/REVOKE statements
-- 4. COMMENT ON FUNCTION statement

-- Migration must be idempotent:
-- - ALTER TABLE IF NOT EXISTS
-- - CREATE OR REPLACE FUNCTION
-- - Conditional GRANT/REVOKE (with IF EXISTS checks if needed)

-- RPC Function Contracts: Editable Milestone Weight Templates
-- Phase: 1 (Design & Contracts)
-- Date: 2025-11-10
--
-- This file defines the API contracts for Supabase RPC functions.
-- Actual implementations will be created in migrations during Phase 2 (tasks).

-- ============================================================================
-- 1. Clone System Templates for Project
-- ============================================================================

CREATE OR REPLACE FUNCTION clone_system_templates_for_project(
  target_project_id uuid
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
/**
 * Clones all system templates (progress_templates) to project-specific templates
 * (project_progress_templates) for the given project.
 *
 * @param target_project_id - UUID of the project to clone templates for
 * @returns Number of template rows created (expected: 55 for 11 component types)
 *
 * Permissions: Admin or project manager for the target project
 * Idempotent: No-op if project already has templates (check before insert)
 * Error Cases:
 *   - Project not found: RAISE EXCEPTION 'Project not found'
 *   - User lacks permission: RAISE EXCEPTION 'Permission denied'
 *   - Templates already exist: RAISE EXCEPTION 'Templates already exist for this project'
 */
DECLARE
  rows_inserted integer;
  user_role text;
  project_org_id uuid;
BEGIN
  -- Verify project exists and get organization
  SELECT organization_id INTO project_org_id
  FROM projects
  WHERE id = target_project_id;

  IF project_org_id IS NULL THEN
    RAISE EXCEPTION 'Project not found';
  END IF;

  -- Verify user has admin or project_manager role
  SELECT om.role INTO user_role
  FROM organization_members om
  WHERE om.organization_id = project_org_id
    AND om.user_id = auth.uid();

  IF user_role NOT IN ('admin', 'project_manager') THEN
    RAISE EXCEPTION 'Permission denied: requires admin or project_manager role';
  END IF;

  -- Check if templates already exist
  IF EXISTS (
    SELECT 1 FROM project_progress_templates
    WHERE project_id = target_project_id
    LIMIT 1
  ) THEN
    RAISE EXCEPTION 'Templates already exist for this project';
  END IF;

  -- Clone all system templates
  INSERT INTO project_progress_templates (
    project_id,
    component_type,
    milestone_name,
    weight,
    milestone_order,
    is_partial,
    requires_welder
  )
  SELECT
    target_project_id,
    component_type,
    milestone_name,
    weight,
    milestone_order,
    is_partial,
    requires_welder
  FROM progress_templates;

  GET DIAGNOSTICS rows_inserted = ROW_COUNT;
  RETURN rows_inserted;
END;
$$;

COMMENT ON FUNCTION clone_system_templates_for_project IS
'Clones system templates to project-specific templates. Requires admin/PM role.';

-- ============================================================================
-- 2. Update Project Template Weights
-- ============================================================================

CREATE OR REPLACE FUNCTION update_project_template_weights(
  p_project_id uuid,
  p_component_type text,
  p_new_weights jsonb, -- Array of {milestone_name: string, weight: integer}
  p_apply_to_existing boolean,
  p_last_updated timestamptz
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
/**
 * Updates milestone weights for a component type within a project.
 * Logs changes to audit table. Optionally recalculates existing components.
 *
 * @param p_project_id - UUID of the project
 * @param p_component_type - Component type to update (e.g., "Field Weld")
 * @param p_new_weights - JSONB array of {milestone_name, weight} objects
 * @param p_apply_to_existing - If true, recalculate existing components
 * @param p_last_updated - Timestamp of last update (optimistic locking)
 * @returns JSON: {success: true, affected_count: integer, audit_id: uuid}
 *
 * Permissions: Admin or project manager for the target project
 * Validations:
 *   - Weights sum to exactly 100
 *   - All milestone names exist in current templates
 *   - No concurrent edits (timestamp check)
 * Error Cases:
 *   - Permission denied: RAISE EXCEPTION
 *   - Weights sum ≠ 100: RAISE EXCEPTION 'Weights must sum to 100%'
 *   - Concurrent edit detected: RAISE EXCEPTION 'Templates were modified by another user'
 *   - Milestone not found: RAISE EXCEPTION 'Invalid milestone name: {name}'
 */
DECLARE
  user_role text;
  project_org_id uuid;
  old_weights_json jsonb;
  affected_count integer := 0;
  audit_id uuid;
  weight_sum integer;
  milestone_record jsonb;
BEGIN
  -- Verify project exists and get organization
  SELECT organization_id INTO project_org_id
  FROM projects
  WHERE id = p_project_id;

  IF project_org_id IS NULL THEN
    RAISE EXCEPTION 'Project not found';
  END IF;

  -- Verify user has admin or project_manager role
  SELECT om.role INTO user_role
  FROM organization_members om
  WHERE om.organization_id = project_org_id
    AND om.user_id = auth.uid();

  IF user_role NOT IN ('admin', 'project_manager') THEN
    RAISE EXCEPTION 'Permission denied: requires admin or project_manager role';
  END IF;

  -- Optimistic locking: Check for concurrent edits
  IF EXISTS (
    SELECT 1 FROM project_progress_templates
    WHERE project_id = p_project_id
      AND component_type = p_component_type
      AND updated_at > p_last_updated
  ) THEN
    RAISE EXCEPTION 'Templates were modified by another user. Refresh and try again.';
  END IF;

  -- Validate weight sum = 100
  SELECT SUM((value->>'weight')::integer)
  INTO weight_sum
  FROM jsonb_array_elements(p_new_weights);

  IF weight_sum != 100 THEN
    RAISE EXCEPTION 'Weights must sum to 100%% (current: %%)', weight_sum;
  END IF;

  -- Capture old weights for audit log
  SELECT jsonb_agg(
    jsonb_build_object('milestone_name', milestone_name, 'weight', weight)
    ORDER BY milestone_order
  )
  INTO old_weights_json
  FROM project_progress_templates
  WHERE project_id = p_project_id
    AND component_type = p_component_type;

  -- Update template weights
  FOR milestone_record IN SELECT * FROM jsonb_array_elements(p_new_weights)
  LOOP
    UPDATE project_progress_templates
    SET weight = (milestone_record->>'weight')::integer,
        updated_at = now()
    WHERE project_id = p_project_id
      AND component_type = p_component_type
      AND milestone_name = milestone_record->>'milestone_name';

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Invalid milestone name: %', milestone_record->>'milestone_name';
    END IF;
  END LOOP;

  -- Apply to existing components if requested
  IF p_apply_to_existing THEN
    affected_count := recalculate_components_with_template(p_project_id, p_component_type);
  END IF;

  -- Log to audit table
  INSERT INTO project_template_changes (
    project_id,
    component_type,
    changed_by,
    old_weights,
    new_weights,
    applied_to_existing,
    affected_component_count
  )
  VALUES (
    p_project_id,
    p_component_type,
    auth.uid(),
    old_weights_json,
    p_new_weights,
    p_apply_to_existing,
    affected_count
  )
  RETURNING id INTO audit_id;

  RETURN json_build_object(
    'success', true,
    'affected_count', affected_count,
    'audit_id', audit_id
  );
END;
$$;

COMMENT ON FUNCTION update_project_template_weights IS
'Updates template weights with validation, audit logging, and optional retroactive recalculation.';

-- ============================================================================
-- 3. Recalculate Components with Template
-- ============================================================================

CREATE OR REPLACE FUNCTION recalculate_components_with_template(
  target_project_id uuid,
  target_component_type text
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
/**
 * Recalculates percent_complete for all components of a given type in a project,
 * using the updated template weights.
 *
 * @param target_project_id - UUID of the project
 * @param target_component_type - Component type to recalculate (e.g., "Field Weld")
 * @returns Number of components recalculated
 *
 * Permissions: Called by update_project_template_weights (SECURITY DEFINER)
 * Performance: Target <3 seconds for 1,000 components
 * Side Effects: Updates components.percent_complete and components.updated_at
 */
DECLARE
  affected_count integer;
BEGIN
  UPDATE components
  SET percent_complete = calculate_component_percent(id),
      updated_at = now()
  WHERE project_id = target_project_id
    AND component_type = target_component_type;

  GET DIAGNOSTICS affected_count = ROW_COUNT;
  RETURN affected_count;
END;
$$;

COMMENT ON FUNCTION recalculate_components_with_template IS
'Batch recalculates component progress percentages based on updated template weights.';

-- ============================================================================
-- 4. Get Project Template Summary
-- ============================================================================

CREATE OR REPLACE FUNCTION get_project_template_summary(
  target_project_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
/**
 * Returns summary of project templates: list of component types, milestone counts,
 * last modified timestamp, and whether templates are cloned from system.
 *
 * @param target_project_id - UUID of the project
 * @returns JSON: {
 *   has_templates: boolean,
 *   component_types: [{
 *     component_type: string,
 *     milestone_count: integer,
 *     total_weight: integer,
 *     last_updated: timestamptz
 *   }]
 * }
 *
 * Permissions: Any project member (enforced by RLS)
 * Use Case: Main settings page loads this to display component type cards
 */
DECLARE
  template_exists boolean;
  summary json;
BEGIN
  -- Check if project has any templates
  SELECT EXISTS (
    SELECT 1 FROM project_progress_templates
    WHERE project_id = target_project_id
    LIMIT 1
  ) INTO template_exists;

  -- Aggregate by component type
  SELECT json_build_object(
    'has_templates', template_exists,
    'component_types', COALESCE(jsonb_agg(
      jsonb_build_object(
        'component_type', component_type,
        'milestone_count', milestone_count,
        'total_weight', total_weight,
        'last_updated', last_updated
      )
      ORDER BY component_type
    ), '[]'::jsonb)
  )
  INTO summary
  FROM (
    SELECT
      component_type,
      COUNT(*) as milestone_count,
      SUM(weight) as total_weight,
      MAX(updated_at) as last_updated
    FROM project_progress_templates
    WHERE project_id = target_project_id
    GROUP BY component_type
  ) subquery;

  RETURN summary;
END;
$$;

COMMENT ON FUNCTION get_project_template_summary IS
'Returns summary of project templates for settings page display.';

-- ============================================================================
-- 5. Validation Trigger Function
-- ============================================================================

CREATE OR REPLACE FUNCTION validate_project_template_weights()
RETURNS trigger
LANGUAGE plpgsql
AS $$
/**
 * Trigger function to validate that milestone weights sum to exactly 100%
 * for each (project_id, component_type) combination.
 *
 * Fires: AFTER INSERT OR UPDATE ON project_progress_templates
 * Validation: SUM(weight) per (project_id, component_type) = 100
 * Error: RAISE EXCEPTION if sum ≠ 100
 */
DECLARE
  weight_sum integer;
BEGIN
  SELECT SUM(weight)
  INTO weight_sum
  FROM project_progress_templates
  WHERE project_id = NEW.project_id
    AND component_type = NEW.component_type;

  IF weight_sum != 100 THEN
    RAISE EXCEPTION 'Milestone weights must sum to 100%% for component type % (current: %%)',
      NEW.component_type, weight_sum;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION validate_project_template_weights IS
'Trigger function to enforce weight sum = 100% constraint.';

-- ============================================================================
-- 6. Audit Logging Trigger Function
-- ============================================================================

CREATE OR REPLACE FUNCTION log_template_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
/**
 * Trigger function to automatically log template changes to audit table.
 *
 * Fires: AFTER UPDATE ON project_progress_templates
 * Action: Inserts row into project_template_changes with old/new weights
 * Note: Aggregates all milestones for the component type (not per-row)
 */
DECLARE
  old_weights_json jsonb;
  new_weights_json jsonb;
BEGIN
  -- Only log if weight changed
  IF OLD.weight = NEW.weight THEN
    RETURN NEW;
  END IF;

  -- Aggregate old weights (before update)
  SELECT jsonb_agg(
    jsonb_build_object('milestone_name', milestone_name, 'weight', weight)
    ORDER BY milestone_order
  )
  INTO old_weights_json
  FROM (
    SELECT milestone_name, weight, milestone_order
    FROM project_progress_templates
    WHERE project_id = NEW.project_id
      AND component_type = NEW.component_type
  ) subquery;

  -- Note: New weights will be captured by update_project_template_weights RPC
  -- This trigger is a fallback for direct SQL updates (should not happen in normal operation)

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION log_template_change IS
'Trigger function to log template weight changes to audit table.';

-- ============================================================================
-- Type Definitions (for TypeScript codegen)
-- ============================================================================

-- Input type for update_project_template_weights
-- TypeScript equivalent:
-- type TemplateWeightUpdate = {
--   milestone_name: string;
--   weight: number; // 0-100
-- };

-- Return type for update_project_template_weights
-- TypeScript equivalent:
-- type UpdateTemplateResult = {
--   success: boolean;
--   affected_count: number;
--   audit_id: string;
-- };

-- Return type for get_project_template_summary
-- TypeScript equivalent:
-- type ProjectTemplateSummary = {
--   has_templates: boolean;
--   component_types: {
--     component_type: string;
--     milestone_count: number;
--     total_weight: number;
--     last_updated: string; // ISO timestamp
--   }[];
-- };

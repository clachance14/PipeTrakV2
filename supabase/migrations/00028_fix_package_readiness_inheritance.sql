-- Migration 00028: Fix Package Readiness Inheritance + Add Package CRUD RPC Functions
-- Feature 012: Test Package Readiness Page Enhancement
-- Purpose:
--   1. Fix mv_package_readiness to count inherited components (via drawing.test_package_id)
--   2. Add description column to materialized view
--   3. Add create_test_package and update_test_package RPC functions for package CRUD

-- ============================================================================
-- Part 1: Recreate mv_package_readiness with Inheritance Support
-- ============================================================================

DROP MATERIALIZED VIEW IF EXISTS mv_package_readiness CASCADE;

CREATE MATERIALIZED VIEW mv_package_readiness AS
SELECT
  tp.id AS package_id,
  tp.project_id,
  tp.name AS package_name,
  tp.description,  -- ✨ NEW: Include description (already exists in test_packages table)
  tp.target_date,
  COUNT(c.id) AS total_components,
  COUNT(c.id) FILTER (WHERE c.percent_complete = 100) AS completed_components,
  AVG(c.percent_complete) AS avg_percent_complete,
  COUNT(nr.id) FILTER (WHERE nr.status = 'pending') AS blocker_count,
  MAX(c.last_updated_at) AS last_activity_at
FROM test_packages tp
LEFT JOIN components c ON
  -- ✨ FIXED: Use COALESCE to count both direct and inherited components
  -- If component.test_package_id is NULL, inherit from drawing.test_package_id
  COALESCE(c.test_package_id, (SELECT d.test_package_id FROM drawings d WHERE d.id = c.drawing_id)) = tp.id
  AND NOT c.is_retired
LEFT JOIN needs_review nr ON nr.component_id = c.id AND nr.status = 'pending'
GROUP BY tp.id, tp.project_id, tp.name, tp.description, tp.target_date;

-- Recreate indexes
CREATE UNIQUE INDEX idx_mv_package_readiness_id ON mv_package_readiness(package_id);
CREATE INDEX idx_mv_package_readiness_project ON mv_package_readiness(project_id);

COMMENT ON MATERIALIZED VIEW mv_package_readiness IS
'Pre-computed aggregation of test package metrics. Counts both directly assigned components (component.test_package_id) and inherited components (component.test_package_id IS NULL AND drawing.test_package_id IS NOT NULL). Updated via refresh_materialized_views() RPC or pg_cron every 60s.';

-- ============================================================================
-- Part 2: create_test_package RPC Function
-- ============================================================================

CREATE OR REPLACE FUNCTION create_test_package(
  p_project_id UUID,
  p_name TEXT,
  p_description TEXT DEFAULT NULL,
  p_target_date DATE DEFAULT NULL,
  p_user_id UUID DEFAULT auth.uid()
) RETURNS UUID AS $$
DECLARE
  v_trimmed_name TEXT;
  v_new_package_id UUID;
BEGIN
  -- Validation: Trim and check name is not empty
  v_trimmed_name := TRIM(p_name);
  IF v_trimmed_name = '' OR v_trimmed_name IS NULL THEN
    RAISE EXCEPTION 'Package name cannot be empty';
  END IF;

  -- Validation: Description max 100 characters
  IF p_description IS NOT NULL AND LENGTH(p_description) > 100 THEN
    RAISE EXCEPTION 'Description max 100 characters';
  END IF;

  -- Validation: Project exists and user has access (RLS enforced via INSERT)
  -- Foreign key constraint will raise error if project_id is invalid

  -- Insert new package
  INSERT INTO test_packages (project_id, name, description, target_date)
  VALUES (p_project_id, v_trimmed_name, p_description, p_target_date)
  RETURNING id INTO v_new_package_id;

  RETURN v_new_package_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

COMMENT ON FUNCTION create_test_package IS
'Creates a new test package with validation. Returns package UUID on success. Raises exception on validation failure (empty name, description >100 chars, invalid project).';

-- ============================================================================
-- Part 3: update_test_package RPC Function
-- ============================================================================

CREATE OR REPLACE FUNCTION update_test_package(
  p_package_id UUID,
  p_name TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_target_date DATE DEFAULT NULL,
  p_user_id UUID DEFAULT auth.uid()
) RETURNS JSONB AS $$
DECLARE
  v_trimmed_name TEXT;
  v_rows_affected INTEGER;
  v_update_query TEXT;
  v_set_clauses TEXT[] := ARRAY[]::TEXT[];
BEGIN
  -- Validation: If name provided, trim and check not empty
  IF p_name IS NOT NULL THEN
    v_trimmed_name := TRIM(p_name);
    IF v_trimmed_name = '' THEN
      RETURN jsonb_build_object('error', 'Package name cannot be empty');
    END IF;
  END IF;

  -- Validation: If description provided, check max 100 characters
  IF p_description IS NOT NULL AND LENGTH(p_description) > 100 THEN
    RETURN jsonb_build_object('error', 'Description max 100 characters');
  END IF;

  -- Build dynamic UPDATE statement with non-NULL parameters only
  IF p_name IS NOT NULL THEN
    v_set_clauses := array_append(v_set_clauses, 'name = ' || quote_literal(v_trimmed_name));
  END IF;

  IF p_description IS NOT NULL THEN
    v_set_clauses := array_append(v_set_clauses, 'description = ' || quote_nullable(p_description));
  END IF;

  IF p_target_date IS NOT NULL THEN
    v_set_clauses := array_append(v_set_clauses, 'target_date = ' || quote_nullable(p_target_date));
  END IF;

  -- If no fields to update, return success (no-op)
  IF array_length(v_set_clauses, 1) IS NULL THEN
    RETURN jsonb_build_object('success', true);
  END IF;

  -- Execute UPDATE
  v_update_query := 'UPDATE test_packages SET ' || array_to_string(v_set_clauses, ', ') ||
                    ' WHERE id = ' || quote_literal(p_package_id);
  EXECUTE v_update_query;

  -- Check if row was updated (RLS might hide row)
  GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
  IF v_rows_affected = 0 THEN
    RETURN jsonb_build_object('error', 'Package not found');
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

COMMENT ON FUNCTION update_test_package IS
'Updates test package fields. Only updates non-NULL parameters. Returns {success: true} or {error: "message"}. Supports clearing description by passing empty string. RLS enforced via SECURITY DEFINER.';

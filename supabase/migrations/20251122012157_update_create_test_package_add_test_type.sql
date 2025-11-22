-- Migration: Update create_test_package to accept test_type parameter
-- Reason: Migration 00121 added test_type column but didn't update the RPC function
-- Feature: 030-test-package-workflow

-- Drop old function signature first (prevents overload ambiguity)
DROP FUNCTION IF EXISTS create_test_package(UUID, TEXT, TEXT, DATE, UUID);

CREATE OR REPLACE FUNCTION create_test_package(
  p_project_id UUID,
  p_name TEXT,
  p_description TEXT DEFAULT NULL,
  p_target_date DATE DEFAULT NULL,
  p_test_type TEXT DEFAULT NULL,
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

  -- Validation: test_type must be valid (or NULL)
  -- CHECK constraint on table will enforce this, but we can provide clearer error message
  IF p_test_type IS NOT NULL AND p_test_type NOT IN (
    'Sensitive Leak Test',
    'Pneumatic Test',
    'Alternative Leak Test',
    'In-service Test',
    'Hydrostatic Test',
    'Other'
  ) THEN
    RAISE EXCEPTION 'Invalid test_type. Must be one of: Sensitive Leak Test, Pneumatic Test, Alternative Leak Test, In-service Test, Hydrostatic Test, Other';
  END IF;

  -- Insert new package with test_type
  INSERT INTO test_packages (project_id, name, description, target_date, test_type)
  VALUES (p_project_id, v_trimmed_name, p_description, p_target_date, p_test_type)
  RETURNING id INTO v_new_package_id;

  RETURN v_new_package_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

COMMENT ON FUNCTION create_test_package(UUID, TEXT, TEXT, DATE, TEXT, UUID) IS
'Creates a new test package with validation. Returns package UUID on success. Raises exception on validation failure (empty name, description >100 chars, invalid test_type, invalid project).';

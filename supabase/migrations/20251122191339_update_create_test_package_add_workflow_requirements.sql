-- Migration: Update create_test_package to accept coating/insulation parameters
-- Reason: Workflow logic matrix requires these flags for dynamic stage creation
-- Feature: Test Package Workflow Logic Matrix

-- Drop old function signature first (prevents overload ambiguity)
DROP FUNCTION IF EXISTS create_test_package(UUID, TEXT, TEXT, DATE, TEXT, UUID);

CREATE OR REPLACE FUNCTION create_test_package(
  p_project_id UUID,
  p_name TEXT,
  p_description TEXT DEFAULT NULL,
  p_target_date DATE DEFAULT NULL,
  p_test_type TEXT DEFAULT NULL,
  p_requires_coating BOOLEAN DEFAULT false,
  p_requires_insulation BOOLEAN DEFAULT false,
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

  -- Insert new package with all fields including workflow requirements
  INSERT INTO test_packages (
    project_id,
    name,
    description,
    target_date,
    test_type,
    requires_coating,
    requires_insulation
  )
  VALUES (
    p_project_id,
    v_trimmed_name,
    p_description,
    p_target_date,
    p_test_type,
    p_requires_coating,
    p_requires_insulation
  )
  RETURNING id INTO v_new_package_id;

  RETURN v_new_package_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

COMMENT ON FUNCTION create_test_package(UUID, TEXT, TEXT, DATE, TEXT, BOOLEAN, BOOLEAN, UUID) IS
'Creates a new test package with workflow requirements. Returns package UUID on success. Raises exception on validation failure.';

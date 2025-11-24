-- Migration: Update create_test_package to accept test pressure parameters
-- Reason: Pressure-based tests (Hydrostatic, Pneumatic) require test pressure at creation
-- Feature: Test Pressure in Package Creation

-- Drop old function signature first (prevents overload ambiguity)
DROP FUNCTION IF EXISTS create_test_package(UUID, TEXT, TEXT, DATE, TEXT, BOOLEAN, BOOLEAN, UUID);

CREATE OR REPLACE FUNCTION create_test_package(
  p_project_id UUID,
  p_name TEXT,
  p_description TEXT DEFAULT NULL,
  p_target_date DATE DEFAULT NULL,
  p_test_type TEXT DEFAULT NULL,
  p_requires_coating BOOLEAN DEFAULT false,
  p_requires_insulation BOOLEAN DEFAULT false,
  p_test_pressure NUMERIC DEFAULT NULL,
  p_test_pressure_unit TEXT DEFAULT 'PSIG',
  p_user_id UUID DEFAULT auth.uid()
) RETURNS UUID AS $$
DECLARE
  v_trimmed_name TEXT;
  v_new_package_id UUID;
  v_is_pressure_test BOOLEAN;
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

  -- Check if this is a pressure-based test
  v_is_pressure_test := p_test_type IN ('Hydrostatic Test', 'Pneumatic Test');

  -- Validation: Pressure required for pressure-based tests
  IF v_is_pressure_test THEN
    IF p_test_pressure IS NULL OR p_test_pressure <= 0 THEN
      RAISE EXCEPTION 'Test pressure is required and must be greater than 0 for % tests', p_test_type;
    END IF;
  END IF;

  -- Validation: test_pressure_unit must be valid
  IF p_test_pressure_unit IS NOT NULL AND p_test_pressure_unit NOT IN ('PSIG', 'BAR', 'KPA', 'PSI') THEN
    RAISE EXCEPTION 'Invalid test_pressure_unit. Must be one of: PSIG, BAR, KPA, PSI';
  END IF;

  -- Insert new package with all fields including pressure
  INSERT INTO test_packages (
    project_id,
    name,
    description,
    target_date,
    test_type,
    requires_coating,
    requires_insulation,
    test_pressure,
    test_pressure_unit
  )
  VALUES (
    p_project_id,
    v_trimmed_name,
    p_description,
    p_target_date,
    p_test_type,
    p_requires_coating,
    p_requires_insulation,
    p_test_pressure,
    p_test_pressure_unit
  )
  RETURNING id INTO v_new_package_id;

  RETURN v_new_package_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

COMMENT ON FUNCTION create_test_package(UUID, TEXT, TEXT, DATE, TEXT, BOOLEAN, BOOLEAN, NUMERIC, TEXT, UUID) IS
'Creates a new test package with workflow requirements and test pressure. Returns package UUID on success. Raises exception on validation failure. Test pressure is required for Hydrostatic and Pneumatic tests.';

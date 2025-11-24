/**
 * Package Domain Types
 *
 * TypeScript interfaces for test package entities based on database schema.
 * See: specs/030-test-package-workflow/data-model.md
 */

/**
 * Test Type Enum
 *
 * Valid values for test_type column on test_packages table.
 * Matches CHECK constraint in migration 00121.
 */
export type TestType =
  | 'Sensitive Leak Test'
  | 'Pneumatic Test'
  | 'Alternative Leak Test'
  | 'In-service Test'
  | 'Hydrostatic Test'
  | 'Other';

/**
 * Test Pressure Unit Enum
 *
 * Valid values for test_pressure_unit column on test_packages table.
 */
export type TestPressureUnit = 'PSIG' | 'BAR' | 'KPA' | 'PSI';

/**
 * Test Package (Base)
 *
 * Extends existing test_packages table with test_type column.
 * Corresponds to database table: test_packages
 */
export interface TestPackage {
  id: string;
  project_id: string;
  name: string;
  description: string | null;
  test_type: TestType | null;
  target_date: string | null; // ISO 8601 date string
  test_pressure: number | null; // Required for pressure-based tests
  test_pressure_unit: TestPressureUnit | null; // Unit of measurement
  created_at: string; // ISO 8601 timestamp
}

/**
 * Test Package with Stats
 *
 * Extends TestPackage with computed statistics from materialized views.
 * Used for package list display.
 */
export interface TestPackageWithStats extends TestPackage {
  total_components: number;
  avg_percent_complete: number;
  blocker_count: number;
  has_certificate: boolean;
  workflow_progress: number; // 0-100% (completed stages / total stages)
}

/**
 * Test Package Create Input
 *
 * Input for creating new test package.
 * Validates against FR-001, FR-002.
 */
export interface TestPackageCreateInput {
  project_id: string;
  name: string;
  description?: string | null;
  test_type: TestType;
  target_date?: string | null; // ISO 8601 date string
  test_pressure?: number | null; // Required for Hydrostatic/Pneumatic tests
  test_pressure_unit?: TestPressureUnit; // Defaults to PSIG
}

/**
 * Test Package Update Input
 *
 * Input for updating existing test package.
 * All fields optional (partial update).
 */
export interface TestPackageUpdateInput {
  name?: string;
  description?: string | null;
  test_type?: TestType | null;
  target_date?: string | null;
  test_pressure?: number | null;
  test_pressure_unit?: TestPressureUnit | null;
}

// Backward compatibility aliases for existing code
export type Package = TestPackageWithStats;

// Extend create/update payloads to support old RPC parameter names (make base fields optional)
export interface CreatePackagePayload extends Partial<TestPackageCreateInput> {
  p_project_id?: string;
  p_name?: string;
  p_description?: string | null;
  p_target_date?: string | null;
  p_test_type?: string; // Accepts any string (including custom test types)
  p_requires_coating?: boolean;
  p_requires_insulation?: boolean;
  p_test_pressure?: number | null;
  p_test_pressure_unit?: string; // Accepts 'PSIG', 'BAR', 'KPA', 'PSI'
}

export interface UpdatePackagePayload extends TestPackageUpdateInput {
  p_package_id?: string;
  p_name?: string;
  p_description?: string | null;
  p_target_date?: string | null;
}

export type UpdatePackageResponse = TestPackage | { error?: string };

export interface PackageComponent {
  id: string;
  drawing_id?: string;
  drawing_no_norm?: string;
  drawing_test_package_id?: string;
  component_type?: string;
  identity_key?: string;
  identityDisplay?: string;
  component_identity?: string;  // Make optional for backward compat
  test_package_id?: string;
  percent_complete?: number;  // Make optional for backward compat
  current_milestone_name?: string | null;  // Make optional for backward compat
  current_milestones?: any;
  progress_template_id?: string;
  milestones_config?: any;
}

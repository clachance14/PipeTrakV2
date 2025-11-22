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
}

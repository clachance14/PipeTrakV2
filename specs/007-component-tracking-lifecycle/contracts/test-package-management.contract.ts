/**
 * API Contract: Test Package Management
 * Feature 007: Component Tracking & Lifecycle Management
 *
 * Defines the API surface for test package CRUD operations.
 * Tests will validate implementations match these contracts.
 */

import type { Database } from '@/types/database.types';

type TestPackage = Database['public']['Tables']['test_packages']['Row'];
type PostgrestError = { message: string; code: string; details: string };

/**
 * useCreateTestPackage() - Create new test package
 *
 * Request: { name: string, description?: string, target_date?: Date, project_id: UUID }
 * Response: { test_package: TestPackage } | { error: PostgrestError }
 *
 * Behavior:
 * - Validates unique name within project (enforced by idx_test_packages_project_name)
 * - Name max 100 chars
 * - Description optional (max 500 chars)
 * - target_date optional (warn if past date, but allow)
 * - Returns created test package with id, created_at, updated_at
 */
export interface CreateTestPackageRequest {
  project_id: string;
  name: string;
  description?: string;
  target_date?: Date | string; // Accept Date or ISO string
}

export interface CreateTestPackageResponse {
  test_package?: TestPackage;
  error?: PostgrestError;
}

/**
 * useUpdateTestPackage() - Edit test package
 *
 * Request: { id: UUID, name?: string, description?: string, target_date?: Date }
 * Response: { test_package: TestPackage } | { error: PostgrestError }
 *
 * Behavior:
 * - At least one of name, description, or target_date must be provided
 * - Validates unique name within project if name is updated
 * - Updates updated_at timestamp automatically
 */
export interface UpdateTestPackageRequest {
  id: string;
  name?: string;
  description?: string;
  target_date?: Date | string;
}

export interface UpdateTestPackageResponse {
  test_package?: TestPackage;
  error?: PostgrestError;
}

/**
 * useDeleteTestPackage() - Delete test package
 *
 * Request: { id: UUID }
 * Response: { success: boolean } | { error: PostgrestError }
 *
 * Behavior:
 * - Sets component.test_package_id to NULL for any assigned components (CASCADE SET NULL)
 * - Should warn user if components assigned before deletion
 * - Soft delete (sets deleted_at) - NOT implemented yet, hard delete for now
 */
export interface DeleteTestPackageRequest {
  id: string;
}

export interface DeleteTestPackageResponse {
  success?: boolean;
  error?: PostgrestError;
}

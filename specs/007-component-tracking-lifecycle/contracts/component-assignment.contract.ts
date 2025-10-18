/**
 * API Contract: Component Assignment
 * Feature 007: Component Tracking & Lifecycle Management
 *
 * Defines the API surface for bulk component assignment operations.
 * Tests will validate implementations match these contracts.
 */

type PostgrestError = { message: string; code: string; details: string };

/**
 * useAssignComponents() - Bulk assign components to area/system/test package
 *
 * Request: { component_ids: UUID[], area_id?: UUID, system_id?: UUID, test_package_id?: UUID }
 * Response: { updated_count: number } | { error: PostgrestError }
 *
 * Behavior:
 * - Batch update multiple components in single transaction
 * - At least ONE of area_id, system_id, test_package_id must be provided
 * - Validates that area/system/test_package exists in the same project
 * - Component IDs must belong to the same project
 * - Null values allowed (unassign)
 * - Updates last_updated_at and last_updated_by for all components
 * - Returns count of successfully updated components
 */
export interface AssignComponentsRequest {
  component_ids: string[]; // Array of component UUIDs
  area_id?: string | null;
  system_id?: string | null;
  test_package_id?: string | null;
}

export interface AssignComponentsResponse {
  updated_count?: number;
  error?: PostgrestError;
}

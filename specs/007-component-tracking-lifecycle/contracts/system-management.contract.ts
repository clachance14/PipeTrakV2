/**
 * API Contract: System Management
 * Feature 007: Component Tracking & Lifecycle Management
 *
 * Defines the API surface for system CRUD operations.
 * Tests will validate implementations match these contracts.
 */

import type { Database } from '@/types/database.types';

type System = Database['public']['Tables']['systems']['Row'];
type PostgrestError = { message: string; code: string; details: string };

/**
 * useCreateSystem() - Create new system
 *
 * Request: { name: string, description?: string, project_id: UUID }
 * Response: { system: System } | { error: PostgrestError }
 *
 * Behavior:
 * - Validates unique name within project (enforced by idx_systems_project_name)
 * - Trims whitespace from name
 * - Description optional (max 500 chars)
 * - Returns created system with id, created_at, updated_at
 */
export interface CreateSystemRequest {
  project_id: string;
  name: string;
  description?: string;
}

export interface CreateSystemResponse {
  system?: System;
  error?: PostgrestError;
}

/**
 * useUpdateSystem() - Edit system name/description
 *
 * Request: { id: UUID, name?: string, description?: string }
 * Response: { system: System } | { error: PostgrestError }
 *
 * Behavior:
 * - At least one of name or description must be provided
 * - Validates unique name within project if name is updated
 * - Updates updated_at timestamp automatically
 */
export interface UpdateSystemRequest {
  id: string;
  name?: string;
  description?: string;
}

export interface UpdateSystemResponse {
  system?: System;
  error?: PostgrestError;
}

/**
 * useDeleteSystem() - Delete system
 *
 * Request: { id: UUID }
 * Response: { success: boolean } | { error: PostgrestError }
 *
 * Behavior:
 * - Sets component.system_id to NULL for any assigned components (CASCADE SET NULL)
 * - Should warn user if components assigned before deletion
 * - Soft delete (sets deleted_at) - NOT implemented yet, hard delete for now
 */
export interface DeleteSystemRequest {
  id: string;
}

export interface DeleteSystemResponse {
  success?: boolean;
  error?: PostgrestError;
}

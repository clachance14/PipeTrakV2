/**
 * API Contract: Area Management
 * Feature 007: Component Tracking & Lifecycle Management
 *
 * Defines the API surface for area CRUD operations.
 * Tests will validate implementations match these contracts.
 */

import type { Database } from '@/types/database.types';

type Area = Database['public']['Tables']['areas']['Row'];
type PostgrestError = { message: string; code: string; details: string };

/**
 * useCreateArea() - Create new area
 *
 * Request: { name: string, description?: string, project_id: UUID }
 * Response: { area: Area } | { error: PostgrestError }
 *
 * Behavior:
 * - Validates unique name within project (enforced by idx_areas_project_name)
 * - Trims whitespace from name
 * - Description optional (max 500 chars)
 * - Returns created area with id, created_at, updated_at
 */
export interface CreateAreaRequest {
  project_id: string;
  name: string;
  description?: string;
}

export interface CreateAreaResponse {
  area?: Area;
  error?: PostgrestError;
}

/**
 * useUpdateArea() - Edit area name/description
 *
 * Request: { id: UUID, name?: string, description?: string }
 * Response: { area: Area } | { error: PostgrestError }
 *
 * Behavior:
 * - At least one of name or description must be provided
 * - Validates unique name within project if name is updated
 * - Updates updated_at timestamp automatically
 */
export interface UpdateAreaRequest {
  id: string;
  name?: string;
  description?: string;
}

export interface UpdateAreaResponse {
  area?: Area;
  error?: PostgrestError;
}

/**
 * useDeleteArea() - Delete area
 *
 * Request: { id: UUID }
 * Response: { success: boolean } | { error: PostgrestError }
 *
 * Behavior:
 * - Sets component.area_id to NULL for any assigned components (CASCADE SET NULL)
 * - Should warn user if components assigned before deletion
 * - Soft delete (sets deleted_at) - NOT implemented yet, hard delete for now
 */
export interface DeleteAreaRequest {
  id: string;
}

export interface DeleteAreaResponse {
  success?: boolean;
  error?: PostgrestError;
}

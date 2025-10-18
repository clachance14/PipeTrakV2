/**
 * API Contract: Component List & Filtering
 * Feature 007: Component Tracking & Lifecycle Management
 *
 * Defines the API surface for component list query with server-side filtering.
 * Tests will validate implementations match these contracts.
 */

import type { Database } from '@/types/database.types';

type Component = Database['public']['Tables']['components']['Row'];
type PostgrestError = { message: string; code: string; details: string };

/**
 * useComponents() - Fetch components with server-side filtering
 *
 * Request: { project_id: UUID, filters?: ComponentFilters, page?: number, limit?: number }
 * Response: { components: Component[], total_count: number } | { error: PostgrestError }
 *
 * Behavior:
 * - Server-side filtering via Supabase query (uses indexed columns)
 * - All filters optional
 * - Pagination for >1000 components
 * - Joins with drawing, area, system, test_package, progress_template for list display
 * - Orders by last_updated_at DESC (most recent first)
 * - Returns total_count for pagination UI
 *
 * Performance:
 * - Must return results <500ms (NFR-005)
 * - Uses database indexes: idx_components_area_id, idx_components_system_id,
 *   idx_components_type, idx_components_percent
 */
export interface ComponentFilters {
  area_id?: string;          // Filter by area UUID
  system_id?: string;        // Filter by system UUID
  component_type?: string;   // Filter by type (spool, field_weld, etc.)
  drawing_id?: string;       // Filter by drawing UUID
  test_package_id?: string;  // Filter by test package UUID
  progress_min?: number;     // Filter by min % complete (0-100)
  progress_max?: number;     // Filter by max % complete (0-100)
  search?: string;           // Search identity_key (partial match, case-insensitive)
}

export interface UseComponentsRequest {
  project_id: string;
  filters?: ComponentFilters;
  page?: number;   // Page number (default: 1)
  limit?: number;  // Items per page (default: 100)
}

export interface UseComponentsResponse {
  components?: Array<Component & {
    drawing?: { drawing_no_norm: string; title: string };
    area?: { name: string };
    system?: { name: string };
    test_package?: { name: string };
    progress_template?: {
      component_type: string;
      milestones_config: Array<{
        name: string;
        weight: number;
        order: number;
        is_partial?: boolean;
      }>;
    };
  }>;
  total_count?: number;
  error?: PostgrestError;
}

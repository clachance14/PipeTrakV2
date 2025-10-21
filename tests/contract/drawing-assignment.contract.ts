/**
 * Contract: Drawing Assignment API
 *
 * Defines the interface for assigning Areas, Systems, and Test Packages to drawings
 * with automatic inheritance to unassigned components.
 *
 * Functional Requirements Covered:
 * - FR-001 to FR-006: Drawing assignment UI and dropdowns
 * - FR-007 to FR-016: Bulk assignment with "No Change" option
 * - FR-021 to FR-025: Inheritance behavior and atomic transactions
 */

export type MetadataValue = 'NO_CHANGE' | string | null | undefined;

/**
 * Payload for assigning metadata to a single drawing
 */
export interface DrawingAssignmentPayload {
  /** UUID of the drawing to update */
  drawing_id: string;

  /** Area UUID, null to clear, undefined to leave unchanged */
  area_id?: string | null;

  /** System UUID, null to clear, undefined to leave unchanged */
  system_id?: string | null;

  /** Test Package UUID, null to clear, undefined to leave unchanged */
  test_package_id?: string | null;

  /** UUID of user performing the assignment (from AuthContext) */
  user_id: string;
}

/**
 * Payload for bulk-assigning metadata to multiple drawings
 */
export interface BulkDrawingAssignmentPayload {
  /** Array of drawing UUIDs (max 50 per FR-014) */
  drawing_ids: string[];

  /** 'NO_CHANGE' to preserve existing, UUID to assign, null to clear */
  area_id?: MetadataValue;

  /** 'NO_CHANGE' to preserve existing, UUID to assign, null to clear */
  system_id?: MetadataValue;

  /** 'NO_CHANGE' to preserve existing, UUID to assign, null to clear */
  test_package_id?: MetadataValue;

  /** UUID of user performing the assignment */
  user_id: string;
}

/**
 * Summary returned after assignment operation
 * Shows how many components inherited vs kept existing assignments
 */
export interface InheritanceSummary {
  /** Whether the drawing metadata was successfully updated */
  drawing_updated: boolean;

  /** Count of components that inherited new values (were NULL before) */
  components_inherited: number;

  /** Count of components that kept existing assignments (were not NULL) */
  components_kept_existing: number;
}

/**
 * Contract interface for drawing assignment operations
 */
export interface DrawingAssignmentContract {
  /**
   * Assign metadata to a single drawing with automatic inheritance
   *
   * @param params - Drawing assignment payload
   * @returns Promise resolving to inheritance summary
   * @throws Error if drawing not found, user lacks permission, or database error
   *
   * Behavior (from research.md decision #1):
   * 1. Updates drawing.area_id, system_id, test_package_id
   * 2. Finds all components where field IS NULL
   * 3. Sets those components' fields to drawing's values
   * 4. Returns count of components inherited vs kept existing
   * 5. All operations in single atomic transaction
   */
  assignDrawing(params: DrawingAssignmentPayload): Promise<InheritanceSummary>;

  /**
   * Assign metadata to multiple drawings in a single operation
   *
   * @param params - Bulk assignment payload
   * @returns Promise resolving to array of inheritance summaries (one per drawing)
   * @throws Error if any drawing not found, user lacks permission, or database error
   *
   * Constraints:
   * - Max 50 drawings per operation (FR-014)
   * - All-or-nothing transaction (all succeed or all rollback)
   * - 'NO_CHANGE' value preserves existing drawing metadata
   */
  assignDrawings(params: BulkDrawingAssignmentPayload): Promise<InheritanceSummary[]>;
}

/**
 * Expected database implementation:
 *
 * CREATE OR REPLACE FUNCTION assign_drawing_with_inheritance(
 *   p_drawing_id UUID,
 *   p_area_id UUID DEFAULT NULL,
 *   p_system_id UUID DEFAULT NULL,
 *   p_test_package_id UUID DEFAULT NULL,
 *   p_user_id UUID
 * ) RETURNS JSONB AS $$
 * -- Updates drawing + inherits to NULL components
 * -- Returns { drawing_updated, components_inherited, components_kept_existing }
 * $$ LANGUAGE plpgsql SECURITY DEFINER;
 *
 * CREATE OR REPLACE FUNCTION assign_drawings_bulk(
 *   p_drawing_ids UUID[],
 *   p_area_id TEXT DEFAULT NULL,  -- Accepts 'NO_CHANGE' string literal
 *   p_system_id TEXT DEFAULT NULL,
 *   p_test_package_id TEXT DEFAULT NULL,
 *   p_user_id UUID
 * ) RETURNS JSONB[] AS $$
 * -- Loops over drawing_ids, calls assign_drawing_with_inheritance for each
 * -- Returns array of summaries
 * $$ LANGUAGE plpgsql SECURITY DEFINER;
 */

/**
 * Example usage in TanStack Query mutation:
 *
 * ```typescript
 * import { useMutation, useQueryClient } from '@tanstack/react-query';
 * import { supabase } from '@/lib/supabase';
 *
 * export function useAssignDrawings() {
 *   const queryClient = useQueryClient();
 *
 *   return useMutation({
 *     mutationFn: async (params: DrawingAssignmentPayload) => {
 *       const { data, error } = await supabase.rpc('assign_drawing_with_inheritance', params);
 *       if (error) throw error;
 *       return data as InheritanceSummary;
 *     },
 *
 *     onMutate: async (params) => {
 *       // Optimistic update (research.md decision #2)
 *       await queryClient.cancelQueries({ queryKey: ['drawings-with-progress'] });
 *       const previousDrawings = queryClient.getQueryData(['drawings-with-progress']);
 *       queryClient.setQueryData(['drawings-with-progress'], (old) => {
 *         return old?.map(d =>
 *           d.id === params.drawing_id
 *             ? { ...d, area_id: params.area_id, system_id: params.system_id, test_package_id: params.test_package_id }
 *             : d
 *         );
 *       });
 *       return { previousDrawings };
 *     },
 *
 *     onError: (err, variables, context) => {
 *       // Rollback optimistic update
 *       queryClient.setQueryData(['drawings-with-progress'], context?.previousDrawings);
 *       toast.error(`Failed: ${err.message}`);
 *     },
 *
 *     onSuccess: (data) => {
 *       queryClient.invalidateQueries({ queryKey: ['drawings-with-progress'] });
 *       queryClient.invalidateQueries({ queryKey: ['components'] });
 *       toast.success(`Success. ${data.components_inherited} components inherited.`);
 *     },
 *   });
 * }
 * ```
 */

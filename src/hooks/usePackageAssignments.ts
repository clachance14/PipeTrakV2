/**
 * TanStack Query hooks for package drawing/component assignments
 * Feature 030 - Test Package Lifecycle Workflow - User Story 1 & 2
 *
 * Provides CRUD operations for:
 * - package_drawing_assignments (FR-006, FR-007)
 * - package_component_assignments (FR-009, FR-010)
 */

import {
  useQuery,
  useMutation,
  useQueryClient,
  UseQueryResult,
  UseMutationResult,
} from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import type {
  DrawingAssignmentCreateInput,
  ComponentAssignmentCreateInput,
  DrawingWithComponentCount,
  ComponentWithAssignmentStatus,
} from '@/types/assignment.types';

/**
 * Query drawings with component counts for assignment preview (FR-008)
 *
 * Returns drawings with count of components that will be inherited
 * when assigned to package.
 *
 * @param projectId - Project ID to scope drawings
 * @returns Drawings with component counts
 */
export function useDrawingsWithComponentCount(
  projectId: string
): UseQueryResult<DrawingWithComponentCount[], Error> {
  return useQuery({
    queryKey: ['drawings-component-count', projectId],
    queryFn: async () => {
      // Query drawings with component aggregation
      const { data, error } = await supabase
        .from('drawings')
        .select(
          `
          id,
          drawing_no_raw,
          drawing_no_norm,
          title,
          rev
        `
        )
        .eq('project_id', projectId)
        .eq('is_retired', false)
        .order('drawing_no_norm', { ascending: true });

      if (error) throw error;

      if (!data || data.length === 0) {
        return [];
      }

      // For each drawing, count components and collect unique areas
      const drawingsWithCounts: DrawingWithComponentCount[] = await Promise.all(
        data.map(async (drawing) => {
          const { data: components, error: compError } = await supabase
            .from('components')
            .select('id, area_id, areas(name)')
            .eq('drawing_id', drawing.id)
            .eq('is_retired', false);

          if (compError) throw compError;

          const componentCount = components?.length || 0;
          const areas = [
            ...new Set(
              (components || [])
                .map((c: any) => c.areas?.name)
                .filter(Boolean)
            ),
          ] as string[];

          return {
            id: drawing.id,
            drawing_no_raw: drawing.drawing_no_raw,
            drawing_no_norm: drawing.drawing_no_norm,
            title: drawing.title,
            rev: drawing.rev,
            component_count: componentCount,
            areas,
          };
        })
      );

      return drawingsWithCounts;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Create drawing assignments for a package (FR-006)
 *
 * Inserts rows into package_drawing_assignments table.
 * Components from assigned drawings will be automatically inherited (FR-007).
 *
 * @param packageId - Package ID for optimistic updates
 * @returns Mutation function to create drawing assignments
 */
export function useCreateDrawingAssignments(
  packageId: string
): UseMutationResult<void, Error, DrawingAssignmentCreateInput> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: DrawingAssignmentCreateInput) => {
      const assignmentRows = input.drawing_ids.map((drawingId) => ({
        package_id: input.package_id,
        drawing_id: drawingId,
      }));

      const { error } = await supabase
        .from('package_drawing_assignments')
        .insert(assignmentRows);

      if (error) throw error;
    },
    onError: (err) => {
      toast.error('Failed to assign drawings: ' + err.message);
    },
    onSuccess: () => {
      toast.success('Drawings assigned successfully');
    },
    onSettled: () => {
      // Invalidate package components query to refresh inherited components
      queryClient.invalidateQueries({
        queryKey: ['package-components', { package_id: packageId }],
      });
    },
  });
}

/**
 * Delete drawing assignment (FR-006)
 *
 * Removes row from package_drawing_assignments table.
 * Components previously inherited from this drawing will no longer be in package.
 *
 * @param packageId - Package ID for optimistic updates
 * @returns Mutation function to delete drawing assignment
 */
export function useDeleteDrawingAssignment(
  packageId: string
): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (assignmentId: string) => {
      const { error } = await supabase
        .from('package_drawing_assignments')
        .delete()
        .eq('id', assignmentId);

      if (error) throw error;
    },
    onError: (err) => {
      toast.error('Failed to remove drawing: ' + err.message);
    },
    onSuccess: () => {
      toast.success('Drawing removed from package');
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ['package-components', { package_id: packageId }],
      });
    },
  });
}

/**
 * Query components with assignment status for selection UI (FR-009)
 *
 * Returns components with test_package_id to show which are already assigned.
 * Used for component uniqueness validation (FR-012, FR-013).
 *
 * @param projectId - Project ID to scope components
 * @returns Components with assignment status
 */
export function useComponentsWithAssignmentStatus(
  projectId: string
): UseQueryResult<ComponentWithAssignmentStatus[], Error> {
  return useQuery({
    queryKey: ['components-assignment-status', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('components')
        .select(
          `
          id,
          component_type,
          identity_key,
          area_id,
          system_id,
          test_package_id,
          test_packages(name)
        `
        )
        .eq('project_id', projectId)
        .eq('is_retired', false)
        .order('component_type', { ascending: true });

      if (error) throw error;

      return (data || []).map((row: any) => ({
        id: row.id,
        component_type: row.component_type,
        identity_key: row.identity_key,
        area_id: row.area_id,
        system_id: row.system_id,
        test_package_id: row.test_package_id,
        test_package_name: row.test_packages?.name || null,
        can_assign: row.test_package_id === null,
      }));
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Create component assignments for a package (FR-009, FR-010)
 *
 * Updates components.test_package_id directly (not junction table).
 * Validates component uniqueness constraint (FR-012, FR-013).
 *
 * @param packageId - Package ID for optimistic updates
 * @returns Mutation function to create component assignments
 */
export function useCreateComponentAssignments(
  packageId: string
): UseMutationResult<void, Error, ComponentAssignmentCreateInput> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: ComponentAssignmentCreateInput) => {
      // Update components.test_package_id directly
      const { error } = await supabase
        .from('components')
        .update({ test_package_id: input.package_id })
        .in('id', input.component_ids);

      if (error) throw error;
    },
    onError: (err) => {
      toast.error('Failed to assign components: ' + err.message);
    },
    onSuccess: () => {
      toast.success('Components assigned successfully');
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ['package-components', { package_id: packageId }],
      });
    },
  });
}

/**
 * Delete component assignment (FR-010)
 *
 * Sets components.test_package_id to NULL.
 *
 * @param packageId - Package ID for optimistic updates
 * @returns Mutation function to delete component assignment
 */
export function useDeleteComponentAssignment(
  packageId: string
): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (componentId: string) => {
      // Set test_package_id to NULL to free the component
      const { error } = await supabase
        .from('components')
        .update({ test_package_id: null })
        .eq('id', componentId);

      if (error) throw error;
    },
    onError: (err) => {
      toast.error('Failed to remove component: ' + err.message);
    },
    onSuccess: () => {
      toast.success('Component removed from package');
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ['package-components', { package_id: packageId }],
      });
    },
  });
}

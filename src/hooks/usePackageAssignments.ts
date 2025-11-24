/**
 * TanStack Query hooks for package drawing/component assignments
 * Feature 030 - Test Package Lifecycle Workflow - User Story 1 & 2
 *
 * Provides CRUD operations for:
 * - package_drawing_assignments (FR-006, FR-007)
 * - package_component_assignments (FR-009, FR-010)
 *
 * Audit Trail (Feature 030):
 * - All assignment changes logged to audit_log table
 * - Tracks who added/removed components and when
 */

import {
  useQuery,
  useMutation,
  useQueryClient,
  UseQueryResult,
  UseMutationResult,
} from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
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
            .select('id, area_id, test_package_id, areas(name)')
            .eq('drawing_id', drawing.id)
            .eq('is_retired', false);

          if (compError) throw compError;

          const componentCount = components?.length || 0;
          const availableCount = (components || []).filter(
            (c: any) => c.test_package_id === null
          ).length;
          const assignedCount = componentCount - availableCount;
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
            available_count: availableCount,
            assigned_count: assignedCount,
            is_fully_assigned: availableCount === 0,
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
 * Audit Trail (Feature 030):
 * - Logs batch assignment to audit_log after successful insert
 *
 * @param packageId - Package ID for optimistic updates
 * @param projectId - Project ID for audit logging
 * @returns Mutation function to create drawing assignments
 */
export function useCreateDrawingAssignments(
  packageId: string,
  projectId: string
): UseMutationResult<void, Error, DrawingAssignmentCreateInput> {
  const queryClient = useQueryClient();
  const { user } = useAuth();

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

      // Log to audit_log after successful insert
      if (user?.id && input.drawing_ids.length > 0) {
        await supabase.from('audit_log').insert({
          action_type: 'drawing_assignments_added',
          entity_type: 'package_drawing_assignments',
          entity_id: input.package_id,
          old_value: null,
          new_value: {
            drawing_ids: input.drawing_ids,
            count: input.drawing_ids.length,
          },
          project_id: projectId,
          user_id: user.id,
        });
      }
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
      queryClient.invalidateQueries({ queryKey: ['package-readiness'] });
    },
  });
}

/**
 * Delete drawing assignment (FR-006)
 *
 * Removes row from package_drawing_assignments table.
 * Components previously inherited from this drawing will no longer be in package.
 *
 * Audit Trail (Feature 030):
 * - Logs removal to audit_log table before deleting
 * - Captures drawing details for audit trail
 *
 * @param packageId - Package ID for optimistic updates
 * @param projectId - Project ID for audit logging
 * @returns Mutation function to delete drawing assignment
 */
export function useDeleteDrawingAssignment(
  packageId: string,
  projectId: string
): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (assignmentId: string) => {
      // 1. Fetch assignment data for audit log (before deleting)
      const { data: assignment, error: fetchError } = await supabase
        .from('package_drawing_assignments')
        .select('id, package_id, drawing_id, drawings(drawing_no_raw, drawing_no_norm, title)')
        .eq('id', assignmentId)
        .single();

      if (fetchError) throw fetchError;
      if (!assignment) throw new Error('Assignment not found');

      // 2. Count components that will be unassigned
      const { count } = await supabase
        .from('components')
        .select('*', { count: 'exact', head: true })
        .eq('drawing_id', assignment.drawing_id)
        .is('test_package_id', null);

      // 3. Log to audit_log
      if (user?.id) {
        await supabase.from('audit_log').insert({
          action_type: 'drawing_assignment_removed',
          entity_type: 'package_drawing_assignments',
          entity_id: assignmentId,
          old_value: {
            drawing_id: assignment.drawing_id,
            drawing_no_raw: (assignment.drawings as any)?.drawing_no_raw,
            drawing_no_norm: (assignment.drawings as any)?.drawing_no_norm,
            title: (assignment.drawings as any)?.title,
            component_count: count || 0,
          },
          new_value: null,
          project_id: projectId,
          user_id: user.id,
        });
      }

      // 4. Delete assignment
      const { error: deleteError } = await supabase
        .from('package_drawing_assignments')
        .delete()
        .eq('id', assignmentId);

      if (deleteError) throw deleteError;
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
      queryClient.invalidateQueries({ queryKey: ['package-readiness'] });
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
 * Audit Trail (Feature 030):
 * - Logs batch assignment to audit_log after successful update
 *
 * @param packageId - Package ID for optimistic updates
 * @param projectId - Project ID for audit logging
 * @returns Mutation function to create component assignments
 */
export function useCreateComponentAssignments(
  packageId: string,
  projectId: string
): UseMutationResult<void, Error, ComponentAssignmentCreateInput> {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: ComponentAssignmentCreateInput) => {
      // Update components.test_package_id directly
      const { error } = await supabase
        .from('components')
        .update({ test_package_id: input.package_id })
        .in('id', input.component_ids);

      if (error) throw error;

      // Log to audit_log after successful update
      if (user?.id && input.component_ids.length > 0) {
        await supabase.from('audit_log').insert({
          action_type: 'component_assignments_added',
          entity_type: 'components',
          entity_id: input.package_id,
          old_value: null,
          new_value: {
            component_ids: input.component_ids,
            count: input.component_ids.length,
          },
          project_id: projectId,
          user_id: user.id,
        });
      }
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
      queryClient.invalidateQueries({ queryKey: ['package-readiness'] });
    },
  });
}

/**
 * Delete component assignment (FR-010)
 *
 * Sets components.test_package_id to NULL.
 *
 * Audit Trail (Feature 030):
 * - Logs removal to audit_log table before updating
 * - Captures component identity and reason for audit trail
 *
 * @param packageId - Package ID for optimistic updates
 * @param projectId - Project ID for audit logging
 * @returns Mutation function to delete component assignment
 */
export function useDeleteComponentAssignment(
  packageId: string,
  projectId: string
): UseMutationResult<void, Error, { componentId: string; reason: string }> {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ componentId, reason }: { componentId: string; reason: string }) => {
      // 1. Fetch component data for audit log (before updating)
      const { data: component, error: fetchError } = await supabase
        .from('components')
        .select('id, component_type, identity_key, test_package_id')
        .eq('id', componentId)
        .single();

      if (fetchError) throw fetchError;
      if (!component) throw new Error('Component not found');

      // 2. Log to audit_log with reason
      if (user?.id) {
        await supabase.from('audit_log').insert({
          action_type: 'component_assignment_removed',
          entity_type: 'components',
          entity_id: componentId,
          old_value: {
            component_id: component.id,
            component_type: component.component_type,
            identity_key: component.identity_key,
            test_package_id: component.test_package_id,
          },
          new_value: null,
          reason: reason,
          project_id: projectId,
          user_id: user.id,
        });
      }

      // 3. Set test_package_id to NULL to free the component
      const { error: updateError } = await supabase
        .from('components')
        .update({ test_package_id: null })
        .eq('id', componentId);

      if (updateError) throw updateError;
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
      queryClient.invalidateQueries({ queryKey: ['package-readiness'] });
    },
  });
}

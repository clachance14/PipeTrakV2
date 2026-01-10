/**
 * TanStack Query hooks for components table (Feature 005)
 * Provides CRUD operations + milestone updates with auto-calculation
 */

import { useQuery, useMutation, useQueryClient, UseQueryResult, UseMutationResult } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database.types';

type Component = Database['public']['Tables']['components']['Row'];

export type ComponentType =
  | 'spool'
  | 'field_weld'
  | 'support'
  | 'valve'
  | 'fitting'
  | 'flange'
  | 'instrument'
  | 'tubing'
  | 'hose'
  | 'pipe'
  | 'misc_component'
  | 'threaded_pipe';

interface ComponentsFilters {
  component_type?: ComponentType;
  drawing_id?: string;
  area_id?: string;
  system_id?: string;
  test_package_id?: string;
  is_retired?: boolean;
  progress_min?: number; // 0-100 filter by minimum % complete
  progress_max?: number; // 0-100 filter by maximum % complete
  search?: string; // Search identity key (partial match, case-insensitive)
}

/**
 * Query components for a project with optional filters
 * Fetches components and their effective templates in parallel,
 * then merges them for milestone chip rendering
 */
export function useComponents(
  projectId: string,
  filters?: ComponentsFilters
): UseQueryResult<Component[], Error> {
  return useQuery({
    queryKey: ['projects', projectId, 'components', filters],
    queryFn: async () => {
      // Build base components query
      let query = supabase
        .from('components')
        .select(`
          *,
          drawings(drawing_no_norm),
          areas(id, name),
          systems(id, name),
          test_packages(id, name)
        `)
        .eq('project_id', projectId);

      // Apply filters
      if (filters?.component_type) {
        query = query.eq('component_type', filters.component_type);
      }
      if (filters?.drawing_id) {
        query = query.eq('drawing_id', filters.drawing_id);
      }
      if (filters?.area_id) {
        query = query.eq('area_id', filters.area_id);
      }
      if (filters?.system_id) {
        query = query.eq('system_id', filters.system_id);
      }
      if (filters?.test_package_id) {
        query = query.eq('test_package_id', filters.test_package_id);
      }
      if (filters?.is_retired !== undefined) {
        query = query.eq('is_retired', filters.is_retired);
      }
      if (filters?.progress_min !== undefined) {
        query = query.gte('percent_complete', filters.progress_min);
      }
      if (filters?.progress_max !== undefined) {
        query = query.lte('percent_complete', filters.progress_max);
      }
      if (filters?.search) {
        // Search in identity_key JSONB - cast to text for partial match
        query = query.ilike('identity_key::text', `%${filters.search}%`);
      }

      query = query.order('last_updated_at', { ascending: false });

      // Fetch components and effective templates in parallel
      const [componentsResult, templatesResult] = await Promise.all([
        query,
        supabase
          .from('component_effective_templates')
          .select('component_id, milestones_config, uses_project_templates')
          .eq('project_id', projectId)
      ]);

      if (componentsResult.error) throw componentsResult.error;
      if (templatesResult.error) throw templatesResult.error;

      // Build lookup map for effective templates
      const templatesByComponentId = new Map<string, {
        milestones_config: any[] | null;
        uses_project_templates: boolean | null;
      }>();
      for (const template of templatesResult.data || []) {
        if (template.component_id) {
          templatesByComponentId.set(template.component_id, {
            milestones_config: template.milestones_config as any[] | null,
            uses_project_templates: template.uses_project_templates,
          });
        }
      }

      // Transform and merge data
      const transformedData = (componentsResult.data || []).map((component: any) => ({
        ...component,
        drawing: component.drawings,
        area: component.areas,
        system: component.systems,
        test_package: component.test_packages,
        effective_template: templatesByComponentId.get(component.id) || null,
      }));

      return transformedData;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes (components change frequently)
  });
}

/**
 * Query single component with progress template
 * Joins with progress_template to get milestones config
 */
export function useComponent(id: string): UseQueryResult<Component, Error> {
  return useQuery({
    queryKey: ['components', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('components')
        .select(`
          *,
          progress_template:progress_templates(*)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    },
    staleTime: 1 * 60 * 1000, // 1 minute
  });
}

/**
 * Query effective milestone template for a component
 * Uses project-specific templates when available (Feature 026),
 * falls back to system templates otherwise
 * Fetches from component_effective_templates view
 */
export function useEffectiveTemplate(componentId: string): UseQueryResult<{
  milestones_config: any;
  uses_project_templates: boolean | null;
} | null, Error> {
  return useQuery({
    queryKey: ['effective-template', componentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('component_effective_templates')
        .select('milestones_config, uses_project_templates')
        .eq('component_id', componentId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    staleTime: 1 * 60 * 1000, // 1 minute
  });
}

/**
 * Create a new component
 * Validates identity_key structure via FR-041
 * Sets current_milestones = {}, percent_complete = 0.00
 */
export function useCreateComponent(): UseMutationResult<
  Component,
  Error,
  {
    project_id: string;
    component_type: ComponentType;
    identity_key: Record<string, any>;
    progress_template_id: string;
    drawing_id?: string;
    area_id?: string;
    system_id?: string;
    test_package_id?: string;
    attributes?: Record<string, any>;
  }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (newComponent) => {
      // Validate identity_key structure before inserting
      const { data: isValid, error: validationError } = await supabase.rpc(
        'validate_component_identity_key',
        {
          p_component_type: newComponent.component_type,
          p_identity_key: newComponent.identity_key,
        }
      );

      if (validationError) throw validationError;
      if (!isValid) {
        throw new Error(`Invalid identity_key structure for component type: ${newComponent.component_type}`);
      }

      const { data, error } = await supabase
        .from('components')
        .insert({
          project_id: newComponent.project_id,
          component_type: newComponent.component_type,
          identity_key: newComponent.identity_key,
          progress_template_id: newComponent.progress_template_id,
          drawing_id: newComponent.drawing_id,
          area_id: newComponent.area_id,
          system_id: newComponent.system_id,
          test_package_id: newComponent.test_package_id,
          attributes: newComponent.attributes || {},
          current_milestones: {},
          percent_complete: 0.00,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      // Invalidate components list for this project
      queryClient.invalidateQueries({
        queryKey: ['projects', data.project_id, 'components'],
      });
    },
  });
}

/**
 * Update component milestones
 * Triggers auto-recalculation of percent_complete via database trigger
 * Creates milestone_event and audit_log entries
 * Checks for out-of-sequence and creates needs_review if detected
 *
 * Requires can_update_milestones permission (enforced by RLS policy)
 */
export function useUpdateComponentMilestones(): UseMutationResult<
  Component,
  Error,
  {
    id: string;
    current_milestones: Record<string, boolean | number>;
    reason?: string;
  }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, current_milestones }) => {
      const { data, error } = await supabase
        .from('components')
        .update({
          current_milestones,
          last_updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      // Invalidate component cache
      queryClient.invalidateQueries({
        queryKey: ['components', data.id],
      });
      queryClient.invalidateQueries({
        queryKey: ['projects', data.project_id, 'components'],
      });

      // Invalidate milestone events
      queryClient.invalidateQueries({
        queryKey: ['components', data.id, 'milestone-events'],
      });

      // TODO: Create milestone_event and audit_log entries
      // TODO: Check for out-of-sequence milestones and create needs_review
      // These will be implemented when those hooks are available
    },
  });
}

/**
 * Update component metadata (area, system, test_package)
 * Uses optimistic locking via version field to detect concurrent edits
 *
 * Feature: 020-component-metadata-editing
 * Requires can_update_metadata permission (enforced by RLS policy)
 */
export function useUpdateComponentMetadata(): UseMutationResult<
  Component,
  Error,
  {
    componentId: string;
    version: number;
    area_id: string | null;
    system_id: string | null;
    test_package_id: string | null;
  }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ componentId, version, area_id, system_id, test_package_id }) => {
      const { data, error } = await supabase
        .from('components')
        .update({
          area_id,
          system_id,
          test_package_id,
          last_updated_at: new Date().toISOString(),
        })
        .eq('id', componentId)
        .eq('version', version)
        .select()
        .single();

      if (error) {
        // Check for concurrent update (version mismatch)
        if (error.code === 'PGRST116') {
          throw new Error('Component was updated by another user. Please refresh and try again.');
        }
        throw error;
      }
      return data;
    },
    onSuccess: (data) => {
      // Invalidate component cache
      queryClient.invalidateQueries({
        queryKey: ['components', data.id],
      });
      queryClient.invalidateQueries({
        queryKey: ['projects', data.project_id, 'components'],
      });
    },
  });
}

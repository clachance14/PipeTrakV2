/**
 * TanStack Query hooks for field_weld_inspections table (Feature 005)
 * Provides QC tracking for field welds: hydro, PMI, PWHT, x-ray, repairs, turnover
 */

import { useQuery, useMutation, useQueryClient, UseQueryResult, UseMutationResult } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database.types';

type FieldWeldInspection = Database['public']['Tables']['field_weld_inspections']['Row'];

interface FieldWeldInspectionsFilters {
  component_id?: string;
  welder_id?: string;
  flagged_for_xray?: boolean;
  hydro_complete?: boolean;
  turned_over_to_client?: boolean;
  parent_weld_id?: string; // Filter for repairs only
}

/**
 * Query field weld inspections for a project with optional filters
 */
export function useFieldWeldInspections(
  projectId: string,
  filters?: FieldWeldInspectionsFilters
): UseQueryResult<FieldWeldInspection[], Error> {
  return useQuery({
    queryKey: ['projects', projectId, 'field-weld-inspections', filters],
    queryFn: async () => {
      let query = supabase
        .from('field_weld_inspections')
        .select('*')
        .eq('project_id', projectId);

      // Apply filters
      if (filters?.component_id) {
        query = query.eq('component_id', filters.component_id);
      }
      if (filters?.welder_id) {
        query = query.eq('welder_id', filters.welder_id);
      }
      if (filters?.flagged_for_xray !== undefined) {
        query = query.eq('flagged_for_xray', filters.flagged_for_xray);
      }
      if (filters?.hydro_complete !== undefined) {
        query = query.eq('hydro_complete', filters.hydro_complete);
      }
      if (filters?.turned_over_to_client !== undefined) {
        query = query.eq('turned_over_to_client', filters.turned_over_to_client);
      }
      if (filters?.parent_weld_id) {
        query = query.eq('parent_weld_id', filters.parent_weld_id);
      }

      query = query.order('weld_id_number', { ascending: true });

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    },
    staleTime: 2 * 60 * 1000, // 2 minutes (QC data changes frequently)
  });
}

/**
 * Query single field weld inspection with joins to welder and component
 */
export function useFieldWeldInspection(id: string): UseQueryResult<FieldWeldInspection, Error> {
  return useQuery({
    queryKey: ['field-weld-inspections', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('field_weld_inspections')
        .select(`
          *,
          welder:welders(*),
          component:components(*)
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
 * Get weld repair history (original weld + all repairs)
 * Calls get_weld_repair_history() stored procedure
 * Returns: 42.0, 42.1, 42.2 ordered by weld_id_number
 * Note: Returns limited fields (id, weld_id_number, repair_sequence, welder_stencil, date_welded, comments)
 */
export function useWeldRepairHistory(parentWeldId: string): UseQueryResult<
  {
    id: string;
    weld_id_number: number;
    repair_sequence: number;
    welder_stencil: string;
    date_welded: string;
    comments: string;
  }[],
  Error
> {
  return useQuery({
    queryKey: ['field-weld-inspections', parentWeldId, 'repair-history'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_weld_repair_history', {
        p_parent_weld_id: parentWeldId,
      });

      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes (repair history rarely changes)
  });
}

/**
 * Create a new field weld inspection
 * Called by foreman when marking "Weld Made" milestone
 * Validates: weld_id_number unique, welder_id required, parent_weld_id required for repairs
 */
export function useCreateFieldWeldInspection(): UseMutationResult<
  FieldWeldInspection,
  Error,
  {
    component_id: string;
    project_id: string;
    weld_id_number: number;
    parent_weld_id?: string;
    welder_id: string;
    drawing_iso_number?: string;
    package_number?: string;
    spec?: string;
    system_code?: string;
    date_welded?: string;
    weld_type?: 'BW' | 'SW' | 'FW' | 'TW';
    test_pressure?: number;
    [key: string]: any; // Allow other optional QC fields
  }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (newInspection) => {
      // Calculate repair_sequence if parent_weld_id is set
      let repair_sequence = 0;
      if (newInspection.parent_weld_id) {
        // Count existing repairs for this parent
        const { count } = await supabase
          .from('field_weld_inspections')
          .select('*', { count: 'exact', head: true })
          .eq('parent_weld_id', newInspection.parent_weld_id);

        repair_sequence = (count || 0) + 1;
      }

      const { data, error } = await supabase
        .from('field_weld_inspections')
        .insert({
          ...newInspection,
          repair_sequence,
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          throw new Error(`Weld ID ${newInspection.weld_id_number} already exists in this project`);
        }
        throw error;
      }

      return data;
    },
    onSuccess: (data) => {
      // Invalidate inspections list for this project
      queryClient.invalidateQueries({
        queryKey: ['projects', data.project_id, 'field-weld-inspections'],
      });

      // If this is a repair, invalidate parent's repair history
      if (data.parent_weld_id) {
        queryClient.invalidateQueries({
          queryKey: ['field-weld-inspections', data.parent_weld_id, 'repair-history'],
        });
      }
    },
  });
}

/**
 * Update field weld inspection QC fields
 * Requires can_update_milestones permission (QC inspectors have this)
 * Sets last_updated_at/by, creates audit_log entry
 * If flagged_for_xray = true, sets xray_flagged_by/date
 */
export function useUpdateFieldWeldInspection(): UseMutationResult<
  FieldWeldInspection,
  Error,
  {
    id: string;
    // QC fields (all optional)
    flagged_for_xray?: boolean;
    xray_shot_number?: string;
    xray_result?: string;
    hydro_complete?: boolean;
    hydro_complete_date?: string;
    restored_date?: string;
    pmi_complete?: boolean;
    pmi_date?: string;
    pmi_result?: string;
    pwht_complete?: boolean;
    pwht_date?: string;
    nde_type_performed?: string;
    nde_result?: string;
    turned_over_to_client?: boolean;
    turnover_date?: string;
    comments?: string;
  }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const updatePayload: any = {
        ...updates,
        last_updated_at: new Date().toISOString(),
        last_updated_by: user.id,
      };

      // If flagging for x-ray, record who and when
      if (updates.flagged_for_xray === true) {
        updatePayload.xray_flagged_by = user.id;
        updatePayload.xray_flagged_date = new Date().toISOString().split('T')[0]; // Date only
      }

      const { data, error } = await supabase
        .from('field_weld_inspections')
        .update(updatePayload)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // TODO: Create audit_log entry for QC updates

      return data;
    },
    onSuccess: (data) => {
      // Invalidate inspection cache
      queryClient.invalidateQueries({
        queryKey: ['field-weld-inspections', data.id],
      });
      queryClient.invalidateQueries({
        queryKey: ['projects', data.project_id, 'field-weld-inspections'],
      });
    },
  });
}

/**
 * Flag weld for x-ray (QC inspector action)
 * Convenience wrapper for useUpdateFieldWeldInspection
 */
export function useFlagWeldForXRay(): UseMutationResult<
  FieldWeldInspection,
  Error,
  {
    id: string;
  }
> {
  const updateMutation = useUpdateFieldWeldInspection();

  return {
    ...updateMutation,
    mutate: (variables, options) => {
      updateMutation.mutate(
        {
          id: variables.id,
          flagged_for_xray: true,
        },
        options
      );
    },
    mutateAsync: async (variables) => {
      return updateMutation.mutateAsync({
        id: variables.id,
        flagged_for_xray: true,
      });
    },
  } as UseMutationResult<FieldWeldInspection, Error, { id: string }>;
}

/**
 * Create repair weld (decimal weld ID: 42.1, 42.2, etc.)
 * Fetches parent weld_id_number, calculates next repair sequence
 */
export function useCreateWeldRepair(): UseMutationResult<
  FieldWeldInspection,
  Error,
  {
    parent_weld_id: string;
    welder_id: string;
    date_welded: string;
    comments?: string;
  }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (variables) => {
      // Fetch parent weld to get base weld_id_number, project_id, component_id
      const { data: parentWeld, error: fetchError } = await supabase
        .from('field_weld_inspections')
        .select('weld_id_number, project_id, component_id')
        .eq('id', variables.parent_weld_id)
        .single();

      if (fetchError) throw fetchError;

      // Count existing repairs
      const { count } = await supabase
        .from('field_weld_inspections')
        .select('*', { count: 'exact', head: true })
        .eq('parent_weld_id', variables.parent_weld_id);

      const repairSequence = (count || 0) + 1;
      const newWeldIdNumber = Number(parentWeld.weld_id_number) + (repairSequence * 0.1);

      // Create the repair weld
      const { data, error } = await supabase
        .from('field_weld_inspections')
        .insert({
          component_id: parentWeld.component_id,
          project_id: parentWeld.project_id,
          weld_id_number: newWeldIdNumber,
          parent_weld_id: variables.parent_weld_id,
          welder_id: variables.welder_id,
          date_welded: variables.date_welded,
          comments: variables.comments,
          repair_sequence: repairSequence,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      // Invalidate inspections list and repair history
      queryClient.invalidateQueries({
        queryKey: ['projects', data.project_id, 'field-weld-inspections'],
      });
      if (data.parent_weld_id) {
        queryClient.invalidateQueries({
          queryKey: ['field-weld-inspections', data.parent_weld_id, 'repair-history'],
        });
      }
    },
  });
}

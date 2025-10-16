/**
 * useProjects Hook - Project CRUD operations
 *
 * Feature: 005-sprint-1-core
 * Provides TanStack Query hooks for project management.
 *
 * Queries:
 * - useProjects(filters): List projects with optional filters (is_archived, search)
 * - useProject(id): Get single project by ID
 *
 * Mutations:
 * - useCreateProject(): Create new project
 * - useUpdateProject(): Update existing project (name, description, is_archived)
 *
 * RLS: All queries automatically filtered by organization_id via Supabase RLS policies
 */

import { useQuery, useMutation, useQueryClient, type UseQueryResult, type UseMutationResult } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database.types';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

type Project = Database['public']['Tables']['projects']['Row'];
type ProjectInsert = Database['public']['Tables']['projects']['Insert'];
type ProjectUpdate = Database['public']['Tables']['projects']['Update'];

interface ProjectFilters {
  search?: string;
}

interface CreateProjectInput {
  name: string;
  description?: string;
}

interface UpdateProjectInput {
  id: string;
  name?: string;
  description?: string;
}

// ============================================================================
// QUERIES
// ============================================================================

/**
 * useProjects - Query list of projects with optional filters
 *
 * @param filters - Optional filters: is_archived (boolean), search (string)
 * @returns UseQueryResult<Project[], Error>
 *
 * Query Key: ['projects', filters]
 * RLS: Automatically filtered by organization_id
 * Cache: 5 minutes (staleTime: 5 * 60 * 1000)
 *
 * @example
 * const { data: projects, error, isLoading } = useProjects({ is_archived: false });
 */
export function useProjects(filters?: ProjectFilters): UseQueryResult<Project[], Error> {
  return useQuery({
    queryKey: ['projects', filters],
    queryFn: async () => {
      let query = supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters?.search) {
        query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(`Failed to fetch projects: ${error.message}`);
      }

      return data || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * useProject - Query single project by ID
 *
 * @param id - Project UUID
 * @returns UseQueryResult<Project | null, Error>
 *
 * Query Key: ['projects', id]
 * RLS: Returns null if project not in user's organization
 *
 * @example
 * const { data: project, error, isLoading } = useProject('project-uuid');
 */
export function useProject(id: string): UseQueryResult<Project | null, Error> {
  return useQuery({
    queryKey: ['projects', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        // RLS will return PGRST116 if project not in user's org
        if (error.code === 'PGRST116') {
          return null;
        }
        throw new Error(`Failed to fetch project: ${error.message}`);
      }

      return data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * useCreateProject - Create new project
 *
 * @returns UseMutationResult with mutate function
 *
 * Invalidates: ['projects']
 * Optimistic Update: Adds project to cache immediately
 *
 * @example
 * const { mutate: createProject, isPending, error } = useCreateProject();
 * createProject({ name: 'New Project', description: 'Description' });
 */
export function useCreateProject(): UseMutationResult<
  Project,
  Error,
  CreateProjectInput
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateProjectInput) => {
      // Get current user's organization_id
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: userData } = await supabase
        .from('users')
        .select('organization_id')
        .eq('id', user.id)
        .single();

      if (!userData) throw new Error('User not found');

      const projectData: ProjectInsert = {
        name: input.name,
        description: input.description,
        organization_id: userData.organization_id,
      };

      console.log('Attempting to create project with data:', projectData);
      console.log('Current user:', { id: user.id, email: user.email });

      const { data, error } = await supabase
        .from('projects')
        .insert(projectData)
        .select()
        .single();

      if (error) {
        console.error('Project creation error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        });
        throw new Error(`Failed to create project: ${error.message}`);
      }

      return data;
    },
    onSuccess: () => {
      // Invalidate projects list to trigger refetch
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

/**
 * useUpdateProject - Update existing project
 *
 * @returns UseMutationResult with mutate function
 *
 * Invalidates: ['projects', id], ['projects']
 * Optimistic Update: Updates project in cache immediately
 *
 * @example
 * const { mutate: updateProject } = useUpdateProject();
 * updateProject({ id: 'project-uuid', name: 'Updated Name', is_archived: true });
 */
export function useUpdateProject(): UseMutationResult<
  Project,
  Error,
  UpdateProjectInput
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateProjectInput) => {
      const { id, ...updates } = input;

      const projectUpdate: ProjectUpdate = {};
      if (updates.name !== undefined) projectUpdate.name = updates.name;
      if (updates.description !== undefined) projectUpdate.description = updates.description;

      const { data, error } = await supabase
        .from('projects')
        .update(projectUpdate)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update project: ${error.message}`);
      }

      return data;
    },
    onSuccess: (data) => {
      // Invalidate specific project and projects list
      queryClient.invalidateQueries({ queryKey: ['projects', data.id] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

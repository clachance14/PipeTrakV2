import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database.types';

type TemplateChange = Database['public']['Tables']['project_template_changes']['Row'];

/**
 * Hook to fetch audit log of template weight changes for a component type
 *
 * @param projectId - UUID of the project
 * @param componentType - Component type to fetch changes for (e.g., "Field Weld")
 * @param limit - Optional limit on number of records to return (default: all)
 * @returns TanStack Query result with template changes including user info
 *
 * @example
 * // Fetch all changes for Field Weld
 * const { data: changes } = useTemplateChanges('project-123', 'Field Weld');
 *
 * @example
 * // Fetch only the most recent change
 * const { data: latestChange } = useTemplateChanges('project-123', 'Valve', 1);
 */
export function useTemplateChanges(
  projectId: string,
  componentType: string,
  limit?: number
) {
  return useQuery({
    queryKey: ['templateChanges', projectId, componentType],
    queryFn: async () => {
      let query = supabase
        .from('project_template_changes')
        .select('*')
        .eq('project_id', projectId)
        .eq('component_type', componentType)
        .order('changed_at', { ascending: false});

      if (limit) {
        query = query.limit(limit);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      // Return empty array if no changes yet
      return (data || []) as TemplateChange[];
    },
  });
}

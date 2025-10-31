/**
 * Hook: useComponentMetadata (T020)
 *
 * Feature: 020-component-metadata-editing
 * Date: 2025-10-29
 *
 * TanStack Query hook for fetching a single component with metadata relations.
 * Joins area, system, and test_package tables to provide complete component data.
 *
 * @example
 * ```typescript
 * const { data: component, isLoading, error } = useComponentMetadata('component-uuid')
 * if (component) {
 *   console.log(component.area?.name)      // "North Wing"
 *   console.log(component.system?.name)    // "HVAC"
 *   console.log(component.test_package?.name) // "TP-01"
 * }
 * ```
 */

import { useQuery, UseQueryResult } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Component } from '@/types/metadata'

/**
 * Query hook for fetching a single component with metadata relations
 *
 * @param componentId - Component UUID to fetch
 * @returns TanStack Query result with component data
 *
 * Query key pattern: `['component', componentId]`
 *
 * Joins:
 * - areas: Provides area.name for display
 * - systems: Provides system.name for display
 * - test_packages: Provides test_package.name for display
 */
export function useComponentMetadata(
  componentId: string
): UseQueryResult<Component, Error> {
  return useQuery({
    queryKey: ['component', componentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('components')
        .select(`
          *,
          area:areas(*),
          system:systems(*),
          test_package:test_packages(*)
        `)
        .eq('id', componentId)
        .single()

      if (error) throw error
      return data as unknown as Component
    },
    enabled: !!componentId && componentId.length > 10 && !componentId.includes(':'), // Only fetch if valid UUID
    staleTime: 1 * 60 * 1000 // 1 minute - metadata changes infrequently
  })
}

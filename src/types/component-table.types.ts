/**
 * Type definitions for component table sorting
 * Matches pattern from drawing-table.types.ts
 */

/**
 * Sort field options for components table
 */
export type ComponentSortField =
  | 'identity_key'      // Sort by component identity (alphabetically)
  | 'drawing'           // Sort by drawing number
  | 'component_type'    // Sort by component type
  | 'area'              // Sort by area name
  | 'system'            // Sort by system name
  | 'test_package'      // Sort by test package name
  | 'percent_complete'  // Sort by progress percentage

/**
 * Sort direction options (matches drawing-table.types)
 */
export type SortDirection = 'asc' | 'desc'

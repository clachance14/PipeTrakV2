/**
 * API Contract: Custom React Hooks for Drawing Table
 *
 * This file defines the TypeScript interfaces for all custom hooks
 * used in the drawing-centered component table feature.
 *
 * These contracts serve as the source of truth for:
 * - Contract tests (verify hook behavior)
 * - Implementation (what to build)
 * - Integration tests (how hooks compose)
 */

import type { UseQueryResult, UseMutationResult } from '@tanstack/react-query'

// ============================================================================
// Data Types
// ============================================================================

export interface DrawingRow {
  id: string
  project_id: string
  drawing_no_norm: string
  drawing_no_raw: string
  title: string | null
  rev: string | null
  is_retired: boolean
  total_components: number
  completed_components: number
  avg_percent_complete: number
}

export interface ComponentRow {
  id: string
  project_id: string
  drawing_id: string | null
  component_type: ComponentType
  identity_key: IdentityKey
  current_milestones: Record<string, boolean | number>
  percent_complete: number
  template: ProgressTemplate
  identityDisplay: string
  canUpdate: boolean
  created_at: string
  last_updated_at: string
  last_updated_by: string | null
  is_retired: boolean
}

export type ComponentType =
  | 'spool' | 'field_weld' | 'support' | 'valve' | 'fitting'
  | 'flange' | 'instrument' | 'tubing' | 'hose' | 'misc_component'
  | 'threaded_pipe'

export interface IdentityKey {
  drawing_norm: string
  commodity_code: string
  size: string
  seq: number
}

export interface ProgressTemplate {
  id: string
  component_type: ComponentType
  version: number
  workflow_type: 'discrete' | 'quantity' | 'hybrid'
  milestones_config: MilestoneConfig[]
}

export interface MilestoneConfig {
  name: string
  weight: number
  order: number
  is_partial: boolean
  requires_welder: boolean
}

export interface MilestoneUpdatePayload {
  component_id: string
  milestone_name: string
  value: boolean | number
  user_id: string
}

export interface MilestoneUpdateResponse {
  component: ComponentRow
  previous_value: boolean | number | null
  audit_event_id: string
}

// ============================================================================
// Hook Contracts
// ============================================================================

/**
 * CONTRACT: useDrawingsWithProgress
 *
 * PURPOSE: Fetch all drawings for a project with aggregated progress metrics
 *
 * INPUTS:
 * - projectId: UUID of the project
 *
 * OUTPUTS:
 * - UseQueryResult containing DrawingRow[]
 * - Sorted by drawing_no_norm ascending
 * - Only non-retired drawings
 * - Progress metrics from mv_drawing_progress view
 *
 * CACHING:
 * - Query key: ['drawings-with-progress', { project_id }]
 * - Stale time: 2 minutes
 * - Refetch on window focus: true
 *
 * ERRORS:
 * - Database error: Throws with Supabase error message
 * - No project access: Returns empty array (RLS filters)
 */
export interface UseDrawingsWithProgressContract {
  (projectId: string): UseQueryResult<DrawingRow[], Error>
}

/**
 * CONTRACT: useComponentsByDrawing
 *
 * PURPOSE: Lazily load components for a specific drawing
 *
 * INPUTS:
 * - drawingId: UUID of the drawing (nullable)
 * - enabled: Boolean to control lazy loading
 *
 * OUTPUTS:
 * - UseQueryResult containing ComponentRow[]
 * - Sorted by identity_key->seq ascending
 * - Only non-retired components
 * - Includes joined progress_template
 * - identityDisplay computed from identity_key
 *
 * CACHING:
 * - Query key: ['components', { drawing_id }]
 * - Stale time: 2 minutes
 * - Only fetches if enabled=true and drawingId is not null
 *
 * ERRORS:
 * - Database error: Throws with Supabase error message
 * - Drawing not found: Returns empty array
 */
export interface UseComponentsByDrawingContract {
  (drawingId: string | null, enabled: boolean): UseQueryResult<ComponentRow[], Error>
}

/**
 * CONTRACT: useProgressTemplates
 *
 * PURPOSE: Load all progress templates (static configuration)
 *
 * INPUTS: None
 *
 * OUTPUTS:
 * - UseQueryResult containing Map<ComponentType, ProgressTemplate>
 * - All 11 component type templates
 * - Sorted by component_type
 *
 * CACHING:
 * - Query key: ['progress-templates']
 * - Stale time: Infinity (templates are static)
 * - Refetch on mount: false
 *
 * ERRORS:
 * - Database error: Throws with Supabase error message
 */
export interface UseProgressTemplatesContract {
  (): UseQueryResult<Map<ComponentType, ProgressTemplate>, Error>
}

/**
 * CONTRACT: useUpdateMilestone
 *
 * PURPOSE: Update a single milestone with optimistic UI updates
 *
 * INPUTS: None (returns mutation object)
 *
 * OUTPUTS:
 * - UseMutationResult for MilestoneUpdatePayload → MilestoneUpdateResponse
 * - Optimistic update: Immediate UI change
 * - Rollback on error: Reverts to previous state
 * - Invalidation on success: Refetches related queries
 *
 * MUTATION FLOW:
 * 1. onMutate: Cancel queries, snapshot state, optimistically update cache
 * 2. mutationFn: Call Supabase RPC update_component_milestone
 * 3. onSuccess: Invalidate ['components'], ['drawing-progress'], ['drawings-with-progress']
 * 4. onError: Rollback cache to snapshot, show error toast
 *
 * VALIDATION:
 * - Payload validated against Zod schema before mutation
 * - Discrete milestones: value must be boolean
 * - Partial milestones: value must be number 0-100
 *
 * ERRORS:
 * - Validation error: ZodError thrown
 * - Component not found: Supabase error code PGRST116
 * - Permission denied: Supabase error code 42501
 * - Network error: Generic Error with message
 */
export interface UseUpdateMilestoneContract {
  (): UseMutationResult<
    MilestoneUpdateResponse,
    Error,
    MilestoneUpdatePayload,
    { previous: ComponentRow[] | undefined }
  >
}

/**
 * CONTRACT: useExpandedDrawings
 *
 * PURPOSE: Manage drawing expansion state via URL params
 *
 * INPUTS: None
 *
 * OUTPUTS:
 * - expandedDrawingIds: Set<string> of drawing IDs currently expanded
 * - toggleDrawing: (drawingId: string) => void
 * - collapseAll: () => void
 * - isExpanded: (drawingId: string) => boolean
 *
 * URL SYNC:
 * - Reads from: ?expanded=uuid1,uuid2,uuid3
 * - Updates URL on toggle/collapseAll
 * - Preserves other URL params (search, status)
 *
 * LIMITS:
 * - Max 50 expanded drawings in URL (fallback to localStorage if exceeded)
 * - Shows toast warning if limit exceeded
 */
export interface UseExpandedDrawingsContract {
  (): {
    expandedDrawingIds: Set<string>
    toggleDrawing: (drawingId: string) => void
    collapseAll: () => void
    isExpanded: (drawingId: string) => boolean
  }
}

/**
 * CONTRACT: useDrawingFilters
 *
 * PURPOSE: Manage search and filter state via URL params
 *
 * INPUTS: None
 *
 * OUTPUTS:
 * - searchTerm: string (debounced by 300ms)
 * - statusFilter: 'all' | 'not-started' | 'in-progress' | 'complete'
 * - setSearch: (term: string) => void
 * - setStatusFilter: (status: string) => void
 * - filteredDrawings: (drawings: DrawingRow[]) => DrawingRow[]
 *
 * URL SYNC:
 * - Reads from: ?search=P-001&status=in-progress
 * - Updates URL on filter change
 * - Debounces search updates (300ms)
 *
 * FILTER LOGIC:
 * - Search: Case-insensitive substring match on drawing_no_norm
 * - Status filters:
 *   - 'not-started': avg_percent_complete === 0
 *   - 'in-progress': avg_percent_complete > 0 && < 100
 *   - 'complete': avg_percent_complete === 100
 *   - 'all': No filter
 */
export interface UseDrawingFiltersContract {
  (): {
    searchTerm: string
    statusFilter: 'all' | 'not-started' | 'in-progress' | 'complete'
    setSearch: (term: string) => void
    setStatusFilter: (status: 'all' | 'not-started' | 'in-progress' | 'complete') => void
    filteredDrawings: (drawings: DrawingRow[]) => DrawingRow[]
  }
}

// ============================================================================
// Utility Contracts
// ============================================================================

/**
 * CONTRACT: formatIdentityKey
 *
 * PURPOSE: Convert JSONB identity_key to human-readable string
 *
 * INPUTS:
 * - key: IdentityKey object
 * - type: ComponentType
 *
 * OUTPUTS:
 * - Formatted string
 *
 * FORMAT RULES:
 * - Instruments: "{commodity_code} {size}" (no seq)
 * - Others: "{commodity_code} {size} ({seq})"
 * - If size is "NOSIZE": Omit size from display
 *
 * EXAMPLES:
 * - { commodity_code: "VBALU-001", size: "2", seq: 1 } → "VBALU-001 2\" (1)"
 * - { commodity_code: "ME-55402", size: "1X2", seq: 1 } → "ME-55402 1X2"
 * - { commodity_code: "SUPPORT-A", size: "NOSIZE", seq: 1 } → "SUPPORT-A (1)"
 */
export interface FormatIdentityKeyContract {
  (key: IdentityKey, type: ComponentType): string
}

/**
 * CONTRACT: validateMilestoneUpdate
 *
 * PURPOSE: Validate milestone update payload against template
 *
 * INPUTS:
 * - payload: MilestoneUpdatePayload
 * - template: ProgressTemplate
 *
 * OUTPUTS:
 * - { valid: true } if valid
 * - { valid: false, error: string } if invalid
 *
 * VALIDATION RULES:
 * - Milestone name must exist in template.milestones_config
 * - If is_partial=true: value must be number 0-100
 * - If is_partial=false: value must be boolean
 *
 * ERRORS:
 * - "Milestone {name} not in template"
 * - "Partial milestone value must be 0-100"
 * - "Discrete milestone value must be boolean"
 */
export interface ValidateMilestoneUpdateContract {
  (
    payload: MilestoneUpdatePayload,
    template: ProgressTemplate
  ): { valid: true } | { valid: false; error: string }
}

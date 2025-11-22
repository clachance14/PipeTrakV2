/**
 * TypeScript Types for Drawing-Centered Component Progress Table
 * Feature: 010-let-s-spec
 *
 * This file defines the core data structures used throughout the drawing table feature.
 * These types extend the auto-generated database types with UI-specific fields.
 */

import type { Database } from '@/types/database.types'
import type { SortDirection as SortDirectionType } from '@/components/table/SortableColumnHeader'

// ============================================================================
// Component Types
// ============================================================================

/**
 * All valid component types in the system
 * Must match the database enum and progress_templates table
 */
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
  | 'misc_component'
  | 'threaded_pipe'
  | 'pipe' // Added per migration 00017

// ============================================================================
// Identity Key Structure
// ============================================================================

/**
 * Identity key structure (stored as JSONB in database)
 * Used to uniquely identify components with size awareness
 *
 * - Standard format: drawing_norm + commodity_code + size + seq
 * - Spool format: spool_id only
 * - Field weld format: weld_number only
 * - Threaded pipe aggregate format: pipe_id only (format: "{drawing}-{size}-{cmdty}-AGG")
 */
export type IdentityKey =
  | { spool_id: string }  // Spools
  | { weld_number: string }  // Field welds
  | { pipe_id: string }  // Threaded pipe aggregates
  | {  // Standard components (valve, support, fitting, etc.)
      /** Normalized drawing number (uppercase, trimmed) */
      drawing_norm: string
      /** Commodity code from material takeoff */
      commodity_code: string
      /** Size (e.g., "2", "1X2", "NOSIZE") */
      size: string
      /** Sequential number for duplicate commodity codes on same drawing */
      seq: number
    }

// ============================================================================
// Progress Template Structure
// ============================================================================

/**
 * Milestone configuration within a progress template
 */
export interface MilestoneConfig {
  /** Milestone name (e.g., "Receive", "Install") */
  name: string
  /** Percentage weight (1-100, all weights must sum to 100) */
  weight: number
  /** Display order (1, 2, 3...) */
  order: number
  /** False = discrete (boolean), True = partial (0-100%) */
  is_partial: boolean
  /** True if welder stencil required for this milestone */
  requires_welder: boolean
}

/**
 * Progress template defining workflow for a component type
 */
export interface ProgressTemplate {
  /** UUID */
  id: string
  /** Component type this template applies to */
  component_type: ComponentType
  /** Template version (currently always 1) */
  version: number
  /** Workflow type: discrete (boolean), quantity (count), or hybrid (mix) */
  workflow_type: 'discrete' | 'quantity' | 'hybrid'
  /** Array of milestone configurations */
  milestones_config: MilestoneConfig[]
}

// ============================================================================
// Drawing Row (UI Entity)
// ============================================================================

/**
 * Drawing with aggregated progress metrics
 * Combines data from drawings table + mv_drawing_progress view
 */
export interface DrawingRow {
  // From drawings table
  /** UUID */
  id: string
  /** Project UUID */
  project_id: string
  /** Normalized drawing number (e.g., "P-001") */
  drawing_no_norm: string
  /** Original drawing number from import */
  drawing_no_raw: string
  /** Drawing title (optional) */
  title: string | null
  /** Revision number (optional) */
  rev: string | null
  /** True if drawing is retired/archived */
  is_retired: boolean

  // Metadata fields
  /** Area metadata (optional) */
  area: { id: string; name: string } | null
  /** System metadata (optional) */
  system: { id: string; name: string } | null
  /** Test package metadata (optional) */
  test_package: { id: string; name: string } | null

  // Aggregated from components
  /** Most common spec from components on this drawing (optional) */
  spec: string | null

  // From mv_drawing_progress view
  /** Total count of components on this drawing */
  total_components: number
  /** Count of components at 100% complete */
  completed_components: number
  /** Average percent_complete across all components (0.00 to 100.00) */
  avg_percent_complete: number
}

// ============================================================================
// Component Row (UI Entity)
// ============================================================================

/**
 * Component with joined template and computed UI fields
 * Extends database component with template + permissions
 */
export interface ComponentRow {
  // From components table
  /** UUID */
  id: string
  /** Project UUID */
  project_id: string
  /** Drawing UUID (nullable - unassigned components) */
  drawing_id: string | null
  /** Component type (determines which template is used) */
  component_type: ComponentType
  /** Identity key (JSONB) - uniquely identifies component */
  identity_key: IdentityKey | { pipe_id: string }
  /** Attributes (JSONB) - component-specific data */
  attributes?: {
    total_linear_feet?: number
    original_qty?: number
    line_numbers?: string[]
    [key: string]: any
  }
  /** Current milestone states (JSONB): { "Receive": true, "Install": false, "Fabricate": 50, ... } */
  current_milestones: Record<string, boolean | number>
  /** Calculated percentage complete (0.00 to 100.00) */
  percent_complete: number
  /** Component creation timestamp */
  created_at: string
  /** Last milestone update timestamp */
  last_updated_at: string
  /** User UUID who last updated (nullable) */
  last_updated_by: string | null
  /** True if component is retired/archived */
  is_retired: boolean

  // Metadata fields (optional, inherited from drawing if null)
  /** Area metadata (optional) */
  area?: { id: string; name: string } | null
  /** System metadata (optional) */
  system?: { id: string; name: string } | null
  /** Test package metadata (optional) */
  test_package?: { id: string; name: string } | null

  // Joined from progress_templates
  /** Progress template for this component type */
  template: ProgressTemplate

  // Computed UI fields
  /** Human-readable identity (e.g., "VBALU-001 2\" (1)") */
  identityDisplay: string
  /** True if current user can update milestones */
  canUpdate: boolean
}

// ============================================================================
// Milestone Update Structures
// ============================================================================

/**
 * Payload for milestone update mutation
 * Sent to Supabase RPC function update_component_milestone
 */
export interface MilestoneUpdatePayload {
  /** Component UUID to update */
  component_id: string
  /** Milestone name to update (must exist in template) */
  milestone_name: string
  /** New value: boolean for discrete, 0-100 for partial */
  value: boolean | number
  /** User UUID performing the update */
  user_id: string
}

/**
 * Response from milestone update RPC function
 * Includes updated component + audit metadata
 */
export interface MilestoneUpdateResponse {
  /** Updated component record */
  component: ComponentRow
  /** Previous milestone value (for rollback) */
  previous_value: boolean | number | null
  /** UUID of created milestone_event audit record */
  audit_event_id: string
  /** New calculated percent_complete */
  new_percent_complete: number
}

// ============================================================================
// Validation Result
// ============================================================================

/**
 * Result from validateMilestoneUpdate utility function
 */
export type ValidationResult =
  | { valid: true }
  | { valid: false; error: string }

// ============================================================================
// URL State Types
// ============================================================================

/**
 * Status filter options
 */
export type StatusFilter = 'all' | 'not-started' | 'in-progress' | 'complete'

/**
 * Sort field options
 */
export type SortField =
  | 'drawing_no_norm'
  | 'title'
  | 'spec'
  | 'area'
  | 'system'
  | 'test_package'
  | 'avg_percent_complete'
  | 'total_components'

/**
 * Sort direction options
 * Re-exported from SortableColumnHeader for backward compatibility
 */
export type SortDirection = SortDirectionType

/**
 * URL query parameters for the drawing table page
 */
export interface DrawingTableURLParams {
  /** Comma-separated drawing UUIDs */
  expanded?: string
  /** Search term for filtering drawings */
  search?: string
  /** Status filter */
  status?: StatusFilter
  /** Sort field */
  sort?: SortField
  /** Sort direction */
  dir?: SortDirection
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Type guard: Check if a value is a valid ComponentType
 */
export function isValidComponentType(value: unknown): value is ComponentType {
  const validTypes: ComponentType[] = [
    'spool',
    'field_weld',
    'support',
    'valve',
    'fitting',
    'flange',
    'instrument',
    'tubing',
    'hose',
    'misc_component',
    'threaded_pipe',
    'pipe',
  ]
  return typeof value === 'string' && validTypes.includes(value as ComponentType)
}

/**
 * Type guard: Check if a milestone value is valid for discrete milestone
 */
export function isDiscreteMilestoneValue(value: unknown): value is boolean {
  return typeof value === 'boolean'
}

/**
 * Type guard: Check if a milestone value is valid for partial milestone
 */
export function isPartialMilestoneValue(value: unknown): value is number {
  return typeof value === 'number' && value >= 0 && value <= 100
}

// ============================================================================
// Drawing Assignment Types (Feature 011)
// ============================================================================

/**
 * Metadata value type for assignment (single and bulk)
 * 'NO_CHANGE' preserves existing drawing value
 */
export type MetadataValue = 'NO_CHANGE' | string | null | undefined

/**
 * Payload for assigning metadata to a single drawing
 * Used by useAssignDrawings hook
 *
 * Migration 00027: Now supports 'NO_CHANGE' to prevent overwriting existing values
 */
export interface DrawingAssignmentPayload {
  /** Target drawing UUID */
  drawing_id: string
  /** Area assignment ('NO_CHANGE' = preserve, null/undefined = clear, UUID = assign) */
  area_id?: MetadataValue
  /** System assignment ('NO_CHANGE' = preserve, null/undefined = clear, UUID = assign) */
  system_id?: MetadataValue
  /** Test package assignment ('NO_CHANGE' = preserve, null/undefined = clear, UUID = assign) */
  test_package_id?: MetadataValue
  /** User performing the assignment */
  user_id: string
}

/**
 * Payload for bulk assignment to multiple drawings
 * Supports 'NO_CHANGE' sentinel to preserve existing values
 */
export interface BulkDrawingAssignmentPayload {
  /** Array of drawing UUIDs (max 50) */
  drawing_ids: string[]
  /** Area assignment for all drawings */
  area_id?: MetadataValue
  /** System assignment for all drawings */
  system_id?: MetadataValue
  /** Test package assignment for all drawings */
  test_package_id?: MetadataValue
  /** User performing the assignment */
  user_id: string
}

/**
 * Response from assignment RPC functions
 * Indicates what changed during assignment + inheritance
 */
export interface InheritanceSummary {
  /** Whether the drawing was successfully updated */
  drawing_updated: boolean
  /** Count of components that inherited new values (were NULL before) */
  components_inherited: number
  /** Count of components that kept existing assignments (were not NULL) */
  components_kept_existing: number
}

// ============================================================================
// Selection State Types (Feature 011)
// ============================================================================

/**
 * Client-side state for drawing selection
 * Tracks which drawings are selected for bulk operations
 */
export interface SelectionState {
  /** Set of selected drawing UUIDs */
  selectedDrawingIds: Set<string>
  /** Maximum allowed selections (constant: 50) */
  maxSelections: 50
}

/**
 * Actions for managing selection state
 * Returned by useDrawingSelection hook
 */
export interface SelectionActions {
  /** Toggle selection for a single drawing */
  toggleDrawing(drawingId: string): void
  /** Select all visible drawings (up to 50 max) */
  selectAll(visibleDrawingIds: string[]): void
  /** Clear all selections */
  clearSelection(): void
  /** Check if a drawing is selected */
  isSelected(drawingId: string): boolean
}

// ============================================================================
// Inheritance Badge Types (Feature 011)
// ============================================================================

/**
 * Badge type indicating inheritance status
 * - inherited: Component value matches drawing value (gray badge)
 * - assigned: Component has manually assigned value (blue badge)
 * - none: Component has no value (no badge, show "—")
 */
export type BadgeType = 'inherited' | 'assigned' | 'none'

/**
 * Inheritance indicator with source information
 * Derived client-side by comparing component vs drawing values
 */
export interface InheritanceIndicator {
  /** Badge type to display */
  type: BadgeType
  /** Drawing number (for inherited values tooltip) */
  source?: string
}

// ============================================================================
// Metadata Description Types (Feature 011)
// ============================================================================

/**
 * Payload for updating metadata descriptions
 * Used by useUpdateArea, useUpdateSystem, useUpdateTestPackage hooks
 */
export interface UpdateDescriptionPayload {
  /** Type of metadata entity */
  entity_type: 'area' | 'system' | 'test_package'
  /** UUID of the entity to update */
  entity_id: string
  /** New description (null = clear, string = set, max 100 chars) */
  description: string | null
  /** User performing the update */
  user_id: string
}

// ============================================================================
// Database Type Extensions
// ============================================================================

/**
 * Re-export database types for convenience
 */
export type DatabaseComponent = Database['public']['Tables']['components']['Row']
export type DatabaseDrawing = Database['public']['Tables']['drawings']['Row']
export type DatabaseProgressTemplate = Database['public']['Tables']['progress_templates']['Row']
export type DatabaseMilestoneEvent = Database['public']['Tables']['milestone_events']['Row']

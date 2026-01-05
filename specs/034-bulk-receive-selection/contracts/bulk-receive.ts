/**
 * Bulk Receive Selection Mode - Type Contracts
 *
 * Feature: 034-bulk-receive-selection
 * Date: 2025-12-12
 *
 * These types define the contracts for the bulk receive functionality.
 * No new API endpoints are created; this feature uses the existing
 * update_component_milestone RPC.
 */

// =============================================================================
// Component Selection Types
// =============================================================================

/**
 * Props for the new ComponentsBulkActions component
 */
export interface ComponentsBulkActionsProps {
  /** Whether selection mode is active */
  selectionMode: boolean
  /** Callback to toggle selection mode on/off */
  onToggleSelectionMode: () => void
  /** Number of components currently selected */
  selectedCount: number
  /** Callback to clear all selections */
  onClearSelection: () => void
  /** Callback to execute bulk receive action */
  onMarkReceived: () => void
  /** Whether a bulk operation is in progress */
  isProcessing?: boolean
  /** Optional CSS classes */
  className?: string
}

/**
 * Extended props for ComponentList to support selection mode
 */
export interface ComponentListSelectionProps {
  /** Whether selection mode is active (checkboxes visible, row click selects) */
  selectionMode: boolean
  /** Callback when user clicks a row in browse mode (opens details) */
  onOpenDetails: (componentId: string) => void
  /** Callback for bulk selection change (shift+click range) */
  onSelectionChangeMany?: (componentIds: string[], isSelected: boolean) => void
}

/**
 * Extended props for ComponentRow to support selection mode
 */
export interface ComponentRowSelectionProps {
  /** Whether selection mode is active */
  selectionMode: boolean
  /** Callback to open component details (browse mode) */
  onOpenDetails: () => void
  /** Row index in the sorted array (for range selection) */
  rowIndex: number
}

// =============================================================================
// Bulk Receive Types
// =============================================================================

/**
 * Input for the bulk receive operation
 */
export interface BulkReceiveInput {
  /** Component IDs to mark as received */
  componentIds: string[]
  /** User ID performing the action */
  userId: string
}

/**
 * Result of the bulk receive operation
 */
export interface BulkReceiveResult {
  /** Total components that were processed */
  attempted: number
  /** Components successfully marked as received */
  updated: number
  /** Components skipped (already received) */
  skipped: number
  /** Components that failed to update */
  failed: number
  /** Error messages for failed updates (componentId -> error) */
  errors?: Record<string, string>
}

/**
 * Hook return type for useBulkReceiveComponents
 */
export interface UseBulkReceiveReturn {
  /** Execute bulk receive on selected components */
  bulkReceive: (input: BulkReceiveInput) => Promise<BulkReceiveResult>
  /** Whether a bulk operation is currently in progress */
  isProcessing: boolean
  /** The most recent result (for displaying summary) */
  lastResult: BulkReceiveResult | null
  /** Reset the last result */
  resetResult: () => void
}

// =============================================================================
// Existing Types (for reference)
// =============================================================================

/**
 * Milestone update payload (existing, from useUpdateMilestone)
 */
export interface MilestoneUpdatePayload {
  component_id: string
  milestone_name: string
  value: boolean | number
  user_id: string
  rollbackReason?: {
    reason: string
    reasonLabel: string
    details?: string
  }
}

/**
 * Milestone update response (existing, from useUpdateMilestone)
 */
export interface MilestoneUpdateResponse {
  component: {
    id: string
    current_milestones: Record<string, number>
    percent_complete: number
    // ... other component fields
  }
  previous_value: number | null
  audit_event_id: string
  new_percent_complete: number
}

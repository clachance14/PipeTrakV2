/**
 * Component Prop Contracts: Mobile Weld Log Optimization
 *
 * Feature: 022-weld-log-mobile
 * Date: 2025-11-02
 * Phase: 1 (Design)
 *
 * This file defines TypeScript interfaces for component props.
 * These contracts ensure type safety and document component APIs.
 *
 * NOTE: This is a DESIGN ARTIFACT, not executable code.
 * Actual implementation may have additional props (className, etc.)
 * but must include all props defined here.
 */

import type { EnrichedFieldWeld } from '@/types/database.types'

// ============================================================================
// WeldDetailModal Component
// ============================================================================

/**
 * Props for WeldDetailModal component
 *
 * Displays complete weld information in a modal dialog with actions for
 * NDE recording and welder assignment.
 *
 * Usage (mobile only, ≤1024px):
 *   <WeldDetailModal
 *     weld={selectedWeld}
 *     open={isDetailModalOpen}
 *     onClose={() => setIsDetailModalOpen(false)}
 *   />
 */
export interface WeldDetailModalProps {
  /**
   * The weld to display in the modal.
   * Must include all enriched data (component, drawing, welder, metadata).
   */
  weld: EnrichedFieldWeld

  /**
   * Whether the modal is currently open.
   * Controls Dialog visibility.
   */
  open: boolean

  /**
   * Callback fired when modal should close.
   * Triggered by:
   *   - Close button click
   *   - Backdrop click
   *   - Escape key press
   *
   * Parent should update state to close modal:
   *   onClose={() => setIsDetailModalOpen(false)}
   */
  onClose: () => void
}

// ============================================================================
// WeldLogTable Component (Modified)
// ============================================================================

/**
 * Props for WeldLogTable component (MODIFIED)
 *
 * Displays weld log in table format with mobile/desktop responsive views.
 *
 * CHANGES FROM EXISTING:
 *   - Added optional `onRowClick` prop for mobile row tap handling
 *   - Existing props (welds, sortColumn, sortDirection, onSort) unchanged
 */
export interface WeldLogTableProps {
  /**
   * Array of enriched field welds to display.
   * Already filtered by parent component (WeldLogPage).
   */
  welds: EnrichedFieldWeld[]

  /**
   * Current sort column.
   * Used to display sort indicator in column header.
   */
  sortColumn: string

  /**
   * Current sort direction ('asc' or 'desc').
   * Used to display sort indicator direction.
   */
  sortDirection: 'asc' | 'desc'

  /**
   * Callback fired when user clicks a column header to sort.
   * Parent should update sortColumn and sortDirection state.
   */
  onSort: (column: string) => void

  /**
   * NEW: Optional callback fired when user taps a weld row.
   * Only used on mobile (≤1024px).
   * Desktop view (>1024px) does NOT use this prop.
   *
   * When provided on mobile:
   *   - Entire row becomes clickable
   *   - Row shows hover state (bg-muted/50)
   *   - Drawing Number link uses stopPropagation to prevent modal opening
   *
   * Parent implementation:
   *   onRowClick={(weld) => {
   *     setSelectedWeld(weld)
   *     setIsDetailModalOpen(true)
   *   }}
   */
  onRowClick?: (weld: EnrichedFieldWeld) => void
}

// ============================================================================
// WeldLogPage State Types (NEW)
// ============================================================================

/**
 * State interface for WeldLogPage component
 *
 * Manages modal state and selected weld for detail view.
 *
 * Usage in WeldLogPage:
 *   const [selectedWeld, setSelectedWeld] = useState<EnrichedFieldWeld | null>(null)
 *   const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
 */
export interface WeldLogPageState {
  /**
   * Currently selected weld for detail modal.
   * null when no weld is selected or modal is closed.
   */
  selectedWeld: EnrichedFieldWeld | null

  /**
   * Whether the weld detail modal is currently open.
   * Should only be true on mobile when selectedWeld is non-null.
   */
  isDetailModalOpen: boolean
}

// ============================================================================
// Existing Component Props (Reused, No Changes)
// ============================================================================

/**
 * NDEResultDialog (REUSED, NO CHANGES)
 *
 * Existing dialog for recording NDE results.
 * Used by WeldDetailModal when "Record NDE" button is tapped.
 */
export interface NDEResultDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  weld: EnrichedFieldWeld
}

/**
 * WelderAssignDialog (REUSED, NO CHANGES)
 *
 * Existing dialog for assigning welders to field welds.
 * Used by WeldDetailModal when "Assign Welder" button is tapped.
 */
export interface WelderAssignDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  weld: EnrichedFieldWeld
}

// ============================================================================
// Type Guards & Utilities
// ============================================================================

/**
 * Type guard to check if a weld has a drawing (for null safety).
 *
 * Usage:
 *   if (hasDrawing(weld)) {
 *     // weld.drawing is guaranteed non-null
 *     return <a href={`/drawings/${weld.drawing.id}`}>{weld.drawing.drawing_no_norm}</a>
 *   }
 */
export function hasDrawing(weld: EnrichedFieldWeld): weld is EnrichedFieldWeld & { drawing: NonNullable<EnrichedFieldWeld['drawing']> } {
  return weld.drawing !== null && weld.drawing !== undefined
}

/**
 * Type guard to check if a weld has an assigned welder (for null safety).
 *
 * Usage:
 *   if (hasWelder(weld)) {
 *     // weld.welder is guaranteed non-null
 *     return `${weld.welder.stencil} - ${weld.welder.name}`
 *   }
 */
export function hasWelder(weld: EnrichedFieldWeld): weld is EnrichedFieldWeld & { welder: NonNullable<EnrichedFieldWeld['welder']> } {
  return weld.welder !== null && weld.welder !== undefined
}

// ============================================================================
// Validation Rules (Documented, Not Enforced in Types)
// ============================================================================

/**
 * Component Behavior Rules (to be enforced in implementation):
 *
 * WeldDetailModal:
 *   - MUST only render on mobile (≤1024px)
 *   - MUST close on Escape key, backdrop click, close button
 *   - MUST display "-" for null/undefined weld attributes
 *   - MUST have ≥44px touch targets for action buttons
 *   - MUST NOT open if weld is null/undefined
 *
 * WeldLogTable:
 *   - MUST show only 3 columns on mobile (≤1024px): Weld ID, Drawing Number, Date Welded
 *   - MUST show all 10 columns on desktop (>1024px)
 *   - MUST make entire row clickable on mobile if onRowClick provided
 *   - MUST use event.stopPropagation() on Drawing Number link to prevent modal opening
 *   - MUST have ≥44px row height on mobile
 *   - MUST NOT change desktop behavior (onRowClick should be undefined on desktop)
 *
 * WeldLogPage:
 *   - MUST only pass onRowClick to WeldLogTable on mobile
 *   - MUST ensure selectedWeld is non-null when isDetailModalOpen is true
 *   - MUST clear selectedWeld when modal closes (or leave as-is for re-opening performance)
 */

// ============================================================================
// Success Criteria Validation Types
// ============================================================================

/**
 * Type for validating touch target sizes (WCAG 2.1 AA compliance)
 *
 * Usage in tests:
 *   const rowHeight = row.getBoundingClientRect().height
 *   expect(rowHeight).toBeGreaterThanOrEqual(MINIMUM_TOUCH_TARGET_SIZE)
 */
export const MINIMUM_TOUCH_TARGET_SIZE = 44 // pixels, per WCAG 2.1 Level AA (SC 2.5.5)

/**
 * Type for validating mobile breakpoint
 *
 * Usage:
 *   const isMobile = window.innerWidth <= MOBILE_BREAKPOINT
 */
export const MOBILE_BREAKPOINT = 1024 // pixels, matches existing codebase standard

/**
 * Performance budget types for success criteria validation
 */
export interface PerformanceBudget {
  /**
   * SC-005: Mobile weld log table renders all visible rows in under 2 seconds
   * for datasets up to 1,000 welds
   */
  MAX_TABLE_RENDER_TIME_MS: 2000

  /**
   * SC-010: Weld detail modal loads and displays all content in under 1 second
   * on 3G mobile networks
   */
  MAX_MODAL_LOAD_TIME_MS: 1000
}

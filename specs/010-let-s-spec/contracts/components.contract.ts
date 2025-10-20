/**
 * API Contract: React Components for Drawing Table
 *
 * This file defines the TypeScript interfaces (props) for all React components
 * in the drawing-centered component table feature.
 *
 * These contracts serve as the source of truth for:
 * - Component tests (verify rendering and behavior)
 * - Implementation (what props are required/optional)
 * - Integration (how components compose together)
 */

import type { DrawingRow, ComponentRow, MilestoneConfig } from './hooks.contract'

// ============================================================================
// Page Component
// ============================================================================

/**
 * CONTRACT: DrawingComponentTablePage
 *
 * PURPOSE: Top-level page component for the unified drawing/component table
 *
 * PROPS: None (uses route params for projectId)
 *
 * ROUTING:
 * - Path: /components
 * - Protected: Yes (requires authentication)
 * - Permission: can_view_components
 *
 * LAYOUT:
 * - Top bar: Search input, status filter dropdown, "Collapse All" button
 * - Main area: Virtualized table with drawings and components
 * - No results state: "No drawings found" with illustration
 * - Loading state: Skeleton rows
 * - Error state: Error message with retry button
 *
 * URL STATE:
 * - ?expanded=uuid1,uuid2 (expanded drawings)
 * - ?search=P-001 (search term)
 * - ?status=in-progress (status filter)
 */
export interface DrawingComponentTablePageProps {}

// ============================================================================
// Table Components
// ============================================================================

/**
 * CONTRACT: DrawingTable
 *
 * PURPOSE: Container component for the virtualized drawing/component table
 *
 * PROPS:
 * - drawings: DrawingRow[] - All drawings with progress data
 * - expandedDrawingIds: Set<string> - IDs of expanded drawings
 * - onToggleDrawing: (drawingId: string) => void - Toggle expansion
 * - loading: boolean - Show skeleton state
 *
 * RENDERING:
 * - Uses @tanstack/react-virtual for virtualization
 * - Calculates visible rows (drawings + expanded components)
 * - Renders DrawingRow for each drawing
 * - Renders ComponentRow[] for each expanded drawing
 * - Fixed row heights: Drawing=64px, Component=60px
 * - Overscan: 10 rows
 *
 * PERFORMANCE:
 * - Only renders visible rows + overscan
 * - Supports 500 drawings + 10,000 components
 * - Smooth scrolling via virtualization
 */
export interface DrawingTableProps {
  drawings: DrawingRow[]
  expandedDrawingIds: Set<string>
  onToggleDrawing: (drawingId: string) => void
  loading: boolean
}

/**
 * CONTRACT: DrawingRow
 *
 * PURPOSE: Single row representing a drawing (parent row)
 *
 * PROPS:
 * - drawing: DrawingRow - Drawing data with progress
 * - isExpanded: boolean - Whether components are visible
 * - onToggle: () => void - Toggle expansion
 * - style: React.CSSProperties - For virtualization positioning
 *
 * VISUAL DESIGN:
 * - Background: slate-100 (light) / slate-800 (dark)
 * - Left border: 4px blue-500 accent
 * - Font: 16px bold
 * - Hover: Highlight entire row, cursor pointer
 * - Click anywhere: Toggle expansion
 *
 * COLUMNS:
 * - Expand icon: ChevronRight (rotates 90° when expanded)
 * - Drawing #: drawing_no_norm
 * - Title: title or "—" if null
 * - Progress: "{completed}/{total} • {avg}%" (e.g., "15/23 • 65%")
 * - Component count: "{total} items"
 *
 * ACCESSIBILITY:
 * - Role: button
 * - aria-expanded: isExpanded
 * - aria-label: "Expand drawing {drawing_no_norm}" or "Collapse drawing {drawing_no_norm}"
 * - Keyboard: Space/Enter to toggle
 */
export interface DrawingRowProps {
  drawing: DrawingRow
  isExpanded: boolean
  onToggle: () => void
  style: React.CSSProperties
}

/**
 * CONTRACT: ComponentRow
 *
 * PURPOSE: Single row representing a component (child row under drawing)
 *
 * PROPS:
 * - component: ComponentRow - Component data with template
 * - visibleMilestones: string[] - Milestone names to show as columns
 * - onMilestoneUpdate: (milestoneName: string, value: boolean | number) => void
 * - style: React.CSSProperties - For virtualization positioning
 *
 * VISUAL DESIGN:
 * - Indentation: 32px left padding
 * - Background: white (light) / slate-900 (dark)
 * - Font: 14px regular
 * - Bottom border: 1px slate-200
 *
 * COLUMNS:
 * - Identity: identityDisplay (e.g., "VBALU-001 2\" (1)")
 * - Type: component_type badge (e.g., "valve")
 * - Milestone columns (dynamic): One per visibleMilestones
 *   - Discrete: Checkbox
 *   - Partial: Percentage clickable text
 *   - Not in template: "—" placeholder
 * - Progress: "{percent_complete}%" (e.g., "65.5%")
 *
 * INTERACTIONS:
 * - Checkbox click: Immediate toggle (optimistic update)
 * - Percentage click: Open popover editor
 * - No row-level click (unlike drawing row)
 *
 * ACCESSIBILITY:
 * - Role: row
 * - Each cell: role="cell"
 */
export interface ComponentRowProps {
  component: ComponentRow
  visibleMilestones: string[]
  onMilestoneUpdate: (milestoneName: string, value: boolean | number) => void
  style: React.CSSProperties
}

// ============================================================================
// Milestone Controls
// ============================================================================

/**
 * CONTRACT: MilestoneCheckbox
 *
 * PURPOSE: Discrete milestone control (boolean toggle)
 *
 * PROPS:
 * - milestone: MilestoneConfig - Milestone configuration
 * - checked: boolean - Current value
 * - onChange: (checked: boolean) => void - Toggle callback
 * - disabled: boolean - Based on permissions
 *
 * VISUAL DESIGN:
 * - Uses Radix Checkbox primitive (src/components/ui/checkbox.tsx)
 * - Size: 20x20px
 * - Checked: Checkmark icon, blue-500 background
 * - Unchecked: Empty, border only
 * - Disabled: Greyed out, cursor not-allowed
 *
 * INTERACTIONS:
 * - Click: Toggle checked state
 * - Keyboard: Space to toggle
 * - Hover: Show tooltip with milestone name + weight
 *   - Example: "Receive (10%)"
 *
 * ACCESSIBILITY:
 * - Role: checkbox
 * - aria-checked: checked
 * - aria-label: milestone.name
 * - aria-disabled: disabled
 */
export interface MilestoneCheckboxProps {
  milestone: MilestoneConfig
  checked: boolean
  onChange: (checked: boolean) => void
  disabled: boolean
}

/**
 * CONTRACT: PartialMilestoneEditor
 *
 * PURPOSE: Partial milestone control (0-100% slider)
 *
 * PROPS:
 * - milestone: MilestoneConfig - Milestone configuration
 * - currentValue: number - Current percentage (0-100)
 * - onUpdate: (value: number) => void - Update callback
 * - disabled: boolean - Based on permissions
 *
 * VISUAL DESIGN:
 * - Trigger: Clickable percentage text (e.g., "75%")
 *   - Underline on hover
 *   - Blue-500 color
 * - Popover: 320px wide, positioned below trigger
 *   - Slider: 0-100 range, step 5
 *   - Value display: "{tempValue}%" above slider
 *   - Update button: Primary button, bottom right
 *
 * INTERACTIONS:
 * - Click percentage: Open popover
 * - Drag slider: Update tempValue (local state)
 * - Click "Update": Call onUpdate, close popover
 * - Click outside: Close without saving
 * - ESC key: Close without saving
 * - Disabled: Show percentage text only, no underline, greyed out
 *
 * ACCESSIBILITY:
 * - Trigger: role="button", aria-label="{milestone.name}: {currentValue}%"
 * - Slider: role="slider", aria-valuemin=0, aria-valuemax=100, aria-valuenow=tempValue
 * - Keyboard: Arrow keys to adjust slider (5% steps)
 */
export interface PartialMilestoneEditorProps {
  milestone: MilestoneConfig
  currentValue: number
  onUpdate: (value: number) => void
  disabled: boolean
}

// ============================================================================
// Filter/Search Components
// ============================================================================

/**
 * CONTRACT: DrawingSearchInput
 *
 * PURPOSE: Search input for filtering drawings by number
 *
 * PROPS:
 * - value: string - Current search term
 * - onChange: (value: string) => void - Update callback
 * - placeholder: string - Placeholder text (default: "Search drawings...")
 *
 * VISUAL DESIGN:
 * - Width: 300px on desktop, full width on mobile
 * - Icon: Search icon (lucide-react) on left
 * - Clear button: X icon on right (only when value is non-empty)
 * - Border: slate-200, focus ring blue-500
 *
 * INTERACTIONS:
 * - Type: Debounced onChange (300ms)
 * - Clear: Click X to reset
 * - Keyboard: Ctrl+F focuses input
 *
 * ACCESSIBILITY:
 * - Role: search
 * - aria-label: "Search drawings by number"
 * - Clear button: aria-label="Clear search"
 */
export interface DrawingSearchInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

/**
 * CONTRACT: StatusFilterDropdown
 *
 * PURPOSE: Dropdown for filtering drawings by progress status
 *
 * PROPS:
 * - value: 'all' | 'not-started' | 'in-progress' | 'complete'
 * - onChange: (value: string) => void
 *
 * VISUAL DESIGN:
 * - Uses Radix Select primitive (src/components/ui/select.tsx)
 * - Width: 200px
 * - Options:
 *   - "All Drawings" (all)
 *   - "Not Started (0%)" (not-started)
 *   - "In Progress (>0%)" (in-progress)
 *   - "Complete (100%)" (complete)
 * - Icon: Checkmark next to selected option
 *
 * INTERACTIONS:
 * - Click: Open dropdown
 * - Select: Update filter, close dropdown
 * - Keyboard: Arrow keys to navigate, Enter to select
 *
 * ACCESSIBILITY:
 * - Role: combobox
 * - aria-label: "Filter by progress status"
 * - aria-expanded: open/closed
 */
export interface StatusFilterDropdownProps {
  value: 'all' | 'not-started' | 'in-progress' | 'complete'
  onChange: (value: 'all' | 'not-started' | 'in-progress' | 'complete') => void
}

// ============================================================================
// Action Components
// ============================================================================

/**
 * CONTRACT: CollapseAllButton
 *
 * PURPOSE: Button to collapse all expanded drawings
 *
 * PROPS:
 * - onClick: () => void - Collapse callback
 * - disabled: boolean - True if no drawings are expanded
 *
 * VISUAL DESIGN:
 * - Variant: Secondary button
 * - Icon: ChevronUp icon
 * - Text: "Collapse All"
 * - Disabled state: Greyed out when disabled
 *
 * INTERACTIONS:
 * - Click: Collapse all drawings, update URL
 * - Keyboard: Enter/Space to activate
 *
 * ACCESSIBILITY:
 * - Role: button
 * - aria-label: "Collapse all expanded drawings"
 * - aria-disabled: disabled
 */
export interface CollapseAllButtonProps {
  onClick: () => void
  disabled: boolean
}

// ============================================================================
// State Components
// ============================================================================

/**
 * CONTRACT: DrawingTableSkeleton
 *
 * PURPOSE: Loading skeleton for drawing table
 *
 * PROPS:
 * - rowCount: number - Number of skeleton rows to show (default: 10)
 *
 * VISUAL DESIGN:
 * - Grey animated gradient bars
 * - Same layout as actual DrawingRow
 * - 64px row height
 * - Pulse animation
 *
 * ACCESSIBILITY:
 * - aria-label: "Loading drawings"
 * - role: status
 */
export interface DrawingTableSkeletonProps {
  rowCount?: number
}

/**
 * CONTRACT: EmptyDrawingsState
 *
 * PURPOSE: Empty state when no drawings match filters
 *
 * PROPS:
 * - hasSearch: boolean - True if search term is active
 * - hasFilter: boolean - True if status filter is active
 * - onClearFilters: () => void - Clear all filters
 *
 * VISUAL DESIGN:
 * - Centered in table area
 * - Icon: FileText (lucide-react), 64px, slate-400
 * - Title: "No drawings found"
 * - Description:
 *   - With filters: "Try adjusting your search or filters"
 *   - Without filters: "No drawings exist for this project"
 * - Clear filters button (only shown if hasSearch || hasFilter)
 *
 * ACCESSIBILITY:
 * - role: status
 * - aria-live: polite
 */
export interface EmptyDrawingsStateProps {
  hasSearch: boolean
  hasFilter: boolean
  onClearFilters: () => void
}

/**
 * CONTRACT: DrawingTableError
 *
 * PURPOSE: Error state when drawing fetch fails
 *
 * PROPS:
 * - error: Error - Error object
 * - onRetry: () => void - Retry callback
 *
 * VISUAL DESIGN:
 * - Centered in table area
 * - Icon: AlertCircle (lucide-react), 64px, red-500
 * - Title: "Failed to load drawings"
 * - Description: error.message
 * - Retry button: Primary button
 *
 * ACCESSIBILITY:
 * - role: alert
 * - aria-live: assertive
 */
export interface DrawingTableErrorProps {
  error: Error
  onRetry: () => void
}

// ============================================================================
// Responsive Wrappers
// ============================================================================

/**
 * CONTRACT: ResponsiveMilestoneColumns
 *
 * PURPOSE: Wrapper that shows/hides milestone columns based on screen size
 *
 * PROPS:
 * - milestones: MilestoneConfig[] - All milestones for current components
 * - renderColumn: (milestone: MilestoneConfig) => ReactNode
 * - renderMoreButton: () => ReactNode - For tablet view
 *
 * RESPONSIVE BEHAVIOR:
 * - Desktop (≥1024px): Show all milestones inline
 * - Tablet (768-1023px): Show first 3 (Receive, Install, Test) + "More" button
 * - Mobile (<768px): Hide milestone columns entirely
 *
 * IMPLEMENTATION:
 * - Uses Tailwind responsive classes: hidden md:block lg:block
 * - "More" button opens side panel with remaining milestones
 */
export interface ResponsiveMilestoneColumnsProps {
  milestones: MilestoneConfig[]
  renderColumn: (milestone: MilestoneConfig) => React.ReactNode
  renderMoreButton: () => React.ReactNode
}

// ============================================================================
// Composition Example
// ============================================================================

/**
 * EXAMPLE: Component Hierarchy
 *
 * <DrawingComponentTablePage>
 *   <PageHeader>
 *     <DrawingSearchInput />
 *     <StatusFilterDropdown />
 *     <CollapseAllButton />
 *   </PageHeader>
 *
 *   {loading && <DrawingTableSkeleton />}
 *   {error && <DrawingTableError />}
 *   {drawings.length === 0 && <EmptyDrawingsState />}
 *
 *   {drawings.length > 0 && (
 *     <DrawingTable>
 *       {visibleRows.map(row => (
 *         row.type === 'drawing' ? (
 *           <DrawingRow key={row.data.id} />
 *         ) : (
 *           <ComponentRow key={row.data.id}>
 *             <ResponsiveMilestoneColumns>
 *               {milestone.is_partial ? (
 *                 <PartialMilestoneEditor />
 *               ) : (
 *                 <MilestoneCheckbox />
 *               )}
 *             </ResponsiveMilestoneColumns>
 *           </ComponentRow>
 *         )
 *       ))}
 *     </DrawingTable>
 *   )}
 * </DrawingComponentTablePage>
 */

/**
 * Contract: Drawing Selection State Management
 *
 * Defines the interface for managing which drawings are selected for bulk operations.
 * Selection state is persisted in URL query parameters for shareability.
 *
 * Functional Requirements Covered:
 * - FR-017 to FR-020: Selection state management and URL persistence
 * - FR-007 to FR-009: Select Mode toggle and checkboxes
 * - FR-014: Maximum 50 drawings per bulk operation
 */

/**
 * Selection state interface
 * Represents which drawings are currently selected for bulk operations
 */
export interface SelectionState {
  /** Set of selected drawing UUIDs (max 50) */
  selectedDrawingIds: Set<string>;

  /** Maximum allowed selections (constant 50 per FR-014) */
  maxSelections: 50;
}

/**
 * Selection actions interface
 * Operations that modify the selection state
 */
export interface SelectionActions {
  /**
   * Toggle a single drawing's selection state
   *
   * @param drawingId - UUID of drawing to toggle
   *
   * Behavior:
   * - If drawing is selected → remove from set
   * - If drawing is not selected and count < 50 → add to set
   * - If count = 50 and trying to add → show warning toast, do nothing
   * - Updates URL query param ?selected=uuid1,uuid2,...
   */
  toggleDrawing(drawingId: string): void;

  /**
   * Select all visible drawings (respecting 50-drawing limit)
   *
   * @param visibleDrawingIds - Array of currently visible drawing UUIDs
   *
   * Behavior:
   * - Adds all visible drawings to selection (up to 50 total)
   * - If visibleDrawingIds.length > 50 → select first 50, show warning
   * - Updates URL query param
   */
  selectAll(visibleDrawingIds: string[]): void;

  /**
   * Clear all selections
   *
   * Behavior:
   * - Sets selectedDrawingIds to empty Set
   * - Removes ?selected param from URL
   */
  clearSelection(): void;

  /**
   * Check if a drawing is currently selected
   *
   * @param drawingId - UUID to check
   * @returns true if drawing is in selectedDrawingIds set
   */
  isSelected(drawingId: string): boolean;
}

/**
 * Combined contract interface for selection management
 */
export interface DrawingSelectionContract extends SelectionState, SelectionActions {}

/**
 * URL Format (from research.md decision #3):
 *
 * Empty selection:
 * /components
 *
 * Single selection:
 * /components?selected=a1b2c3d4-e5f6-7890-abcd-ef1234567890
 *
 * Multiple selections:
 * /components?selected=uuid1,uuid2,uuid3
 *
 * Max length: 50 UUIDs × 36 chars + 49 commas = 1849 chars (safe under 2048 browser limit)
 */

/**
 * Expected implementation using React Router useSearchParams:
 *
 * ```typescript
 * import { useMemo, useCallback } from 'react';
 * import { useSearchParams } from 'react-router-dom';
 * import { toast } from 'sonner';
 *
 * export function useDrawingSelection(): DrawingSelectionContract {
 *   const [searchParams, setSearchParams] = useSearchParams();
 *
 *   // Parse from URL
 *   const selectedDrawingIds = useMemo(() => {
 *     const param = searchParams.get('selected');
 *     if (!param) return new Set<string>();
 *
 *     const ids = param.split(',').filter(id => id.length === 36); // UUID v4 validation
 *
 *     if (ids.length > 50) {
 *       toast.warning('Selection limited to 50 drawings');
 *       return new Set(ids.slice(0, 50));
 *     }
 *
 *     return new Set(ids);
 *   }, [searchParams]);
 *
 *   // Update URL
 *   const updateURL = useCallback((ids: Set<string>) => {
 *     const newParams = new URLSearchParams(searchParams);
 *     if (ids.size === 0) {
 *       newParams.delete('selected');
 *     } else {
 *       newParams.set('selected', Array.from(ids).join(','));
 *     }
 *     setSearchParams(newParams);
 *   }, [searchParams, setSearchParams]);
 *
 *   const toggleDrawing = useCallback((drawingId: string) => {
 *     const newSelection = new Set(selectedDrawingIds);
 *     if (newSelection.has(drawingId)) {
 *       newSelection.delete(drawingId);
 *     } else {
 *       if (newSelection.size >= 50) {
 *         toast.warning('Maximum 50 drawings can be selected');
 *         return;
 *       }
 *       newSelection.add(drawingId);
 *     }
 *     updateURL(newSelection);
 *   }, [selectedDrawingIds, updateURL]);
 *
 *   const selectAll = useCallback((visibleDrawingIds: string[]) => {
 *     const newSelection = new Set(visibleDrawingIds.slice(0, 50));
 *     if (visibleDrawingIds.length > 50) {
 *       toast.warning(`Selected first 50 of ${visibleDrawingIds.length} visible drawings`);
 *     }
 *     updateURL(newSelection);
 *   }, [updateURL]);
 *
 *   const clearSelection = useCallback(() => {
 *     updateURL(new Set());
 *   }, [updateURL]);
 *
 *   const isSelected = useCallback((drawingId: string) => {
 *     return selectedDrawingIds.has(drawingId);
 *   }, [selectedDrawingIds]);
 *
 *   return {
 *     selectedDrawingIds,
 *     maxSelections: 50,
 *     toggleDrawing,
 *     selectAll,
 *     clearSelection,
 *     isSelected,
 *   };
 * }
 * ```
 */

/**
 * State persistence behavior:
 *
 * 1. Page load with ?selected param:
 *    - Parse UUIDs from URL
 *    - Validate format (36-char UUIDs)
 *    - Enforce 50-drawing limit
 *    - Restore checkboxes to checked state
 *
 * 2. User toggles checkbox:
 *    - Update selectedDrawingIds Set
 *    - Serialize to comma-separated string
 *    - Update URL via setSearchParams
 *    - React Router handles browser history
 *
 * 3. User clicks browser back/forward:
 *    - React Router updates searchParams
 *    - useMemo recomputes selectedDrawingIds
 *    - Checkboxes re-render with new state
 *
 * 4. User shares URL:
 *    - Recipient opens URL with ?selected param
 *    - Selection state is restored
 *    - Same drawings are checked
 */

/**
 * Edge cases handled:
 *
 * - Invalid UUID format in URL → filtered out during parse
 * - URL too long (>2048 chars) → impossible (50 × 36 + 49 = 1849 chars)
 * - Drawing ID in URL but not in current project → checkbox hidden (drawing doesn't render)
 * - Drawing ID in URL but filtered out by search → checkbox checked but not visible
 * - User refreshes page → selection preserved via URL
 * - User clears selection → URL updated to remove ?selected param
 */

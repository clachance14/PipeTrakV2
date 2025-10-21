/**
 * Hook: useDrawingSelection
 * Feature: 011-the-drawing-component
 *
 * Manages drawing selection state via URL query parameters.
 * Selection persists across page refresh and is shareable via URL.
 *
 * URL format: /components?selected=uuid1,uuid2,uuid3
 * Max 50 drawings (enforced to prevent URL length issues)
 */

import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { SelectionActions } from '@/types/drawing-table.types';

const MAX_SELECTIONS = 50;
const SELECTED_PARAM = 'selected';

/**
 * Hook for managing drawing selection state
 *
 * Features:
 * - URL-based persistence (survives refresh, shareable)
 * - 50-drawing limit enforcement
 * - Comma-separated UUID format
 * - Type-safe selection actions
 *
 * @returns Object with selection state and actions
 *
 * @example
 * const { selectedDrawingIds, toggleDrawing, selectAll, clearSelection, isSelected } = useDrawingSelection();
 *
 * // Toggle single drawing
 * toggleDrawing('drawing-uuid');
 *
 * // Select all visible drawings (up to 50)
 * selectAll(['uuid1', 'uuid2', 'uuid3']);
 *
 * // Clear all selections
 * clearSelection();
 *
 * // Check if drawing is selected
 * if (isSelected('uuid')) { ... }
 */
export function useDrawingSelection(): {
  selectedDrawingIds: Set<string>;
  maxSelections: typeof MAX_SELECTIONS;
} & SelectionActions {
  const [searchParams, setSearchParams] = useSearchParams();

  // Parse selected drawing IDs from URL
  const selectedDrawingIds = useMemo(() => {
    const param = searchParams.get(SELECTED_PARAM);
    if (!param) return new Set<string>();

    const ids = param.split(',').filter((id) => id.length === 36); // UUID v4 length

    // Enforce 50-drawing limit
    if (ids.length > MAX_SELECTIONS) {
      console.warn(`Selection limited to ${MAX_SELECTIONS} drawings for performance`);
      return new Set(ids.slice(0, MAX_SELECTIONS));
    }

    return new Set(ids);
  }, [searchParams]);

  // Update URL with new selection
  const updateSelection = useCallback(
    (ids: Set<string>) => {
      if (ids.size === 0) {
        searchParams.delete(SELECTED_PARAM);
      } else {
        searchParams.set(SELECTED_PARAM, Array.from(ids).join(','));
      }
      setSearchParams(searchParams, { replace: true });
    },
    [searchParams, setSearchParams]
  );

  // Toggle selection for a single drawing
  const toggleDrawing = useCallback(
    (drawingId: string) => {
      const newSelection = new Set(selectedDrawingIds);

      if (newSelection.has(drawingId)) {
        newSelection.delete(drawingId);
      } else {
        if (newSelection.size >= MAX_SELECTIONS) {
          console.warn(`Maximum ${MAX_SELECTIONS} drawings can be selected`);
          return;
        }
        newSelection.add(drawingId);
      }

      updateSelection(newSelection);
    },
    [selectedDrawingIds, updateSelection]
  );

  // Select all visible drawings (up to 50 max)
  const selectAll = useCallback(
    (visibleDrawingIds: string[]) => {
      const idsToSelect = visibleDrawingIds.slice(0, MAX_SELECTIONS);

      if (visibleDrawingIds.length > MAX_SELECTIONS) {
        console.warn(`Selection limited to ${MAX_SELECTIONS} drawings`);
      }

      updateSelection(new Set(idsToSelect));
    },
    [updateSelection]
  );

  // Clear all selections
  const clearSelection = useCallback(() => {
    updateSelection(new Set());
  }, [updateSelection]);

  // Check if a drawing is selected
  const isSelected = useCallback(
    (drawingId: string) => {
      return selectedDrawingIds.has(drawingId);
    },
    [selectedDrawingIds]
  );

  return {
    selectedDrawingIds,
    maxSelections: MAX_SELECTIONS,
    toggleDrawing,
    selectAll,
    clearSelection,
    isSelected,
  };
}

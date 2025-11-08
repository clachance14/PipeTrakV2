# Component Numbering Enhancement

**Date:** 2025-10-30
**Status:** Implemented
**Branch:** 021-public-homepage

## Overview

Changed component duplicate numbering from "(1)", "(2)" format to "1 of 2", "2 of 2" format across all component lists. Only shows numbering when there are multiple identical components within the same drawing.

## Requirements

- Display format: "1 of 2", "2 of 2" for duplicates
- No suffix for single instances (clean UI)
- Apply to all component lists throughout the app
- Count scope: Within each drawing only
- Identity logic: Same as existing (drawing_norm + commodity_code + size)

## Implementation

### Architecture

Client-side grouping with shared utility function (`calculateDuplicateCounts`). No database changes required.

### Key Components

1. **calculateDuplicateCounts** (`src/lib/calculateDuplicateCounts.ts`)
   - Groups components by identity key
   - Returns Map<identityKey, totalCount>
   - O(1) lookup performance

2. **formatIdentityKey** (`src/lib/formatIdentityKey.ts`)
   - Extended with optional `totalCount` parameter
   - Format logic:
     - totalCount > 1: Show "seq of totalCount"
     - totalCount === 1 or undefined: No suffix
     - Instruments: No suffix (unchanged)

3. **Hook Integration**
   - Modified 5 hooks to calculate and pass totalCount:
     - useComponentsByDrawings
     - useComponentsByDrawing
     - useFieldWelds
     - usePackages
     - (useComponents skipped - doesn't use formatIdentityKey)

### Files Modified

- New: `src/lib/calculateDuplicateCounts.ts` + tests (5 test cases)
- Modified: `src/lib/formatIdentityKey.ts` + tests (updated 8, added 6 tests)
- Modified: `src/lib/field-weld-utils.ts` (bonus enhancement)
- Modified: 4 hooks in `src/hooks/`
- Updated: 6 integration test files

## Testing

- Unit tests for calculateDuplicateCounts (5 test cases)
- Updated formatIdentityKey tests (14 total test cases)
- Updated integration tests (6 files)
- All new tests pass
- Type check: PASS
- Build: SUCCESS

## Examples

**Before:**
- `"Support: G4G-1412-05AA-001-6-6 6\" (1)"`
- `"Support: G4G-1412-05AA-001-6-6 6\" (2)"`

**After:**
- `"Support: G4G-1412-05AA-001-6-6 6\" 1 of 2"`
- `"Support: G4G-1412-05AA-001-6-6 6\" 2 of 2"`

**Single instance:**
- Before: `"Flange: FBLABLDRAWNF0261 2\" (1)"`
- After: `"Flange: FBLABLDRAWNF0261 2\""` (no suffix)

## Edge Cases Handled

- Instruments: Always skip numbering
- Single instances: No suffix for clean UI
- Cross-drawing: Components counted separately per drawing
- NOSIZE components: Handled correctly
- Empty arrays: Graceful degradation
- Performance: Efficient for 10,000+ components

## Risk Assessment

**Low Risk:**
- No database changes
- Backward compatible (totalCount is optional)
- Pure functions with comprehensive tests
- UI-only change, visible immediately
- Quick rollback via git revert

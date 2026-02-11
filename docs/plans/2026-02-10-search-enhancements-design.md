# Search Enhancements Design

**Date**: 2026-02-10
**Status**: Approved

## Problem

The global search (`get_search_index` RPC) has gaps:

1. **Commodity codes not searchable** for most component types. Only supports expose commodity_code in the label. Valves, fittings, flanges, instruments, tubing, hose, and misc components store commodity_code in `identity_key` but the search index doesn't surface it.
2. **No identity count**. When 3 valves share the same identity (VCHKU 2" seq 1, 2, 3), all 3 appear as separate results with no indication they're related.
3. **No "show all" overflow**. When a search matches many components, the 5-result cap hides the rest with no way to see them all.

## Design

### SQL: Rewrite component section of `get_search_index`

Replace the current per-row component query with a CTE that groups components by display identity:

- **Group by**: `component_type + drawing_id + commodity_code + size` (plus label expression)
- **Label**: Same CASE logic as current (tag_number for valves, spool_id for spools, etc.)
- **Sublabel** (NEW): `"VCHKU on DWG-001"` — commodity_code + drawing number. Makes commodity codes searchable since `useGlobalSearch` matches against sublabel.
- **Badge** (ENHANCED): `"Valve x3"` when identity_count > 1, else just `"Valve"`
- **ID**: `MIN(c.id)` — representative ID for navigation

Edge cases:
- Spools/pipes have no commodity_code: sublabel = NULL
- Components with no drawing: sublabel = commodity_code only
- Single-instance components: badge omits count (just "Valve", not "Valve x1")

### UI: "Show all X results" link

Add a clickable footer to the component group in `SearchResultsDropdown.tsx` when `totalCount > items.length`. Navigates to `/components?search={query}`.

### No changes needed

- `useGlobalSearch.ts` — already tracks `totalCount` per group
- `useSearchIndex.ts` — return type unchanged

## Files Changed

| File | Change |
|------|--------|
| New migration `.sql` | Rewrite `get_search_index` component CTE |
| `src/components/search/SearchResultsDropdown.tsx` | "Show all X results" link |

## What Becomes Searchable

- Commodity codes (VPLSU, VCHKU, EL90, etc.) for all component types
- Drawing numbers as component context

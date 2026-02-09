# Global Search — Design Document

**Date:** 2026-02-09
**Status:** Approved

## Overview

Wire up the existing search bar in the Layout header to provide project-scoped, grouped search results as the user types. Results are grouped by category (Drawings, Components, Welders, Test Packages, Field Welds, Areas) and clicking a result navigates to the appropriate page.

## UX Flow

1. User clicks into the existing search bar and starts typing
2. After 300ms debounce, a dropdown panel appears below the search bar
3. Results are grouped by category with section headers
4. Each group shows up to 5 results; empty groups are hidden
5. Clicking a result navigates to the right place and closes the dropdown
6. Clicking outside or pressing Escape closes the dropdown
7. If no results match, show "No results found for '...'"

## Result Display Per Category

| Category | Label | Sublabel | Badge | Route |
|----------|-------|----------|-------|-------|
| Drawings | drawing_no_raw | title | — | `/drawings?expanded={id}` |
| Components | identity display | — | component_type | `/components` (filtered) |
| Welders | name | `Stencil: {stencil}` | — | `/welders` |
| Test Packages | name | — | — | `/packages/{id}/components` |
| Field Welds | weld_id display | `on {drawing_no}` | — | `/weld-log` |
| Areas | name | description | — | `/components?area={id}` |

## Data Architecture

### Search Index RPC

A single Supabase RPC `get_search_index(p_project_id)` returns a flat array:

```sql
-- Returns: id, category, label, sublabel, badge, route
-- Uses UNION ALL across tables
-- Respects RLS via SECURITY DEFINER with permission check
```

```typescript
type SearchIndexItem = {
  id: string
  category: 'drawing' | 'component' | 'welder' | 'test_package' | 'field_weld' | 'area'
  label: string
  sublabel: string | null
  badge: string | null
  route: string
}
```

### Caching

- Fetch on first search bar focus (lazy)
- `staleTime: 5 minutes`
- Invalidate on entity create/import/delete

### Client-Side Filtering

- Case-insensitive substring match on `label` and `sublabel`
- Group by `category`, cap 5 per group
- Minimum 2 characters to trigger search

## Component Structure

```
src/
├── components/
│   └── search/
│       ├── GlobalSearch.tsx          # Replaces static input in Layout
│       └── SearchResultsDropdown.tsx # Grouped dropdown panel
├── hooks/
│   ├── useSearchIndex.ts            # Fetches + caches search index
│   └── useGlobalSearch.ts           # Filters index, returns grouped results
```

### Layout.tsx Changes

Replace the static search `<div>` (lines 158-178) with `<GlobalSearch />`. No other layout changes.

### GlobalSearch.tsx

- Same visual styling as the current static input
- Manages query state and dropdown open/close
- Renders SearchResultsDropdown when query >= 2 chars
- Click-outside dismissal

### SearchResultsDropdown.tsx

- Absolute-positioned below search bar, same width
- Grouped sections with category headers
- Each result: clickable row with label, sublabel, optional badge
- Max height with overflow scroll
- "No results" empty state

## Navigation Targets

- **Drawings** → `/drawings?expanded={drawing_id}`
- **Components** → `/components` (with search param or scroll)
- **Welders** → `/welders`
- **Test Packages** → `/packages/{package_id}/components`
- **Field Welds** → `/weld-log`
- **Areas** → `/components?area={area_id}`

## Non-Goals

- No keyboard shortcut (Cmd+K)
- No fuzzy matching
- No server-side per-keystroke search
- No mobile search (existing input is `hidden lg:flex`)

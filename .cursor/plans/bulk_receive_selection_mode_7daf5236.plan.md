---
name: Bulk_receive_selection_mode
overview: "Add a two-mode Components table interaction: default browse mode where rows open the detail modal, and an explicit selection mode (toggle in a persistent sticky bar) enabling full-row multi-select with shift-range selection and a bulk “Mark Received” milestone action."
todos: []
---

# Bulk Receive via Selection Mode

## Goals

- Default UX is **browse-first**: checkboxes hidden, **row click opens details modal**.
- Explicit **Selection Mode**: checkboxes shown, **row click selects**, supports **Shift+click range select**, and provides **Bulk Mark Received** (Receive milestone only).
- Remove the per-row **Actions** button/column (details are via row click in browse mode).

## Approach

### 1) Add a persistent selection/bulk bar

- Create a small component patterned after `DrawingBulkActions` that is **always visible** (even when 0 selected) and includes:
- **Selection Mode toggle** (OFF by default)
- When ON and `selectedCount > 0`: **Mark Received**, **Clear**, and a compact `N selected` label.
- Likely new file: [`src/components/ComponentsBulkActions.tsx`](src/components/ComponentsBulkActions.tsx)

### 2) Wire two interaction modes in `ComponentsPage`

- Update [`src/pages/ComponentsPage.tsx`](src/pages/ComponentsPage.tsx)
- Add `selectionMode: boolean` state (default `false`).
- When toggling `selectionMode` OFF: call existing `handleClearSelection()`.
- Always render `ComponentsBulkActions` and pass:
- `selectionMode`, `onToggleSelectionMode`
- `selectedCount`, `onClearSelection`
- `onMarkReceived`

### 3) Update the table to hide/show selection UI + remove Actions

- Update [`src/components/ComponentList.tsx`](src/components/ComponentList.tsx)
- Add prop: `selectionMode: boolean`.
- If `selectionMode=false`:
- **Hide** checkbox header column
- **Hide** any selection-related column widths
- Row click should **open details**.
- If `selectionMode=true`:
- Show checkbox header column
- Keep existing Select All / Clear behavior
- Remove Actions column from header.

- Update [`src/components/ComponentRow.tsx`](src/components/ComponentRow.tsx)
- Remove the Eye/actions button entirely.
- Add props:
- `selectionMode: boolean`
- `onOpenDetails: () => void`
- `rowIndex: number` (or pass via handler)
- `onRangeSelect?: (anchorIndex: number, targetIndex: number) => void`
- Click behavior:
- If `selectionMode=false`: `onOpenDetails()`.
- If `selectionMode=true`:
- Normal click: toggle selection
- **Shift+click**: select the inclusive range between last “anchor” row and clicked row.

### 4) Implement Shift+click range select (fast and predictable)

- Keep the anchor index in `ComponentList` (local state), because it has stable ordering via the `components` array.
- Add a new bulk selection callback to avoid N React state updates:
- `onSelectionChangeMany(componentIds: string[], isSelected: boolean)` in `ComponentList` props.
- Implement this in `ComponentsPage` as a single `setSelectedComponentIds(prev => new Set([...prev, ...ids]))` (or removal).

### 5) Bulk “Mark Received” implementation

- Add a new hook for bulk receive that:
- Filters out already-received rows (where `current_milestones['Receive'] `is `true | 1 | 100`).
- Updates the rest to **100**.

**Backend call strategy (Phase 1)**

- Use the existing `update_component_milestone` RPC in a throttled client loop (concurrency 5–10) to avoid 500 parallel requests.
- New hook: [`src/hooks/useBulkReceiveComponents.ts`](src/hooks/useBulkReceiveComponents.ts)
- Internally calls `supabase.rpc('update_component_milestone', { p_component_id, p_milestone_name: 'Receive', p_new_value: 100, p_user_id })`.
- Returns a summary `{ attempted, updated, skipped, failed }`.
- UI guardrail:
- If `selectedCount > 10`, show a confirmation dialog before applying.

## Files to change

- [`src/pages/ComponentsPage.tsx`](src/pages/ComponentsPage.tsx)
- [`src/components/ComponentList.tsx`](src/components/ComponentList.tsx)
- [`src/components/ComponentRow.tsx`](src/components/ComponentRow.tsx)

## Files to add

- [`src/components/ComponentsBulkActions.tsx`](src/components/ComponentsBulkActions.tsx)
- [`src/hooks/useBulkReceiveComponents.ts`](src/hooks/useBulkReceiveComponents.ts)

## Notes / constraints

- In Selection Mode, per your decision, **details modal is not accessible** from the table; user toggles Selection Mode OFF to open details.
- This plan focuses strictly on **Receive** milestone bulk update; no bulk rollback/unreceive.

## Implementation todos

- `ui-selection-bar`: Add persistent `ComponentsBulkActions` with selection toggle + conditional bulk actions.
- `wire-selection-mode`: Add `selectionMode` to `ComponentsPage` and pass through to list/row.
- `remove-actions-column`: Remove actions column/button and make row click open details in browse mode.
- `shift-range-select`: Implement Shift+click range selection using a single batched selection update.
- `bulk-receive-hook`: Implement `useBulkReceiveComponents` calling `update_component_milestone` RPC with throttling + summary.
- `bulk-receive-ui`: Add Mark Received button + >10 confirmation + success/failure toast summary.
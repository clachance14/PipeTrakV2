# Component Editing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable Admin/PM/QC users to reclassify, delete, edit, and manually add components extracted by the AI pipeline, in both the Drawing Table and Drawing Viewer.

**Architecture:** Extend the existing `ComponentMetadataModal` with a new "Edit" tab for privileged roles. Four new Supabase RPCs handle the mutations. A new `AddComponentModal` provides type-adaptive manual component creation. Bulk delete uses checkbox selection in the Drawing Table.

**Tech Stack:** React 18, TypeScript, Supabase RPCs (SECURITY DEFINER), TanStack Query mutations, Shadcn/Radix Tabs, react-hook-form + zod

**Spec:** `docs/superpowers/specs/2026-04-13-component-editing-design.md`

---

## File Structure

### New Files

| File | Responsibility |
|------|---------------|
| `supabase/migrations/<ts>_component_editing_rpcs.sql` | All 4 RPCs: reclassify, retire, update_identity, create_manual |
| `src/hooks/useReclassifyComponent.ts` | TanStack mutation for reclassify RPC |
| `src/hooks/useRetireComponents.ts` | TanStack mutation for retire RPC |
| `src/hooks/useUpdateComponentIdentity.ts` | TanStack mutation for update_identity RPC |
| `src/hooks/useCreateManualComponent.ts` | TanStack mutation for create_manual RPC |
| `src/hooks/useReclassifyComponent.test.ts` | Tests for reclassify hook |
| `src/hooks/useRetireComponents.test.ts` | Tests for retire hook |
| `src/hooks/useUpdateComponentIdentity.test.ts` | Tests for update_identity hook |
| `src/hooks/useCreateManualComponent.test.ts` | Tests for create_manual hook |
| `src/components/component-metadata/ComponentEditTab.tsx` | Edit tab content (classification, identity, attributes) |
| `src/components/component-metadata/ComponentEditTab.test.tsx` | Tests for edit tab |
| `src/components/component-metadata/AddComponentModal.tsx` | Type-adaptive add component modal |
| `src/components/component-metadata/AddComponentModal.test.tsx` | Tests for add modal |
| `src/components/component-metadata/DeleteConfirmationDialog.tsx` | Delete confirmation with reason |
| `src/components/component-metadata/DeleteConfirmationDialog.test.tsx` | Tests for delete dialog |
| `src/components/drawing-table/BulkDeleteBar.tsx` | Selection count + delete button |
| `src/components/drawing-table/BulkDeleteBar.test.tsx` | Tests for bulk delete bar |
| `src/lib/permissions/component-edit-permissions.ts` | `canEditComponents(role)` helper |

### Modified Files

| File | Change |
|------|--------|
| `src/components/ComponentDetailView.tsx` | Add Edit tab (privileged roles), keep Details (read-only roles) |
| `src/components/component-metadata/ComponentMetadataModal.tsx` | Pass `canEditComponents` prop |
| `src/components/drawing-table/ComponentRow.tsx` | Add checkbox column for privileged roles |
| `src/components/drawing-table/DrawingRow.tsx` | Add "+ Add Component" button, manage selection |
| `src/components/drawing-viewer/DrawingComponentSidebar.tsx` | Add "+ Add" button in header |
| `src/pages/DrawingComponentTablePage.tsx` | Manage bulk selection state, render BulkDeleteBar |
| `src/types/drawing-table.types.ts` | Add `COMPONENT_TYPE_LABELS` map |

---

## Task 1: Permission Helper

**Files:**
- Create: `src/lib/permissions/component-edit-permissions.ts`
- Modify: `src/hooks/usePermissions.ts`

- [ ] **Step 1: Create permission helper**

Create `src/lib/permissions/component-edit-permissions.ts`:

```typescript
import type { Role } from '@/types/team.types';

const COMPONENT_EDIT_ROLES: Role[] = ['owner', 'admin', 'project_manager', 'qc_inspector'];

export function canEditComponents(role: Role | null): boolean {
  if (!role) return false;
  return COMPONENT_EDIT_ROLES.includes(role);
}
```

- [ ] **Step 2: Add `canEditComponents` to usePermissions hook**

In `src/hooks/usePermissions.ts`, add to the interface and return:

```typescript
// Add to UsePermissionsReturn interface:
canEditComponents: boolean;

// Add to the no-role early return:
canEditComponents: false,

// Add to the return object:
canEditComponents: canEditComponentsFn(userRole),
```

Import `canEditComponents as canEditComponentsFn` from `@/lib/permissions/component-edit-permissions`.

- [ ] **Step 3: Verify types compile**

Run: `npx tsc -b --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/lib/permissions/component-edit-permissions.ts src/hooks/usePermissions.ts
git commit -m "feat: add canEditComponents permission helper for component editing"
```

---

## Task 2: Component Type Labels

**Files:**
- Modify: `src/types/drawing-table.types.ts`

- [ ] **Step 1: Add COMPONENT_TYPE_LABELS constant**

In `src/types/drawing-table.types.ts`, add after the `ComponentType` type:

```typescript
export const COMPONENT_TYPE_LABELS: Record<ComponentType, string> = {
  spool: 'Spool',
  field_weld: 'Field Weld',
  support: 'Support',
  valve: 'Valve',
  fitting: 'Fitting',
  flange: 'Flange',
  instrument: 'Instrument',
  tubing: 'Tubing',
  hose: 'Hose',
  misc_component: 'Misc Component',
  threaded_pipe: 'Threaded Pipe',
  pipe: 'Pipe',
};

export const AGGREGATE_TYPES: ComponentType[] = ['pipe', 'threaded_pipe'];
export const UNIQUE_ID_TYPES: ComponentType[] = ['spool', 'field_weld'];
```

- [ ] **Step 2: Verify types compile**

Run: `npx tsc -b --noEmit`

- [ ] **Step 3: Commit**

```bash
git add src/types/drawing-table.types.ts
git commit -m "feat: add component type labels and category constants"
```

---

## Task 3: Database Migration — All 4 RPCs

**Files:**
- Create: `supabase/migrations/<timestamp>_component_editing_rpcs.sql`

**Important:** Read `supabase/CLAUDE.md` for migration creation rules. Generate timestamp with `date -u +%Y%m%d%H%M%S`. Create the file manually — do not use `supabase migration new`.

- [ ] **Step 1: Check existing schema**

Read the `components` table schema from `src/types/database.types.ts` to confirm column names: `component_type`, `identity_key`, `attributes`, `current_milestones`, `percent_complete`, `is_retired`, `progress_template_id`, `version`, `last_updated_at`, `last_updated_by`, `drawing_id`, `project_id`, `area_id`, `system_id`, `test_package_id`.

Also read `get_component_template()` RPC signature and the `progress_templates` table to understand template lookup.

- [ ] **Step 2: Create migration file**

Create migration with all 4 RPCs. Each RPC:
- Uses SECURITY DEFINER
- Checks user role via `get_user_role_in_project()` (check existing RPCs for the exact function name used for role checks)
- Bumps `version`, `last_updated_at`, `last_updated_by`
- Returns JSONB

```sql
-- RPC 1: reclassify_component
-- Guards: role check, percent_complete = 0 for all siblings, dedup check
-- Finds siblings by matching drawing_id + identity_key commodity_code + size (ignoring seq)
-- Updates component_type, progress_template_id, resets current_milestones

-- RPC 2: retire_components
-- Guards: role check
-- Sets is_retired = true on all provided component IDs
-- Stores p_reason in a new column or as metadata (check if retire_reason column exists)

-- RPC 3: update_component_identity
-- Guards: role check
-- Finds siblings, merges JSONB changes, relies on unique index for dedup

-- RPC 4: create_manual_component
-- Guards: role check
-- Builds identity_key per type rules
-- Handles qty explosion for exploded types
-- Looks up template via get_component_template()
-- Inherits metadata from drawing
```

**Before writing SQL:** Check how existing RPCs (like `retire_field_weld`, `assign_drawing_with_inheritance`) do role checks. Look for `get_user_role_in_project()` or similar helper. Match that pattern exactly.

**Before writing SQL:** Check how `get_component_template()` is called — it needs `p_component_type` and `p_project_id` and returns milestones_config.

- [ ] **Step 3: Push migration**

Run: `./db-push.sh`
Expected: Migration applies successfully

- [ ] **Step 4: Regenerate types**

Run: `supabase gen types typescript --linked > src/types/database.types.ts`

- [ ] **Step 5: Verify types compile**

Run: `npx tsc -b --noEmit`

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/*_component_editing_rpcs.sql src/types/database.types.ts
git commit -m "feat: add RPCs for component reclassify, retire, update identity, and manual create"
```

---

## Task 4: Mutation Hook — useRetireComponents

**Files:**
- Create: `src/hooks/useRetireComponents.ts`
- Create: `src/hooks/useRetireComponents.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/hooks/useRetireComponents.test.ts`. Follow the pattern from existing hook tests. Test:
- Calls `supabase.rpc('retire_components', ...)` with correct params
- Invalidates correct query keys on success
- Shows toast on success and error

```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
// ... mock setup following existing patterns
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/hooks/useRetireComponents.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write the hook**

Create `src/hooks/useRetireComponents.ts` following the `useRetireFieldWeld` pattern:

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface RetireComponentsPayload {
  component_ids: string[];
  user_id: string;
  reason?: string;
}

export function useRetireComponents() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: RetireComponentsPayload) => {
      const { data, error } = await supabase.rpc('retire_components', {
        p_component_ids: payload.component_ids,
        p_user_id: payload.user_id,
        p_reason: payload.reason ?? null,
      });
      if (error) throw new Error(error.message);
      return data;
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete component(s): ${error.message}`);
    },
    onSuccess: (_data, variables) => {
      const count = variables.component_ids.length;
      queryClient.invalidateQueries({ queryKey: ['components'] });
      queryClient.invalidateQueries({ queryKey: ['drawing-progress'] });
      queryClient.invalidateQueries({ queryKey: ['drawings-with-progress'] });
      queryClient.invalidateQueries({ queryKey: ['package-readiness'] });
      queryClient.invalidateQueries({ queryKey: ['manhour-progress'] });
      toast.success(`${count} component(s) deleted`);
    },
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/hooks/useRetireComponents.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useRetireComponents.ts src/hooks/useRetireComponents.test.ts
git commit -m "feat: add useRetireComponents mutation hook"
```

---

## Task 5: Mutation Hook — useReclassifyComponent

**Files:**
- Create: `src/hooks/useReclassifyComponent.ts`
- Create: `src/hooks/useReclassifyComponent.test.ts`

- [ ] **Step 1: Write the failing test**

Test that it calls `supabase.rpc('reclassify_component', { p_component_id, p_new_type, p_user_id })`, invalidates queries, and shows toast.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/hooks/useReclassifyComponent.test.ts`

- [ ] **Step 3: Write the hook**

Same pattern as Task 4. Payload: `{ component_id: string; new_type: ComponentType; user_id: string }`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/hooks/useReclassifyComponent.test.ts`

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useReclassifyComponent.ts src/hooks/useReclassifyComponent.test.ts
git commit -m "feat: add useReclassifyComponent mutation hook"
```

---

## Task 6: Mutation Hook — useUpdateComponentIdentity

**Files:**
- Create: `src/hooks/useUpdateComponentIdentity.ts`
- Create: `src/hooks/useUpdateComponentIdentity.test.ts`

- [ ] **Step 1: Write the failing test**

Test that it calls `supabase.rpc('update_component_identity', { p_component_id, p_identity_changes, p_attribute_changes, p_user_id })`, invalidates queries, and shows toast.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/hooks/useUpdateComponentIdentity.test.ts`

- [ ] **Step 3: Write the hook**

Payload: `{ component_id: string; identity_changes: Record<string, unknown>; attribute_changes: Record<string, unknown>; user_id: string }`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/hooks/useUpdateComponentIdentity.test.ts`

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useUpdateComponentIdentity.ts src/hooks/useUpdateComponentIdentity.test.ts
git commit -m "feat: add useUpdateComponentIdentity mutation hook"
```

---

## Task 7: Mutation Hook — useCreateManualComponent

**Files:**
- Create: `src/hooks/useCreateManualComponent.ts`
- Create: `src/hooks/useCreateManualComponent.test.ts`

- [ ] **Step 1: Write the failing test**

Test that it calls `supabase.rpc('create_manual_component', { p_drawing_id, p_project_id, p_component_type, p_identity, p_attributes, p_user_id })`, invalidates queries, and shows toast.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/hooks/useCreateManualComponent.test.ts`

- [ ] **Step 3: Write the hook**

Payload: `{ drawing_id: string; project_id: string; component_type: ComponentType; identity: Record<string, unknown>; attributes: Record<string, unknown>; user_id: string }`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/hooks/useCreateManualComponent.test.ts`

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useCreateManualComponent.ts src/hooks/useCreateManualComponent.test.ts
git commit -m "feat: add useCreateManualComponent mutation hook"
```

---

## Task 8: DeleteConfirmationDialog Component

**Files:**
- Create: `src/components/component-metadata/DeleteConfirmationDialog.tsx`
- Create: `src/components/component-metadata/DeleteConfirmationDialog.test.tsx`

- [ ] **Step 1: Write the failing test**

Test rendering, confirmation, cancel, and reason field. Use the existing `AlertDialog` pattern from shadcn.

Tests:
- Renders component names/types in the dialog
- Shows count ("Delete 3 component(s)?")
- Cancel button calls onCancel
- Confirm button calls onConfirm with optional reason
- Reason field is optional (can submit without it)

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/component-metadata/DeleteConfirmationDialog.test.tsx`

- [ ] **Step 3: Write the component**

Use shadcn `AlertDialog` (already installed — check `src/components/ui/alert-dialog.tsx`). Props:

```typescript
interface DeleteConfirmationDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason?: string) => void;
  componentCount: number;
  componentSummary: string; // e.g., "3 Valve, 2 Fitting"
}
```

Include an optional text input for reason with placeholder suggestions: "AI misextraction", "duplicate", "not needed".

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/component-metadata/DeleteConfirmationDialog.test.tsx`

- [ ] **Step 5: Commit**

```bash
git add src/components/component-metadata/DeleteConfirmationDialog.tsx src/components/component-metadata/DeleteConfirmationDialog.test.tsx
git commit -m "feat: add DeleteConfirmationDialog component"
```

---

## Task 9: ComponentEditTab Component

**Files:**
- Create: `src/components/component-metadata/ComponentEditTab.tsx`
- Create: `src/components/component-metadata/ComponentEditTab.test.tsx`

This is the largest UI component — the Edit tab with classification, identity, attributes sections, AND the existing metadata assignment fields (Area, System, Test Package). The Edit tab subsumes the old "Details" tab — it shows everything Details showed, plus the new editing controls.

- [ ] **Step 1: Write the failing tests**

Tests:
- Renders classification dropdown with current component_type selected
- Renders identity fields (commodity_code, size from identity_key)
- Renders attribute fields (description, item_number from attributes)
- Renders metadata fields (Area, System, Test Package) — reuse `MetadataFormFields` component
- Classification section is disabled when `percent_complete > 0` (shows "Locked" badge)
- Classification section is enabled when `percent_complete === 0` (shows "Editable" badge)
- Shows sibling count when siblings > 1 ("Editing 3 components")
- Type-adaptive: shows quantity for exploded types, linear feet for aggregate types
- Save button calls onSave with changed values
- Delete button opens DeleteConfirmationDialog
- Cancel button calls onCancel

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/components/component-metadata/ComponentEditTab.test.tsx`

- [ ] **Step 3: Write the component**

Props:

```typescript
interface ComponentEditTabProps {
  component: ComponentRow;
  siblingCount: number;
  hasProgress: boolean; // any sibling has percent_complete > 0
  onSave: (changes: ComponentEditChanges) => void;
  onDelete: () => void;
  onCancel: () => void;
  isSaving: boolean;
}

interface ComponentEditChanges {
  newType?: ComponentType; // only if reclassified
  identityChanges: Record<string, unknown>;
  attributeChanges: Record<string, unknown>;
}
```

Use `react-hook-form` + `zod` for form validation. Use shadcn `Select` for the component type dropdown. Use shadcn `Input` for text fields.

Key UI details:
- Classification section: `Select` with `COMPONENT_TYPE_LABELS`, disabled when `hasProgress`
- Identity section: `Input` fields populated from `component.identity_key`
- Attributes section: adapts based on component_type (show quantity for exploded types, linear feet for pipe/threaded_pipe)
- Metadata section: reuse existing `MetadataFormFields` component for Area/System/Test Package (same as old Details tab)
- Footer: red "Delete Component" button (left), Cancel + "Save Changes" (right)

**Important:** The Edit tab replaces the old "Details" tab entirely. It contains everything Details had (metadata fields via `MetadataFormFields`) plus the new classification/identity/attribute editing. The existing `canEditMetadata` prop on `ComponentDetailView` is no longer needed — it's subsumed by `canEditComponents`. For read-only roles, the "Details" tab continues to exist unchanged (showing metadata as read-only text).

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/components/component-metadata/ComponentEditTab.test.tsx`

- [ ] **Step 5: Commit**

```bash
git add src/components/component-metadata/ComponentEditTab.tsx src/components/component-metadata/ComponentEditTab.test.tsx
git commit -m "feat: add ComponentEditTab with classification, identity, and attribute editing"
```

---

## Task 10: Integrate Edit Tab into ComponentDetailView

**Files:**
- Modify: `src/components/ComponentDetailView.tsx`
- Modify: `src/components/component-metadata/ComponentMetadataModal.tsx`

- [ ] **Step 1: Read current ComponentDetailView.tsx**

Read the full file to understand tab structure, state management, and existing props.

- [ ] **Step 2: Write tests for the new behavior**

Add tests to the existing test file (or create one if none exists):
- When `canEditComponents=true`: shows "Edit" tab instead of "Details"
- When `canEditComponents=false`: shows "Details" tab (read-only, unchanged)
- Edit tab renders ComponentEditTab with correct props
- Save in Edit tab calls reclassify/update_identity hooks as appropriate
- Delete in Edit tab calls retire hook via DeleteConfirmationDialog

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx vitest run src/components/ComponentDetailView.test.tsx`

- [ ] **Step 4: Modify ComponentDetailView**

Key changes:
1. Accept `canEditComponents` prop (replaces the existing `canEditMetadata` prop — remove `canEditMetadata`)
2. Compute `siblingCount` and `hasProgress` from component data — query siblings by matching `drawing_id` + `commodity_code` + `size` from identity_key (use existing `useComponentsByDrawing` or add a filter)
3. Tab logic:
   - `canEditComponents=true` → tabs are: Overview, **Edit**, Milestones, History (4 tabs, grid-cols-4)
   - `canEditComponents=false` → tabs are: Overview, **Details** (existing read-only), Milestones, History (4 tabs, grid-cols-4)
   - The Edit tab renders `<ComponentEditTab>` which includes classification, identity, attributes, AND metadata fields
   - The Details tab remains as-is (read-only metadata display) for read-only roles
4. Wire up `useReclassifyComponent`, `useUpdateComponentIdentity`, `useRetireComponents` hooks
5. Handle save: if type changed → call reclassify first, then update_identity for other changes. Metadata changes (area/system/test_package) use existing `useAssignComponents` hook.
6. Handle delete: open DeleteConfirmationDialog → on confirm, call retire
7. Remove the old `canEditMetadata` prop and its usages — `ComponentMetadataModal` no longer needs it

- [ ] **Step 5: Modify ComponentMetadataModal**

Pass `canEditComponents` from `usePermissions()` hook down to `ComponentDetailView`:

```typescript
const { canEditComponents } = usePermissions();
// Pass to ComponentDetailView:
<ComponentDetailView canEditComponents={canEditComponents} ... />
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx vitest run src/components/ComponentDetailView.test.tsx`

- [ ] **Step 7: Type check**

Run: `npx tsc -b --noEmit`

- [ ] **Step 8: Commit**

```bash
git add src/components/ComponentDetailView.tsx src/components/component-metadata/ComponentMetadataModal.tsx
git commit -m "feat: integrate Edit tab into ComponentDetailView for privileged roles"
```

---

## Task 11: AddComponentModal

**Files:**
- Create: `src/components/component-metadata/AddComponentModal.tsx`
- Create: `src/components/component-metadata/AddComponentModal.test.tsx`

- [ ] **Step 1: Write the failing tests**

Tests:
- Renders component type dropdown with all types
- On type selection, shows type-specific form fields:
  - Valve/Fitting/etc: commodity_code, size, quantity (required)
  - Pipe/Threaded Pipe: commodity_code, size, total_linear_feet (required)
  - Spool: spool_id (required)
  - Field Weld: weld_number (required)
- Description field shown for all types (optional)
- Submit button disabled until required fields filled
- Submit calls onSubmit with correct payload
- Cancel button calls onClose

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/components/component-metadata/AddComponentModal.test.tsx`

- [ ] **Step 3: Write the component**

```typescript
interface AddComponentModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CreateManualComponentData) => void;
  isSubmitting: boolean;
}

interface CreateManualComponentData {
  component_type: ComponentType;
  commodity_code?: string;
  size?: string;
  quantity?: number;
  total_linear_feet?: number;
  spool_id?: string;
  weld_number?: string;
  description?: string;
}
```

Use shadcn `Dialog`, `Select` for type dropdown, `Input` for fields. Use `react-hook-form` + `zod` with a dynamic schema that changes based on selected type.

Use `COMPONENT_TYPE_LABELS` for the dropdown options. Use `AGGREGATE_TYPES` and `UNIQUE_ID_TYPES` to determine which fields to show.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/components/component-metadata/AddComponentModal.test.tsx`

- [ ] **Step 5: Commit**

```bash
git add src/components/component-metadata/AddComponentModal.tsx src/components/component-metadata/AddComponentModal.test.tsx
git commit -m "feat: add AddComponentModal with type-adaptive form"
```

---

## Task 12: BulkDeleteBar Component

**Files:**
- Create: `src/components/drawing-table/BulkDeleteBar.tsx`
- Create: `src/components/drawing-table/BulkDeleteBar.test.tsx`

- [ ] **Step 1: Write the failing tests**

Tests:
- Renders selection count ("2 selected")
- "Delete Selected" button calls onDelete
- Not rendered when count is 0

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/components/drawing-table/BulkDeleteBar.test.tsx`

- [ ] **Step 3: Write the component**

```typescript
interface BulkDeleteBarProps {
  selectedCount: number;
  onDelete: () => void;
}
```

Simple component: shows `{selectedCount} selected` + destructive "Delete Selected" button. Uses tailwind for red/destructive styling consistent with existing patterns.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/components/drawing-table/BulkDeleteBar.test.tsx`

- [ ] **Step 5: Commit**

```bash
git add src/components/drawing-table/BulkDeleteBar.tsx src/components/drawing-table/BulkDeleteBar.test.tsx
git commit -m "feat: add BulkDeleteBar for multi-select component deletion"
```

---

## Task 13: Add Checkbox to ComponentRow

**Files:**
- Modify: `src/components/drawing-table/ComponentRow.tsx`
- Modify: `src/components/drawing-table/ComponentRow.test.tsx` (if exists, or create)

- [ ] **Step 1: Read current ComponentRow.tsx**

Understand the existing layout, props, and click handling.

- [ ] **Step 2: Write/add tests**

Tests:
- When `canEditComponents=true`: renders checkbox
- When `canEditComponents=false`: no checkbox
- Checkbox click toggles selection without opening modal
- Row click (not on checkbox) still opens modal

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx vitest run src/components/drawing-table/ComponentRow.test.tsx`

- [ ] **Step 4: Add checkbox to ComponentRow**

New props:
```typescript
canEditComponents?: boolean;
isSelected?: boolean;
onSelectionChange?: (componentId: string, selected: boolean) => void;
```

Add checkbox as first element in the row (before the spacer). Use shadcn `Checkbox` component. Checkbox click handler calls `onSelectionChange` and stops event propagation (so it doesn't trigger the row click → modal open).

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/components/drawing-table/ComponentRow.test.tsx`

- [ ] **Step 6: Commit**

```bash
git add src/components/drawing-table/ComponentRow.tsx src/components/drawing-table/ComponentRow.test.tsx
git commit -m "feat: add selection checkbox to ComponentRow for bulk delete"
```

---

## Task 14: Add "+ Add Component" to DrawingRow & Viewer Sidebar

**Files:**
- Modify: `src/components/drawing-table/DrawingRow.tsx`
- Modify: `src/components/drawing-viewer/DrawingComponentSidebar.tsx`
- Modify: existing test files for both components (if they exist)

- [ ] **Step 1: Read both files and their tests**

Understand where the button fits in each layout. Check for existing test files.

- [ ] **Step 2: Add "+ Add Component" button to DrawingRow**

At the bottom of the expanded component list (after the last ComponentRow), add a button:
```tsx
{canEditComponents && (
  <button
    onClick={() => onAddComponent?.(drawing.id)}
    className="ml-6 mt-1 text-sm text-indigo-400 border border-dashed border-indigo-400/30 rounded-md px-3 py-1.5 hover:bg-indigo-400/10"
  >
    + Add Component
  </button>
)}
```

New props: `canEditComponents: boolean`, `onAddComponent?: (drawingId: string) => void`.

- [ ] **Step 3: Add "+ Add" button to DrawingComponentSidebar header**

In the header area (next to "Field Components" title), add:
```tsx
{canEditComponents && (
  <Button variant="outline" size="sm" onClick={onAddComponent}>
    + Add
  </Button>
)}
```

New props: `canEditComponents: boolean`, `onAddComponent?: () => void`.

- [ ] **Step 4: Update tests for both components**

If test files exist, add tests:
- DrawingRow: "+ Add Component" button renders when `canEditComponents=true`, hidden when false, calls `onAddComponent` on click
- DrawingComponentSidebar: "+ Add" button renders when `canEditComponents=true`, hidden when false, calls `onAddComponent` on click

- [ ] **Step 5: Run tests**

Run: `npx vitest run src/components/drawing-table/DrawingRow.test.tsx src/components/drawing-viewer/DrawingComponentSidebar.test.tsx`

- [ ] **Step 6: Type check**

Run: `npx tsc -b --noEmit`

- [ ] **Step 7: Commit**

```bash
git add src/components/drawing-table/DrawingRow.tsx src/components/drawing-viewer/DrawingComponentSidebar.tsx
git commit -m "feat: add component creation buttons to Drawing Table and Viewer Sidebar"
```

---

## Task 15: Wire Up Drawing Table Page (Bulk Selection + Add Modal)

**Files:**
- Modify: `src/pages/DrawingComponentTablePage.tsx`

- [ ] **Step 1: Read current DrawingComponentTablePage.tsx**

Understand existing state management, how it passes props to DrawingTable/DrawingRow/ComponentRow.

- [ ] **Step 2: Add bulk selection state**

```typescript
const [selectedComponentIds, setSelectedComponentIds] = useState<Set<string>>(new Set());
const [addModalDrawingId, setAddModalDrawingId] = useState<string | null>(null);
const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
```

- [ ] **Step 3: Wire up components**

- Pass `canEditComponents`, `isSelected`, `onSelectionChange` through to ComponentRow
- Pass `canEditComponents`, `onAddComponent` to DrawingRow
- Render `BulkDeleteBar` when `selectedComponentIds.size > 0`
- Render `AddComponentModal` when `addModalDrawingId` is set
- Render `DeleteConfirmationDialog` when `deleteDialogOpen` is true
- Wire `useRetireComponents` and `useCreateManualComponent` hooks to modal/dialog callbacks
- Clear selection after successful delete

- [ ] **Step 4: Type check**

Run: `npx tsc -b --noEmit`

- [ ] **Step 5: Manual test in browser**

Run dev server (`npm run dev`), navigate to a project's drawing table:
1. Verify checkboxes appear on component rows (as Admin/PM/QC)
2. Select 2+ components → bulk delete bar appears
3. Click "+ Add Component" → AddComponentModal opens
4. Click a component row → modal opens with Edit tab

- [ ] **Step 6: Commit**

```bash
git add src/pages/DrawingComponentTablePage.tsx
git commit -m "feat: wire up bulk selection and add component in Drawing Table page"
```

---

## Task 16: Wire Up Drawing Viewer Page

**Files:**
- Modify: `src/pages/DrawingViewerPage.tsx`

- [ ] **Step 1: Read current DrawingViewerPage.tsx**

Understand how it renders `DrawingComponentSidebar` and `ComponentMetadataModal`.

- [ ] **Step 2: Add add-component state**

```typescript
const [addModalOpen, setAddModalOpen] = useState(false);
```

- [ ] **Step 3: Wire up sidebar and modals**

- Pass `canEditComponents` and `onAddComponent` to `DrawingComponentSidebar`
- Render `AddComponentModal` with `drawingId` from route params
- Wire `useCreateManualComponent` hook to modal submit
- The `ComponentMetadataModal` already gets `canEditComponents` via the modal → ComponentDetailView flow from Task 10

- [ ] **Step 4: Type check**

Run: `npx tsc -b --noEmit`

- [ ] **Step 5: Manual test in browser**

Navigate to a drawing viewer:
1. Verify "+ Add" button in sidebar header (as Admin/PM/QC)
2. Click "+ Add" → AddComponentModal opens
3. Create a component → appears in sidebar
4. Click a component → modal opens with Edit tab
5. Test reclassify (on 0% progress component)
6. Test delete (confirmation dialog)

- [ ] **Step 6: Commit**

```bash
git add src/pages/DrawingViewerPage.tsx
git commit -m "feat: wire up add component and edit modal in Drawing Viewer"
```

---

## Task 17: Full Test Suite & Cleanup

**Files:**
- All test files
- Any remaining type errors

- [ ] **Step 1: Run full test suite**

Run: `npx vitest run`
Expected: All tests pass

- [ ] **Step 2: Fix any failures**

Address test failures, fix mocks, update snapshots.

- [ ] **Step 3: Type check**

Run: `npx tsc -b --noEmit`

- [ ] **Step 4: Lint**

Run: `npm run lint`

- [ ] **Step 5: Build**

Run: `npm run build`
Expected: Production build succeeds

- [ ] **Step 6: Final commit**

```bash
git commit -m "chore: fix test suite and type errors for component editing feature"
```

---

## Task 18: End-to-End Verification

- [ ] **Step 1: Start dev server and test all flows**

Run: `npm run dev`

Test as Admin/PM role:
1. **Drawing Table** — reclassify a 0% component → type changes, milestones reset
2. **Drawing Table** — try to reclassify a component with progress → locked
3. **Drawing Table** — edit identity (commodity code) → all siblings update
4. **Drawing Table** — delete a component → confirmation → retired
5. **Drawing Table** — bulk select + delete → multiple retired
6. **Drawing Table** — add component (valve, qty 3) → 3 records created
7. **Drawing Table** — add component (pipe) → 1 aggregate created
8. **Drawing Viewer** — same edit/delete flows via sidebar modal
9. **Drawing Viewer** — add component via sidebar header button

Test as Field User:
10. **Drawing Table** — no checkboxes, no add button
11. **Drawing Viewer** — no add button, modal shows Details tab (read-only)

- [ ] **Step 2: Verify query invalidation**

After each mutation, verify progress numbers update in:
- Drawing Table progress column
- Drawing Viewer sidebar progress summary
- Package readiness (if applicable)

- [ ] **Step 3: Final commit if any fixes needed**

```bash
git commit -m "fix: address issues found during e2e verification"
```

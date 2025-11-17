# Unplanned Weld Creation Feature Design

**Date:** 2025-11-17
**Status:** Design Complete - Ready for Implementation
**Author:** Design Session with User

## Purpose

Enable users to add individual welds to the weld log when unplanned welds occur in the field. Unplanned welds arise from field changes, construction walkdowns, client modifications, and other scenarios where drawings did not anticipate a weld.

Currently, users can only create welds via CSV import (bulk) or repair weld creation (after NDE failure). This feature fills the gap for single weld creation.

## Requirements Summary

**Must Have:**
- Add "Add Weld" button to Weld Log page
- Auto-generate weld number on button click
- Require drawing selection (smart search)
- Require weld type, size, and spec
- Inherit metadata (area, system, test_package) from selected drawing
- Optional notes field for creation context
- Atomic transaction for component + field_weld creation
- Permission enforcement (Owner, Admin, PM, Foreman, QC only)

**Must NOT Have:**
- NDE required field (QC determines this later)
- Editable weld numbers (reserved for future feature)

## Architecture

### Approach: SECURITY DEFINER RPC

Use a database RPC function with SECURITY DEFINER to create both component and field_weld records atomically. This approach provides:
- Transaction safety (both records created or neither)
- Explicit permission checks
- Robust error handling
- Single source of truth for creation logic

**Alternatives Considered:**
- Client-side creation with RLS: Risk of race conditions on weld number generation
- Edge Function: Overkill for single weld creation, slower than RPC

## Database Layer

### Schema Changes

**Add `notes` column to `field_welds` table:**
```sql
ALTER TABLE field_welds ADD COLUMN notes TEXT;
```

This field stores creation context (why the weld was added), separate from `nde_notes` which stores QC test notes.

### RPC Function: `create_unplanned_weld()`

**Signature:**
```sql
CREATE OR REPLACE FUNCTION create_unplanned_weld(
  p_project_id UUID,
  p_drawing_id UUID,
  p_weld_number TEXT,
  p_weld_type TEXT,
  p_weld_size TEXT,
  p_spec TEXT,
  p_schedule TEXT DEFAULT NULL,
  p_base_metal TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
) RETURNS json
SECURITY DEFINER;
```

**Logic:**
1. Validate user has permission (Owner, Admin, PM, Foreman, QC)
2. Verify drawing exists and user has access via RLS
3. Check weld_number uniqueness within project
4. Fetch drawing's `area_id`, `system_id`, `test_package_id` for metadata inheritance
5. Get `progress_template_id` for field_weld component type
6. BEGIN transaction:
   - INSERT component with `component_type = 'field_weld'`, `identity_key = {"weld_number": p_weld_number}`, inherited metadata
   - INSERT field_weld with component_id reference, specifications, and notes
7. COMMIT transaction
8. Return created weld with component details as JSON

**Error Handling:**
- Duplicate weld_number → Return error with clear message
- Permission denied → Return 403-style error
- Drawing not found → Return 404-style error
- Constraint violation → Rollback transaction, return error

**Weld Number Generation:**
Query maximum weld number in project, increment, and use locking or retry logic to handle race conditions. If user cancels dialog, abandon the generated number (no reservation).

## React Layer

### Hook: `useCreateUnplannedWeld`

**Location:** `src/hooks/useCreateUnplannedWeld.ts`

**Pattern:** Follow `useCreateRepairWeld.ts` structure

**Responsibilities:**
- Call `create_unplanned_weld()` RPC via Supabase client
- Return TanStack Query mutation object (`mutate`, `mutateAsync`, `isLoading`, `error`)
- Invalidate queries on success:
  - `field-welds` (refresh weld log table)
  - `field-weld-{id}` (if detail view exists)
  - `drawing-{drawingId}-progress` (if exists)

**Type Safety:**
- Use generated database types from `src/types/database.types.ts`
- Input type matches RPC parameters
- Output type includes full weld + component data

## UI Layer

### Component: `CreateUnplannedWeldDialog`

**Location:** `src/components/field-welds/CreateUnplannedWeldDialog.tsx`

**Pattern:** Follow Shadcn/Radix dialog patterns

**Flow:**
1. User clicks "Add Weld" button
2. System generates next weld number for project
3. Dialog opens with form pre-filled with weld number
4. User completes form
5. User submits
6. Success → Toast notification, dialog closes, table refreshes

**Form Fields:**

| Field | Type | Required | Behavior |
|-------|------|----------|----------|
| Weld Number | Text (read-only) | Yes | Pre-filled, locked (not editable) |
| Drawing | Searchable select | Yes | Smart search by drawing number/title |
| Weld Type | Dropdown | Yes | BW, SW, FW, TW with full labels |
| Size | Text input | Yes | Free text entry |
| Spec | Dropdown/combobox | Yes | Validate against existing project specs |
| Schedule | Text input | No | Optional specification |
| Base Metal | Text input | No | Optional specification |
| Notes | Textarea | No | Context for why weld was created (3-4 rows) |

**Validation:**
- Disable submit until all required fields have values
- Spec dropdown shows only valid specs from database
- Drawing search filters to current project

**States:**
- Loading: Show spinner on submit button
- Error: Display inline error message
- Success: Close dialog, show toast, refresh table

**Mobile Optimization:**
- Full-width inputs
- Touch targets ≥44px (WCAG 2.1 AA)
- Scrollable form if needed

**Cancel Behavior:**
- User can cancel at any time
- Generated weld number is abandoned (not reserved)

### Integration: WeldLogPage

**Location:** `src/pages/WeldLogPage.tsx`

**Changes:**
- Add "Add Weld" button to page header (top right)
- Show button only to users with permission (use new `canCreateFieldWeld()` utility)
- Render `<CreateUnplannedWeldDialog />` component
- Pass `projectId` and success callback to dialog
- Success callback shows toast and invalidates queries

## Data Flow

### Happy Path

1. User clicks "Add Weld"
2. Frontend generates weld number (or calls RPC to generate)
3. Dialog opens with weld number pre-filled
4. User selects drawing → Form auto-populates metadata preview
5. User selects weld type, enters size, selects spec
6. User optionally enters schedule, base_metal, notes
7. User submits
8. Hook calls `create_unplanned_weld()` RPC
9. RPC validates, creates records in transaction, returns success
10. Hook invalidates queries
11. Dialog closes, toast shows "Weld W-051 created"
12. Table refreshes, new weld appears

### Error Scenarios

| Error | Cause | User Experience |
|-------|-------|-----------------|
| Permission denied | User role changed mid-session | Error toast, dialog closes, button hides |
| Drawing not found | Drawing deleted after form opened | Inline error: "Drawing no longer exists" |
| Invalid spec | Spec not in database | Prevented by dropdown (only valid specs shown) |
| Weld number conflict | Two users create weld simultaneously | RPC generates new number, retries automatically |
| Transaction failure | Database constraint violation | Generic error message, log details, allow retry |

## Permissions

**Role Access:**
- **Can create unplanned welds:** Owner, Admin, PM, Foreman, QC Inspector
- **Cannot create:** Viewer, Welder

**Implementation:**
- RPC checks user role at start of function
- UI button uses `canCreateFieldWeld()` utility to show/hide
- Follows same permission model as repair weld creation

**Permission Utility:**
Add to `src/lib/permissions.ts`:
```typescript
export function canCreateFieldWeld(role: string): boolean {
  return ['owner', 'admin', 'pm', 'foreman', 'qc'].includes(role);
}
```

## Testing Strategy

### TDD Workflow
1. Write failing test for RPC function
2. Implement RPC migration
3. Write failing test for hook
4. Implement hook
5. Write failing test for dialog component
6. Implement dialog
7. Refactor while tests pass

### Database Layer Tests

**Location:** `tests/integration/rls/create-unplanned-weld.test.ts`

**Test Cases:**
- ✓ Creates weld with all required fields
- ✓ Creates weld with optional fields
- ✓ Inherits metadata from drawing (area, system, test_package)
- ✓ Rejects user with Viewer role (permission denied)
- ✓ Rejects user with Welder role (permission denied)
- ✓ Allows Owner, Admin, PM, Foreman, QC to create
- ✓ Rejects duplicate weld_number within project
- ✓ Allows duplicate weld_number across different projects
- ✓ Rejects invalid drawing_id
- ✓ Rejects invalid spec (not in database)
- ✓ Rolls back transaction on error (no orphaned records)
- ✓ Returns created weld with component data

### React Hook Tests

**Location:** `src/hooks/useCreateUnplannedWeld.test.ts`

**Test Cases:**
- ✓ Calls RPC with correct parameters
- ✓ Returns loading state during mutation
- ✓ Returns error state on failure
- ✓ Invalidates field-welds query on success
- ✓ Type safety for input and output

### UI Component Tests

**Location:** `src/components/field-welds/CreateUnplannedWeldDialog.test.tsx`

**Test Cases:**
- ✓ Renders with pre-filled weld number
- ✓ Weld number field is read-only
- ✓ Requires drawing, weld type, size, spec
- ✓ Drawing search filters to project
- ✓ Spec dropdown shows only valid specs
- ✓ Disables submit until required fields filled
- ✓ Shows loading state during submission
- ✓ Displays error message on failure
- ✓ Calls success callback on success
- ✓ Closes dialog on success
- ✓ Closes dialog on cancel
- ✓ Touch targets ≥44px (mobile)

### Integration Tests

**Location:** `src/pages/WeldLogPage.test.tsx` (update existing)

**Test Cases:**
- ✓ Shows "Add Weld" button for Owner, Admin, PM, Foreman, QC
- ✓ Hides "Add Weld" button for Viewer, Welder
- ✓ Opens dialog on button click
- ✓ Refreshes table after successful creation
- ✓ New weld appears in table

### Coverage Targets
- Hooks: ≥80% (lib pattern)
- Components: ≥60%
- Overall: ≥70%
- RLS/RPC: 100% (all permission paths tested)

## Migration Strategy

### Migration File: `NNNN_create_unplanned_weld_rpc.sql`

**Order of Operations:**
1. Add `notes` column to `field_welds`
2. Create helper function for weld number generation (if needed)
3. Create `create_unplanned_weld()` RPC function with SECURITY DEFINER
4. Add comment documenting function purpose
5. Grant execute permission to authenticated users (RLS handles actual permissions)

**Migration Testing:**
1. Apply migration to staging
2. Run RLS tests to verify permissions
3. Verify transaction rollback behavior
4. Generate new TypeScript types: `supabase gen types typescript --linked`
5. Apply to production

## Open Questions & Future Enhancements

**Resolved:**
- ✓ Weld numbers: Auto-generate, not editable in this feature
- ✓ Drawing requirement: Required for all unplanned welds
- ✓ NDE field: Not part of creation flow (QC determines later)
- ✓ Permissions: Same as repair welds (Owner, Admin, PM, Foreman, QC)

**Future Enhancements (out of scope):**
- Edit weld numbers after creation
- Bulk unplanned weld creation
- Weld templates for common configurations
- Drawing-level weld number sequences (e.g., DWG-001-W-001)

## Success Criteria

Feature is complete when:
- [ ] All tests pass with ≥70% coverage
- [ ] Users can create unplanned welds from Weld Log page
- [ ] Weld numbers auto-generate correctly
- [ ] Drawing metadata inheritance works
- [ ] Permissions enforce correctly
- [ ] Mobile UI meets WCAG 2.1 AA (≥44px targets)
- [ ] Documentation updated in KNOWLEDGE-BASE.md
- [ ] Feature deployed to production without rollback

## References

- Existing pattern: `src/hooks/useCreateRepairWeld.ts`
- Existing pattern: `src/components/field-welds/CreateRepairWeldDialog.tsx`
- Permission utilities: `src/lib/permissions.ts`
- Field weld schema: `supabase/migrations/00033_create_field_welds.sql`
- Component schema: `supabase/migrations/00010_component_tracking.sql`
- Progress template: `supabase/migrations/00034_field_weld_progress_template.sql`

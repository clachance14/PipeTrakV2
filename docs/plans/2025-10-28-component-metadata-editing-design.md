# Component Metadata Editing from Drawings View

**Date:** 2025-10-28
**Status:** Design Approved
**Author:** Claude (via brainstorming session)

## Overview

Add the ability for users to click on component rows in the drawings table view and edit their metadata assignments (Area, System, Test Package) via a modal dialog. This enables users to reassign components to different organizational groupings when drawings span multiple areas or test packages.

## Business Context

In brownfield construction projects, drawings often contain components that belong to different test packages, areas, or systems. After importing material takeoff data via CSV, users need the ability to:

1. Click on individual components within a drawing
2. View current metadata assignments (Area, System, Test Package)
3. Edit these assignments to match the actual project organization
4. Create new metadata entries (Areas, Systems, Test Packages) if they don't exist

**Example Use Case:** Drawing DRAIN-1 is imported with 3 components all assigned to Test Package TP-11. However, upon review, some components should be in TP-12. Users need to click those components and reassign them.

## Requirements Summary

### Functional Requirements

**FR-1:** Admin and Manager users can click any component row in the drawings table
**FR-2:** Modal dialog opens showing ComponentDetailView with metadata edit form
**FR-3:** Metadata form displays current values for Area, System, and Test Package
**FR-4:** Users can select existing metadata from dropdown comboboxes
**FR-5:** Users can create new metadata entries via "Create new..." option in comboboxes
**FR-6:** Changes save immediately with optimistic UI updates
**FR-7:** Milestone history displays below metadata form (read-only)
**FR-8:** Non-admin users see view-only modal (no edit form)

### Non-Functional Requirements

**NFR-1:** Modal opens in <200ms
**NFR-2:** Metadata save completes in <1s with optimistic feedback
**NFR-3:** Mobile responsive (comboboxes work on touch devices)
**NFR-4:** Accessible (keyboard navigation, ARIA labels, screen reader support)
**NFR-5:** Test coverage ≥70% overall, ≥80% for business logic hooks

## Design Decisions

### Architectural Approach

**Decision:** Extend existing ComponentDetailView component
**Rationale:**
- Reuses proven component already used in ComponentsPage
- Maintains consistency across application
- Avoids code duplication for milestone history display
- Single source of truth for component detail rendering

**Alternatives Considered:**
1. Create new ComponentMetadataModal (rejected: code duplication)
2. Compose with shared subcomponents (rejected: over-engineering for initial version)

### UI Pattern

**Decision:** Modal dialog with centered overlay
**Rationale:**
- Consistent with existing ComponentDetailView pattern in ComponentsPage
- Full focus on editing task (no distractions)
- Works well across desktop and mobile devices

**Alternatives Considered:**
1. Slide-out drawer panel (rejected: adds complexity, not consistent with existing patterns)
2. Inline expansion below row (rejected: disrupts table flow, difficult on mobile)

### Metadata Creation UX

**Decision:** Combobox with "Create new..." option
**Rationale:**
- Keeps user in flow (no separate modal required)
- Clear distinction between selecting existing vs creating new
- Prevents accidental creation of duplicates

**Implementation:**
- Each combobox shows existing options sorted alphabetically
- "(None)" option to clear assignment
- "Create new..." option at bottom with "+" icon
- Selecting "Create new..." shows inline input field
- Type new name → validates uniqueness → Enter/checkmark creates entry

### Permission Model

**Decision:** Admin and Manager roles only can edit metadata
**Rationale:**
- Prevents accidental changes by field users
- Metadata assignments affect reporting and progress tracking
- Consistent with other administrative functions

**Implementation:**
- Check `user.role` via `useAuth()` hook
- Conditionally render edit form vs view-only display
- RLS policies enforce server-side validation

## Technical Architecture

### Component Structure

```
DrawingComponentTablePage (modified)
├── Dialog (state: selectedComponentId)
│   └── ComponentDetailView (modified)
│       ├── MetadataEditForm (new)
│       │   ├── AreaCombobox
│       │   ├── SystemCombobox
│       │   └── TestPackageCombobox
│       └── MilestoneEventHistory (existing, read-only)
└── DrawingTable (modified)
    └── ComponentRow (modified - add onClick)
```

### New Components

**MetadataEditForm** (`src/components/metadata/MetadataEditForm.tsx`)
- Props: `component`, `onSave`, `onCancel`
- State: area_id, system_id, test_package_id, validation errors
- Renders three comboboxes with create capability
- Handles form submission and validation

**Combobox** (`src/components/ui/combobox.tsx`)
- Shadcn/ui component (may need to add via CLI)
- Supports search/filter, keyboard navigation
- Custom "Create new..." option rendering

### Modified Components

**ComponentDetailView** (`src/components/ComponentDetailView.tsx`)
- Add `showMetadataEdit?: boolean` prop (default: false)
- Add `onMetadataUpdate?: (data) => void` callback prop
- Conditionally render MetadataEditForm at top if prop is true

**ComponentRow** (`src/components/ComponentRow.tsx`)
- Already has `onClick?: () => void` prop
- No changes needed to component itself

**DrawingTable** (`src/components/drawing-table/DrawingTable.tsx`)
- Pass `onClick` handler to ComponentRow (line ~170)
- Handler: `onClick={() => onComponentClick(component.id)}`

**DrawingComponentTablePage** (`src/pages/DrawingComponentTablePage.tsx`)
- Add Dialog state: `const [selectedComponentId, setSelectedComponentId] = useState<string | null>(null)`
- Add handler: `const handleComponentClick = (id: string) => setSelectedComponentId(id)`
- Pass handler to DrawingTable: `onComponentClick={handleComponentClick}`
- Render Dialog with ComponentDetailView when selectedComponentId is set

### Data Flow

```
1. User clicks ComponentRow
   ↓
2. onClick handler: setSelectedComponentId(component.id)
   ↓
3. Dialog opens with ComponentDetailView
   ↓
4. ComponentDetailView fetches: useComponent(selectedComponentId)
   ↓
5. MetadataEditForm shows current values in comboboxes
   ↓
6. User selects/creates new values and clicks Save
   ↓
7. useUpdateComponentMetadata mutation fires
   ↓
8. Optimistic update: table row updates immediately
   ↓
9. Server validation completes in background
   ↓
10. TanStack Query invalidates and refetches to confirm
```

### Database & API Layer

**No Schema Changes Required:**
- `components` table already has `area_id`, `system_id`, `test_package_id` (nullable)
- `areas`, `systems`, `test_packages` tables exist
- RLS policies protect component updates

**New Hooks:**

**useUpdateComponentMetadata** (`src/hooks/useComponents.ts`)
```typescript
export function useUpdateComponentMetadata() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      componentId,
      area_id,
      system_id,
      test_package_id
    }: UpdateComponentMetadataParams) => {
      const { data, error } = await supabase
        .from('components')
        .update({
          area_id,
          system_id,
          test_package_id,
          last_updated_at: new Date().toISOString()
        })
        .eq('id', componentId)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onMutate: async (variables) => {
      // Optimistic update logic
      await queryClient.cancelQueries(['component', variables.componentId])
      const previous = queryClient.getQueryData(['component', variables.componentId])
      queryClient.setQueryData(['component', variables.componentId], (old: any) => ({
        ...old,
        area_id: variables.area_id,
        system_id: variables.system_id,
        test_package_id: variables.test_package_id
      }))
      return { previous }
    },
    onError: (err, variables, context) => {
      // Revert optimistic update
      queryClient.setQueryData(['component', variables.componentId], context?.previous)
    },
    onSuccess: (data, variables) => {
      // Invalidate related queries
      queryClient.invalidateQueries(['component', variables.componentId])
      queryClient.invalidateQueries(['components'])
      queryClient.invalidateQueries(['drawings-with-progress'])
    }
  })
}
```

**useCreateArea, useCreateSystem, useCreateTestPackage**
- Check if these already exist in codebase
- If not, create simple creation hooks:

```typescript
export function useCreateArea() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async ({ name, project_id }: CreateAreaParams) => {
      const { data, error } = await supabase
        .from('areas')
        .insert({
          name,
          project_id,
          created_by: user.id
        })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['areas'])
    }
  })
}
```

**Existing Hooks to Leverage:**
- `useComponent(id)` - fetch single component with metadata
- `useAreas(projectId)` - fetch all areas for dropdown
- `useSystems(projectId)` - fetch all systems for dropdown
- `useTestPackages(projectId)` - fetch all test packages for dropdown

### Validation & Error Handling

**Client-Side Validation:**
- Duplicate names: Check existing metadata before creating
- Empty names: Prevent blank metadata creation
- Form validation: At least one field changed before allowing save

**Server-Side Validation (RLS):**
- User must have Admin or Manager role
- Component must belong to user's project
- Metadata entities must belong to same project

**Error Scenarios:**

| Error | User Message | Recovery |
|-------|--------------|----------|
| Duplicate metadata name | "Area 'North Wing' already exists" | Show existing options, select instead |
| Permission denied (RLS) | "You don't have permission to modify this component" | Show toast, close modal |
| Concurrent update | "Component was updated by another user. Please refresh." | Show toast, refetch data |
| Network error | "Failed to save changes. Retry?" | Show retry button, exponential backoff |
| Validation error | "Area name cannot be empty" | Highlight field, focus input |

### Optimistic Updates Strategy

**Purpose:** Provide instant feedback while server processes mutation

**Implementation:**
1. On save click: immediately update component in cache
2. Close modal and update table row with new metadata
3. Show subtle loading indicator in corner
4. If server returns success: do nothing (already updated)
5. If server returns error: revert changes + show error toast

**Benefits:**
- Perceived performance <100ms
- Reduces user frustration on slow networks
- Maintains data consistency via rollback on error

## UI/UX Specifications

### MetadataEditForm Layout

**Desktop (≥1024px):**
```
┌─────────────────────────────────────────┐
│  Edit Component Metadata                 │
├─────────────────────────────────────────┤
│  Area          System       Test Package│
│  [Combobox▼]  [Combobox▼]  [Combobox▼] │
│                                          │
│              [Cancel] [Save]             │
└─────────────────────────────────────────┘
```

**Mobile (<1024px):**
```
┌───────────────────┐
│ Edit Metadata     │
├───────────────────┤
│ Area              │
│ [Combobox▼]      │
│                   │
│ System            │
│ [Combobox▼]      │
│                   │
│ Test Package      │
│ [Combobox▼]      │
│                   │
│ [Cancel] [Save]   │
└───────────────────┘
```

### Combobox Interaction Flow

**Initial State:**
- Displays current value (e.g., "Area-2") or placeholder "(None)"
- Chevron down icon indicates dropdown

**Click/Focus:**
1. Dropdown opens showing:
   - Current value highlighted
   - "(None)" option at top
   - All existing options (sorted A-Z)
   - Separator line
   - "Create new Area..." with "+" icon at bottom

**Type to Search:**
- Filters options as user types (fuzzy match)
- "Create new..." option always visible at bottom

**Select "Create new...":**
1. Dropdown content changes to inline input form:
   ```
   ┌──────────────────────┐
   │ Create New Area      │
   │ [input field____]    │
   │ [✓ Create] [Cancel]  │
   └──────────────────────┘
   ```
2. Focus moves to input field
3. Type name and press Enter or click "✓ Create"
4. Validates uniqueness (show error if duplicate)
5. Creates entry and auto-selects in combobox
6. Dropdown closes, new value appears in combobox

### Accessibility Requirements

**Keyboard Navigation:**
- Tab: Move between comboboxes and buttons
- Space/Enter: Open combobox dropdown
- Arrow Up/Down: Navigate options
- Escape: Close dropdown, cancel create mode
- Enter: Select option, submit create form

**ARIA Labels:**
- `role="combobox"` on trigger button
- `aria-expanded` state on dropdown
- `aria-label="Select area"` on each combobox
- `aria-describedby` for validation errors
- `role="dialog"` with `aria-labelledby` on modal

**Screen Reader Announcements:**
- "Area combobox, current value: Area-2"
- "10 options available, showing 10"
- "Create new area selected, edit box"
- "Area updated to North Wing"

**Focus Management:**
- Focus trap within modal
- Return focus to component row on close
- Focus input field when entering create mode

## Testing Strategy

### Unit Tests

**MetadataEditForm.test.tsx:**
- ✓ Renders with current values pre-populated
- ✓ Comboboxes show all available options
- ✓ "(None)" option clears assignment
- ✓ "Create new..." shows inline input
- ✓ Validates duplicate names
- ✓ Validates empty names
- ✓ Calls onSave with correct data
- ✓ Calls onCancel without saving

**useUpdateComponentMetadata.test.ts:**
- ✓ Mutation sends correct update payload
- ✓ Optimistic update modifies cache immediately
- ✓ Reverts on error
- ✓ Invalidates related queries on success

**useCreateArea.test.ts (and System, TestPackage):**
- ✓ Creates new metadata with correct fields
- ✓ Associates with current project
- ✓ Invalidates areas query cache
- ✓ Handles duplicate name errors

### Integration Tests

**component-metadata-editing.test.tsx:**
- ✓ Click component row → modal opens
- ✓ Admin user sees edit form
- ✓ Non-admin user sees view-only
- ✓ Change area dropdown → save → table updates
- ✓ Create new area → appears in dropdown → save successful
- ✓ Create duplicate area → shows error
- ✓ Validation prevents empty names
- ✓ Cancel button discards changes
- ✓ Concurrent update shows error and refetches

### E2E Tests

**component-metadata-workflow.spec.ts:**
```typescript
describe('Component Metadata Editing', () => {
  it('allows admin to edit component metadata from drawings view', async () => {
    // Login as Admin
    await loginAs('admin@example.com', 'password')

    // Navigate to drawings view
    await page.goto('/drawings')

    // Expand drawing DRAIN-1
    await page.click('text=DRAIN-1')

    // Click component row
    await page.click('text=VBALU-PFCBLF00M-001')

    // Verify modal opens with edit form
    expect(await page.locator('role=dialog')).toBeVisible()
    expect(await page.locator('text=Edit Component Metadata')).toBeVisible()

    // Change area from Area-2 to Area-3
    await page.click('label:has-text("Area")')
    await page.click('role=option[name="Area-3"]')

    // Save changes
    await page.click('button:has-text("Save")')

    // Verify modal closes
    expect(await page.locator('role=dialog')).not.toBeVisible()

    // Verify table row updated
    const componentRow = page.locator('text=VBALU-PFCBLF00M-001').locator('..')
    expect(await componentRow.locator('text=Area-3')).toBeVisible()

    // Verify changes persisted (reload page)
    await page.reload()
    expect(await componentRow.locator('text=Area-3')).toBeVisible()
  })

  it('prevents non-admin from editing metadata', async () => {
    // Login as Field User
    await loginAs('fielduser@example.com', 'password')

    // Navigate and click component
    await page.goto('/drawings')
    await page.click('text=VBALU-PFCBLF00M-001')

    // Verify modal opens but NO edit form
    expect(await page.locator('role=dialog')).toBeVisible()
    expect(await page.locator('text=Edit Component Metadata')).not.toBeVisible()

    // Verify can still see milestone history (read-only)
    expect(await page.locator('text=Milestone History')).toBeVisible()
  })
})
```

### Coverage Targets

| Area | Target | Rationale |
|------|--------|-----------|
| Overall | ≥70% | Project standard per CLAUDE.md |
| Hooks (useUpdateComponentMetadata) | ≥80% | Business logic requires thorough testing |
| Components (MetadataEditForm) | ≥60% | UI component standard |
| Integration tests | 100% of user flows | All happy + error paths covered |

## Success Criteria

### Functional Acceptance

- [x] Admin/Manager can click component row in drawings table
- [x] Modal opens showing ComponentDetailView with metadata form
- [x] Form shows current Area, System, Test Package values
- [x] User can select existing metadata from comboboxes
- [x] User can create new metadata via "Create new..." option
- [x] Changes save and table updates immediately (optimistic)
- [x] Milestone history displays below form (read-only)
- [x] Non-admin users see view-only modal (no edit form)
- [x] Validation prevents duplicate and empty names
- [x] Error handling for conflicts, permissions, network issues

### Non-Functional Acceptance

- [x] Modal opens in <200ms
- [x] Metadata save completes in <1s (with optimistic UI)
- [x] No table re-render lag when metadata changes
- [x] Mobile responsive (≤1024px breakpoint)
- [x] Touch targets ≥32px (per Feature 015 patterns)
- [x] Accessible (keyboard navigation, ARIA, screen readers)
- [x] Test coverage ≥70% overall, ≥80% for hooks

## Implementation Phases

### Phase 1: Backend Foundation
- Create `useUpdateComponentMetadata` hook
- Create `useCreateArea/System/TestPackage` hooks (if needed)
- Write unit tests for hooks (TDD - tests first)
- Implement optimistic update logic

### Phase 2: UI Components
- Add shadcn/ui Combobox component (if not exists)
- Create `MetadataEditForm` component
- Write component tests (TDD - tests first)
- Implement "Create new..." inline flow

### Phase 3: Integration
- Modify `ComponentDetailView` to accept metadata edit props
- Wire up onClick in ComponentRow → DrawingTable → Page
- Add Dialog state management in DrawingComponentTablePage
- Write integration tests

### Phase 4: Polish & Testing
- Add loading states and error messages
- Implement accessibility features (ARIA, keyboard nav)
- Write E2E tests
- Verify coverage targets met

### Phase 5: Documentation
- Update CLAUDE.md with feature reference
- Add implementation notes (if needed)
- Document any new patterns for future features

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Concurrent updates cause data loss | High | Optimistic updates with conflict detection, show error + refetch |
| Performance degradation with many metadata options | Medium | Virtualize combobox dropdown if >1000 options |
| Users accidentally create duplicate metadata with typos | Medium | Show fuzzy match suggestions before allowing create |
| RLS policy doesn't match frontend permissions | High | Test permission scenarios in integration tests, verify with Supabase |
| Optimistic update shows wrong data | Medium | Always refetch on success to confirm server state |

## Future Enhancements (Out of Scope)

- Bulk metadata editing (select multiple components, edit all at once)
- Metadata assignment history/audit trail
- Custom attributes editing (JSONB `attributes` field currently unused)
- Drawing assignment editing (risky - affects component identity)
- Component type changing (very risky - affects milestone templates)
- Metadata suggestions based on drawing name or component type
- Undo/redo for metadata changes

## References

- Feature 010: Drawing-Centered Component Progress Table (`specs/010-let-s-spec/`)
- Feature 011: Drawing & Component Metadata Assignment UI (`specs/011-the-drawing-component/`)
- Feature 015: Mobile Milestone Updates (responsive patterns) (`specs/015-mobile-milestone-updates/`)
- Feature 016: Team Management UI (permission patterns) (`specs/016-team-management-ui/`)
- Supabase RLS policies: `supabase/migrations/`
- Shadcn/ui Combobox: `https://ui.shadcn.com/docs/components/combobox`

## Approval

**Design Approved By:** User (via brainstorming session)
**Date:** 2025-10-28
**Next Steps:** Set up git worktree, create implementation plan, begin TDD implementation

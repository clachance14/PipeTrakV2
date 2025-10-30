# Quickstart Guide: Component Metadata Editing

**Feature**: 020-component-metadata-editing
**Date**: 2025-10-28

## Overview

This guide provides a quick reference for implementing and using the component metadata editing feature. For detailed technical information, see [research.md](./research.md), [data-model.md](./data-model.md), and [plan.md](./plan.md).

## Prerequisites

- Node.js and npm installed
- Supabase project configured (remote database)
- All dependencies installed (`npm install`)
- Authenticated as Admin or Manager user

## User Journey (What Users Will Do)

### Editing Component Metadata

1. **Navigate to Drawings Table**
   - Go to `/drawings` route
   - See table of drawings with expandable component rows

2. **Click a Component Row**
   - Click on any component row (e.g., "VBALU-PFCBLF00M-001")
   - Modal opens showing component details

3. **Edit Metadata**
   - See three dropdown fields: Area, System, Test Package
   - Click dropdown to see existing options
   - Select different metadata or choose "(None)" to clear

4. **Create New Metadata (Optional)**
   - Click dropdown and select "Create new Area..."
   - Inline form appears
   - Type new name (e.g., "North Wing")
   - Click Create or press Enter
   - New option appears and is auto-selected

5. **Save Changes**
   - Click Save button
   - Table updates immediately (optimistic UI)
   - Modal closes

### View-Only Mode (Non-Admin Users)

1. **Navigate and Click Component**
   - Same navigation as above

2. **View Modal**
   - See component metadata as static text (not editable)
   - See milestone history (read-only)
   - No Save/Edit buttons visible

## Implementation Workflow

### Phase 1: Add Shadcn/ui Combobox

```bash
# Run from project root
npx shadcn-ui@latest add combobox
```

**What this does**:
- Adds `src/components/ui/combobox.tsx`
- Installs dependencies (Radix UI Popover, Command)
- Configures Tailwind CSS classes

### Phase 2: Create Hooks (TDD - Write Tests First)

**File**: `src/hooks/useComponents.test.ts`

```typescript
describe('useUpdateComponentMetadata', () => {
  it('should update component metadata', async () => {
    // Test implementation
  })

  it('should handle optimistic updates', async () => {
    // Test optimistic cache update
  })

  it('should rollback on error', async () => {
    // Test error handling
  })
})
```

**File**: `src/hooks/useComponents.ts`

```typescript
export function useUpdateComponentMetadata() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: UpdateComponentMetadataParams) => {
      // UPDATE query
    },
    onMutate: async (variables) => {
      // Optimistic update
    },
    onError: (err, variables, context) => {
      // Rollback
    },
    onSuccess: () => {
      // Invalidate queries
    }
  })
}
```

**See**: `contracts/metadata-api.ts` for type definitions

### Phase 3: Create MetadataEditForm Component (TDD - Write Tests First)

**File**: `src/components/metadata/MetadataEditForm.test.tsx`

```typescript
describe('MetadataEditForm', () => {
  it('should render with current values', () => {
    // Test initial render
  })

  it('should show "Create new..." option', () => {
    // Test inline creation UI
  })

  it('should validate duplicate names', () => {
    // Test validation
  })

  it('should call onSave with correct params', () => {
    // Test save handler
  })
})
```

**File**: `src/components/metadata/MetadataEditForm.tsx`

```typescript
interface MetadataEditFormProps {
  component: Component
  projectId: string
  onSave: (params: UpdateComponentMetadataParams) => void
  onCancel: () => void
}

export function MetadataEditForm({ component, projectId, onSave, onCancel }: MetadataEditFormProps) {
  // Component implementation
  return (
    <div className="space-y-4">
      <AreaCombobox />
      <SystemCombobox />
      <TestPackageCombobox />
      <div className="flex justify-end gap-2">
        <Button onClick={onCancel}>Cancel</Button>
        <Button onClick={handleSave}>Save</Button>
      </div>
    </div>
  )
}
```

### Phase 4: Modify ComponentDetailView

**File**: `src/components/ComponentDetailView.test.tsx`

```typescript
it('should show metadata edit form when showMetadataEdit is true', () => {
  // Test metadata edit mode
})

it('should show view-only when showMetadataEdit is false', () => {
  // Test view-only mode
})
```

**File**: `src/components/ComponentDetailView.tsx`

```typescript
interface ComponentDetailViewProps {
  componentId: string
  showMetadataEdit?: boolean
  onMetadataUpdate?: (params: UpdateComponentMetadataParams) => void
  onClose?: () => void
}

export function ComponentDetailView({
  componentId,
  showMetadataEdit = false,
  onMetadataUpdate,
  onClose
}: ComponentDetailViewProps) {
  const { data: component } = useComponent(componentId)
  const { user } = useAuth()

  const canEdit = showMetadataEdit && ['Admin', 'Manager'].includes(user.role)

  return (
    <div>
      {canEdit && (
        <MetadataEditForm
          component={component}
          projectId={component.project_id}
          onSave={onMetadataUpdate}
          onCancel={onClose}
        />
      )}

      {!canEdit && (
        <div className="metadata-display">
          <p>Area: {component.area?.name ?? 'None'}</p>
          <p>System: {component.system?.name ?? 'None'}</p>
          <p>Test Package: {component.test_package?.name ?? 'None'}</p>
        </div>
      )}

      <MilestoneEventHistory componentId={componentId} />
    </div>
  )
}
```

### Phase 5: Wire Up DrawingComponentTablePage

**File**: `src/pages/DrawingComponentTablePage.test.tsx`

```typescript
it('should open modal when component row is clicked', () => {
  // Test click-to-modal flow
})

it('should close modal after save', () => {
  // Test save and close
})
```

**File**: `src/pages/DrawingComponentTablePage.tsx`

```typescript
export function DrawingComponentTablePage() {
  const [selectedComponentId, setSelectedComponentId] = useState<string | null>(null)
  const updateMetadata = useUpdateComponentMetadata()

  const handleComponentClick = (id: string) => {
    setSelectedComponentId(id)
  }

  const handleMetadataUpdate = (params: UpdateComponentMetadataParams) => {
    updateMetadata.mutate(params, {
      onSuccess: () => {
        setSelectedComponentId(null)  // Close modal
      }
    })
  }

  return (
    <div>
      <DrawingTable onComponentClick={handleComponentClick} />

      <Dialog open={!!selectedComponentId} onOpenChange={() => setSelectedComponentId(null)}>
        <DialogContent>
          {selectedComponentId && (
            <ComponentDetailView
              componentId={selectedComponentId}
              showMetadataEdit
              onMetadataUpdate={handleMetadataUpdate}
              onClose={() => setSelectedComponentId(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
```

### Phase 6: Integration & E2E Tests

**File**: `tests/integration/component-metadata-editing.test.tsx`

```typescript
describe('Component Metadata Editing Integration', () => {
  it('should complete full edit workflow', () => {
    // Test User Story 1
  })

  it('should create new metadata inline', () => {
    // Test User Story 2
  })

  it('should show view-only for non-admin', () => {
    // Test User Story 4
  })
})
```

**File**: `tests/e2e/component-metadata-workflow.spec.ts`

```typescript
test('admin can edit component metadata from drawings view', async ({ page }) => {
  // Full E2E workflow
})

test('non-admin sees view-only modal', async ({ page }) => {
  // Permission check
})
```

## Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- src/components/metadata/MetadataEditForm.test.tsx

# Run tests with coverage
npm test -- --coverage

# Run tests in UI mode
npm test:ui
```

## Testing Locally

### 1. Seed Test Data

Create test areas, systems, and test packages in Supabase dashboard or via SQL:

```sql
-- Insert test areas
INSERT INTO areas (id, name, project_id, organization_id, created_by)
VALUES
  (gen_random_uuid(), 'Area-2', 'your-project-id', 'your-org-id', 'your-user-id'),
  (gen_random_uuid(), 'North Wing', 'your-project-id', 'your-org-id', 'your-user-id');

-- Insert test systems
INSERT INTO systems (id, name, project_id, organization_id, created_by)
VALUES
  (gen_random_uuid(), 'Drain System', 'your-project-id', 'your-org-id', 'your-user-id'),
  (gen_random_uuid(), 'HVAC', 'your-project-id', 'your-org-id', 'your-user-id');

-- Insert test test packages
INSERT INTO test_packages (id, name, project_id, organization_id, created_by)
VALUES
  (gen_random_uuid(), 'TP-11', 'your-project-id', 'your-org-id', 'your-user-id'),
  (gen_random_uuid(), 'TP-12', 'your-project-id', 'your-org-id', 'your-user-id');
```

### 2. Start Development Server

```bash
npm run dev
```

### 3. Navigate to Drawings Table

- Open `http://localhost:5173/drawings`
- Log in as Admin or Manager user
- Click on any component row
- Modal should open with metadata edit form

### 4. Test Workflows

**Edit Existing Metadata**:
1. Open modal by clicking component row
2. Change Area dropdown to different value
3. Click Save
4. Verify table row updates immediately
5. Reload page, verify changes persisted

**Create New Metadata**:
1. Open modal
2. Click Area dropdown → "Create new Area..."
3. Type "Test Area 123" and press Enter
4. Verify new area appears in dropdown
5. Click Save
6. Verify component assigned to new area

**Clear Metadata**:
1. Open modal
2. Select "(None)" in Area dropdown
3. Click Save
4. Verify table shows empty area field

**Concurrent Edit Detection**:
1. Open modal on Component A
2. In another browser tab, edit Component A metadata
3. Return to first tab, try to save
4. Verify error toast: "Component was updated by another user. Please refresh."

## Troubleshooting

### Modal doesn't open when clicking component row

**Check**:
- Is `onComponentClick` prop passed to DrawingTable?
- Is Dialog state properly managed in DrawingComponentTablePage?
- Are there console errors?

**Debug**:
```typescript
console.log('Component clicked:', componentId)
console.log('Dialog open:', !!selectedComponentId)
```

### Combobox dropdown not showing options

**Check**:
- Are areas/systems/test_packages being fetched? (Check React Query DevTools)
- Is projectId correctly passed to hooks?
- Are RLS policies blocking the query?

**Debug**:
```typescript
const { data: areas, error } = useAreas(projectId)
console.log('Areas:', areas, 'Error:', error)
```

### Save button does nothing

**Check**:
- Is `onMetadataUpdate` prop passed to MetadataEditForm?
- Is useUpdateComponentMetadata mutation firing?
- Are there validation errors blocking save?

**Debug**:
```typescript
console.log('Mutation state:', mutation.isLoading, mutation.isError)
console.log('Form state:', formState)
```

### Optimistic update not reverting on error

**Check**:
- Is `onError` callback implemented in mutation?
- Is context snapshot being returned from `onMutate`?

**Debug**:
```typescript
onError: (err, variables, context) => {
  console.log('Error:', err)
  console.log('Previous state:', context?.previous)
}
```

### Permission check not working

**Check**:
- Is user role correctly returned from `useAuth()`?
- Are RLS policies enforcing Admin/Manager requirement?

**Debug**:
```typescript
const { user } = useAuth()
console.log('User role:', user.role)
console.log('Can edit:', ['Admin', 'Manager'].includes(user.role))
```

## Performance Optimization Tips

### Large Metadata Datasets (>1000 options)

If dropdowns lag with many options:

1. **Enable Virtual Scrolling** (already handled by cmdk library)
2. **Add Pagination** (if >10k options):
   ```typescript
   const [page, setPage] = useState(0)
   const { data: areas } = useAreas(projectId, { page, limit: 100 })
   ```

3. **Debounce Search**:
   ```typescript
   const [searchTerm, setSearchTerm] = useState('')
   const debouncedSearch = useDebounce(searchTerm, 300)
   ```

### Reduce Refetch Frequency

Use stale time to avoid excessive refetches:

```typescript
const { data: areas } = useAreas(projectId, {
  staleTime: 5 * 60 * 1000  // 5 minutes
})
```

## Next Steps

After implementation:

1. ✅ Run full test suite (`npm test -- --coverage`)
2. ✅ Verify coverage targets (≥70% overall, ≥80% hooks, ≥60% components)
3. ✅ Test all user stories from spec.md
4. ✅ Test on mobile devices (≤1024px breakpoint)
5. ✅ Test with screen reader (accessibility)
6. ✅ Update CLAUDE.md with feature reference
7. ✅ Create PR with tests + implementation commits

## References

- **Feature Specification**: [spec.md](./spec.md)
- **Implementation Plan**: [plan.md](./plan.md)
- **Research**: [research.md](./research.md)
- **Data Model**: [data-model.md](./data-model.md)
- **API Contracts**: [contracts/metadata-api.ts](./contracts/metadata-api.ts)
- **Design Document**: `/docs/plans/2025-10-28-component-metadata-editing-design.md`
- **Shadcn/ui Combobox**: https://ui.shadcn.com/docs/components/combobox
- **TanStack Query**: https://tanstack.com/query/latest/docs/react/guides/mutations

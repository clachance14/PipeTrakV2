# API Contracts: Feature 007

This directory contains TypeScript contract definitions for all hooks and mutations in Feature 007: Component Tracking & Lifecycle Management.

## Contract Pattern

Each contract file defines:
1. **Request shape** - Parameters accepted by the hook/mutation
2. **Response shape** - Data returned on success
3. **Behavior notes** - Side effects, cascades, validations

Contracts are NOT implementations - they define the API surface that tests will validate.

## Files

### area-management.contract.ts
- `useCreateArea()` - Create new area
- `useUpdateArea()` - Edit area name/description
- `useDeleteArea()` - Delete area (sets component area_id to NULL)

### system-management.contract.ts
- `useCreateSystem()` - Create new system
- `useUpdateSystem()` - Edit system name/description
- `useDeleteSystem()` - Delete system (sets component system_id to NULL)

### test-package-management.contract.ts
- `useCreateTestPackage()` - Create new test package
- `useUpdateTestPackage()` - Edit test package
- `useDeleteTestPackage()` - Delete test package (sets component test_package_id to NULL)

### component-assignment.contract.ts
- `useAssignComponents()` - Bulk assign components to area/system/package

### drawing-retirement.contract.ts
- `useRetireDrawing()` - Retire drawing (is_retired=true, components retain drawing_id)

### component-list.contract.ts
- `useComponents()` - Fetch components with server-side filtering and pagination

### milestone-tracking.contract.ts
- `useUpdateMilestone()` - Update milestone (triggers percent_complete calculation)

## Usage in Tests

Contract tests (in `tests/contract/`) import these definitions and assert API shape:

```typescript
// tests/contract/areas.contract.test.ts
import { useCreateArea } from '@/hooks/useAreas'

describe('useCreateArea contract', () => {
  it('accepts {name, description, project_id}', () => {
    const mutation = useCreateArea()
    type Request = Parameters<typeof mutation.mutate>[0]

    const validRequest: Request = {
      name: 'Area 100',
      description: 'Test',
      project_id: 'uuid'
    }
  })
})
```

## Implementation Order

1. Write contract tests FIRST (they will fail - no implementation)
2. Implement hooks to match contract
3. Tests pass ✅

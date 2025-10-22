# Tasks: Test Package Readiness Page Enhancement

**Feature**: 012-test-package-readiness
**Prerequisites**: Migration 00027 (materialized view fix + RPC functions)
**Tech Stack**: React 18, TypeScript 5, TanStack Query v5, Supabase, Radix UI

## Execution Flow

```
Phase 1: Database (Setup)
  → Migration 00027 (materialized view + RPC functions)
  → Type generation

Phase 2: Tests First (TDD) ⚠️ MUST FAIL BEFORE IMPLEMENTATION
  → Contract tests for mv_package_readiness, RPC functions, query hook
  → Integration tests for quickstart scenarios

Phase 3: Core Implementation (ONLY after tests are failing)
  → RPC functions (database-side)
  → Custom hooks (TanStack Query)
  → UI components (PackageDetailPage, PackageEditDialog)
  → Integration (routes, state management)

Phase 4: Polish
  → Performance validation
  → Quickstart scenario verification
  → Documentation updates
```

---

## Phase 1: Database Setup

### T001 Create migration 00028 with materialized view fix ✅
**File**: `supabase/migrations/00028_fix_package_readiness_inheritance.sql`
**Description**: Drop and recreate `mv_package_readiness` materialized view with COALESCE pattern to count inherited components

**Implementation Details**:
- `DROP MATERIALIZED VIEW IF EXISTS mv_package_readiness CASCADE;`
- Use correlated subquery: `COALESCE(c.test_package_id, (SELECT d.test_package_id FROM drawings d WHERE d.id = c.drawing_id))`
- Add `description` column to SELECT list
- Recreate indexes: `idx_mv_package_readiness_id`, `idx_mv_package_readiness_project`
- **Must match** data-model.md lines 36-60

**Acceptance Criteria**:
- [X] Migration created (00028 not 00027 - 00027 already exists for Feature 011)
- [X] View includes `description` column
- [X] View counts both direct and inherited components
- [X] Indexes recreated successfully
- [ ] Migration applies without errors: `supabase db push --linked` (BLOCKED: Network issue)

---

### T002 Add create_test_package RPC function to migration 00028 ✅
**File**: `supabase/migrations/00028_fix_package_readiness_inheritance.sql` (included)
**Description**: Create RPC function for package creation with validation

**Implementation Details**:
- Function signature: `create_test_package(p_project_id, p_name, p_description, p_target_date, p_user_id)`
- Validations:
  - `TRIM(p_name)` and check length > 0 (raise "Package name cannot be empty")
  - `LENGTH(p_description) <= 100` (raise "Description max 100 characters")
  - Project exists via RLS (foreign key constraint)
- Return type: `UUID` (new package ID)
- Use `SECURITY DEFINER` with `SET search_path = public`
- **Must match** data-model.md lines 145-168

**Acceptance Criteria**:
- [X] Function creates package and returns UUID
- [X] Empty name raises exception
- [X] Description >100 chars raises exception
- [X] RLS enforced via SECURITY DEFINER

---

### T003 Add update_test_package RPC function to migration 00028 ✅
**File**: `supabase/migrations/00028_fix_package_readiness_inheritance.sql` (included)
**Description**: Create RPC function for package updates with partial field support

**Implementation Details**:
- Function signature: `update_test_package(p_package_id, p_name, p_description, p_target_date, p_user_id)`
- Build dynamic UPDATE statement with non-NULL parameters only
- Validations:
  - If `p_name` provided: `TRIM(p_name)` and check length > 0
  - If `p_description` provided: `LENGTH(p_description) <= 100`
- Return type: `JSONB` → `{success: true}` or `{error: "message"}`
- Check row exists after UPDATE (return error if 0 rows affected)
- **Must match** data-model.md lines 170-198

**Acceptance Criteria**:
- [X] Function updates only specified fields
- [X] Returns `{success: true}` on success
- [X] Returns `{error: "..."}` on validation failure or not found
- [X] Supports NULL to clear description

---

### T004 Apply migration and regenerate TypeScript types ✅
**Commands**:
```bash
supabase db push --linked  # Applied manually via Supabase Dashboard
supabase gen types typescript --linked > src/types/database.types.ts
```
**Description**: Deploy migration 00028 to remote database and generate updated types

**Acceptance Criteria**:
- [X] Migration 00028 applied successfully (manually via Dashboard)
- [X] `database.types.ts` includes `mv_package_readiness` with `description` column
- [X] RPC function types generated: `create_test_package`, `update_test_package`
- [X] Types file regenerated (1339 lines, 40KB)

---

## Phase 2: Tests First (TDD) ⚠️ CRITICAL

**IMPORTANT**: All tests in this phase MUST be written and MUST FAIL before proceeding to Phase 3. This validates that we're testing actual behavior, not mocks.

### T005 [P] Contract test: Materialized view inheritance ✅
**File**: `tests/contract/materialized-view-inheritance.contract.test.ts`
**Description**: Test all 11 behavioral contracts for `mv_package_readiness` view

**Test Cases** (from materialized-view.contract.md):
1. BC-001: Direct assignment counted
2. BC-002: Inherited assignment counted (🔑 KEY TEST - must fail before migration)
3. BC-003: Override beats inheritance
4. BC-004: Retired components excluded
5. BC-005: NULL inheritance when drawing has no package
6. BC-006: Completed component filtering
7. BC-007: Blocker count aggregation
8. BC-008: Empty package handling
9. BC-009: Description field included
10. BC-010: Last activity timestamp
11. RLS-001: Project isolation enforced

**Test Setup**:
- Create test project, packages, drawings, components via Supabase client
- Use real database (no mocking)
- Clean up in `afterEach` hook

**Acceptance Criteria**:
- [ ] BC-002 FAILS before migration 00027 (view doesn't count inherited)
- [ ] All 11 tests pass after migration applied
- [ ] Uses real Supabase client (no mocks)
- [ ] Coverage: ≥80% for mv_package_readiness validation

---

### T006 [P] Contract test: create_test_package RPC ✅
**File**: `tests/contract/package-crud-create.contract.test.ts`
**Description**: Test all 8 behavioral contracts for `create_test_package` function

**Test Cases** (from package-crud.contract.md):
1. BC-CREATE-001: Valid creation returns UUID
2. BC-CREATE-002: Name trimmed
3. BC-CREATE-003: Empty name rejected (🔑 KEY TEST - must fail before migration)
4. BC-CREATE-004: Description length validated
5. BC-CREATE-005: NULL description allowed
6. BC-CREATE-006: Target date accepted
7. BC-CREATE-007: Invalid project rejected
8. BC-CREATE-008: RLS enforced

**Test Pattern**:
```typescript
it('BC-CREATE-003: rejects empty name', async () => {
  await expect(
    supabase.rpc('create_test_package', {
      p_project_id: testProjectId,
      p_name: '   ' // Whitespace only
    })
  ).rejects.toThrow('Package name cannot be empty');
});
```

**Acceptance Criteria**:
- [ ] All tests FAIL before migration 00027 (function doesn't exist)
- [ ] All 8 tests pass after migration applied
- [ ] Error messages match contract exactly
- [ ] RLS test uses different organization context

---

### T007 [P] Contract test: update_test_package RPC ✅
**File**: `tests/contract/package-crud-update.contract.test.ts`
**Description**: Test all 9 behavioral contracts for `update_test_package` function

**Test Cases** (from package-crud.contract.md):
1. BC-UPDATE-001: Name updated
2. BC-UPDATE-002: Description updated
3. BC-UPDATE-003: Multiple fields updated
4. BC-UPDATE-004: Description cleared (set to NULL)
5. BC-UPDATE-005: Empty name rejected
6. BC-UPDATE-006: Description length validated
7. BC-UPDATE-007: Package not found error
8. BC-UPDATE-008: RLS enforced
9. BC-UPDATE-009: No-op when all parameters NULL

**Test Pattern**:
```typescript
it('BC-UPDATE-004: clears description', async () => {
  const { data } = await supabase.rpc('update_test_package', {
    p_package_id: packageId,
    p_description: null
  });
  expect(data).toEqual({ success: true });

  const { data: pkg } = await supabase
    .from('test_packages')
    .select('description')
    .eq('id', packageId)
    .single();
  expect(pkg.description).toBeNull();
});
```

**Acceptance Criteria**:
- [ ] All tests FAIL before migration 00027
- [ ] All 9 tests pass after migration applied
- [ ] Return value matches JSONB contract (`{success: true}` or `{error: "..."}`)
- [ ] No-op test verifies unchanged fields remain unchanged

---

### T008 [P] Contract test: usePackageComponents query hook
**File**: `tests/contract/package-components-query.contract.test.ts`
**Description**: Test all 15 behavioral contracts for `usePackageComponents` hook

**Test Cases** (from package-components-query.contract.md):
1. BC-QUERY-001: Direct assignment included
2. BC-QUERY-002: Inherited assignment included
3. BC-QUERY-003: Override excluded from original package
4. BC-QUERY-004: Override included in target package
5. BC-QUERY-005: Retired components excluded
6. BC-QUERY-006: Drawing information joined
7. BC-QUERY-007: Progress template joined
8. BC-QUERY-008: Identity display formatted
9. BC-QUERY-009: Empty package handled
10. BC-QUERY-010: Project isolation (RLS)
11. HC-001: Loading state
12. HC-002: Success state
13. HC-003: Error state
14. HC-004: Stale time respected
15. HC-005: Invalidation on milestone update

**Test Pattern**:
```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { usePackageComponents } from '@/hooks/usePackageComponents';

it('BC-QUERY-002: includes inherited components', async () => {
  // Setup: Component with NULL test_package_id, drawing with PKG-A
  const { result } = renderHook(
    () => usePackageComponents(packageAId, projectId),
    { wrapper: createQueryWrapper() }
  );

  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(result.current.data).toHaveLength(1);
  expect(result.current.data[0].test_package_id).toBeNull();
  expect(result.current.data[0].drawing_test_package_id).toBe(packageAId);
});
```

**Acceptance Criteria**:
- [ ] All tests FAIL before hook implementation (T013)
- [ ] All 15 tests pass after hook implemented
- [ ] Uses renderHook with QueryClientProvider wrapper
- [ ] Tests both query logic AND hook behavior

---

### T009 [P] Integration test: Scenario 1 - Verify materialized view inheritance fix
**File**: `tests/integration/012-test-package-readiness/scenario-1-inheritance-fix.test.tsx`
**Description**: End-to-end test matching quickstart.md Scenario 1

**Test Steps** (from quickstart.md lines 15-67):
1. Create test package via SQL
2. Assign package to drawing (NOT components)
3. Verify components have NULL test_package_id
4. Query `mv_package_readiness`
5. Assert `total_components > 0` (inherited components counted)
6. Cleanup

**Acceptance Criteria**:
- [ ] Test FAILS before migration 00027 (view shows 0 components)
- [ ] Test passes after migration applied
- [ ] Uses real Supabase queries (no mocks)
- [ ] Cleanup removes test data in `afterEach`

---

### T010 [P] Integration test: Scenario 4 - Drill-down to package components
**File**: `tests/integration/012-test-package-readiness/scenario-4-drill-down.test.tsx`
**Description**: End-to-end test for package detail page with inheritance badges

**Test Steps** (from quickstart.md lines 148-201):
1. Create package and assign to drawing (5 components)
2. Override 1 component to different package
3. Render PackageDetailPage component
4. Assert 4 components displayed (inherited)
5. Assert gray "inherited" badges shown
6. Assert 1 component missing (overridden)
7. Cleanup

**Acceptance Criteria**:
- [ ] Test FAILS before PackageDetailPage implementation (T016)
- [ ] Test passes after T016 + T017 completed
- [ ] Uses @testing-library/react rendering
- [ ] Verifies badge types (gray vs blue)

---

## Phase 3: Core Implementation (ONLY after all tests are failing)

### T011 Create PackageCard type definition ✅
**File**: `src/types/package.types.ts`
**Description**: TypeScript interfaces for package display and CRUD

**Type Definitions**:
```typescript
export interface PackageCard {
  id: string;
  name: string;
  description: string | null;
  progress: number; // 0-100
  componentCount: number;
  blockerCount: number;
  targetDate: string | null;
  statusColor: StatusColor;
}

export interface Package {
  id: string;
  project_id: string;
  name: string;
  description: string | null;
  target_date: string | null;
  created_at: string;
}

export interface PackageComponent {
  id: string;
  drawing_id: string | null;
  drawing_no_norm: string | null;
  drawing_test_package_id: string | null;
  component_type: ComponentType;
  identity_key: IdentityKey;
  identityDisplay: string;
  test_package_id: string | null;
  percent_complete: number;
  current_milestones: Record<string, boolean | number>;
  progress_template_id: string;
  milestones_config: MilestoneConfig[];
}

export interface CreatePackagePayload {
  p_project_id: string;
  p_name: string;
  p_description?: string | null;
  p_target_date?: string | null;
}

export interface UpdatePackagePayload {
  p_package_id: string;
  p_name?: string | null;
  p_description?: string | null;
  p_target_date?: string | null;
}
```

**Acceptance Criteria**:
- [ ] Types match data-model.md interfaces
- [ ] No TypeScript compilation errors
- [ ] Exported from `src/types/index.ts`

---

### T012 [P] Create useCreatePackage mutation hook ✅
**File**: `src/hooks/usePackages.ts` (combined with T013-T014)
**Description**: TanStack Query mutation for creating packages with optimistic updates

**Implementation Details**:
- Call `supabase.rpc('create_test_package', payload)`
- Optimistic update: Add temp package to `['package-readiness', projectId]` cache
- On error: Rollback optimistic update
- On success: Invalidate `['package-readiness', projectId]`
- Show toast notification (success/error)
- Return mutation object with `mutate`, `isPending`, `error`

**Pattern** (from research.md lines 160-192):
```typescript
export function useCreatePackage(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreatePackagePayload) =>
      supabase.rpc('create_test_package', data),
    onMutate: async (newPackage) => {
      await queryClient.cancelQueries(['package-readiness', projectId]);
      const previous = queryClient.getQueryData(['package-readiness', projectId]);

      queryClient.setQueryData(['package-readiness', projectId], old => [...old, {
        package_id: 'temp-id',
        package_name: newPackage.p_name,
        description: newPackage.p_description,
        total_components: 0,
        avg_percent_complete: 0,
        blocker_count: 0
      }]);

      return { previous };
    },
    onError: (err, variables, context) => {
      queryClient.setQueryData(['package-readiness', projectId], context.previous);
      toast.error('Failed to create package');
    },
    onSuccess: () => {
      toast.success('Package created successfully');
    },
    onSettled: () => {
      queryClient.invalidateQueries(['package-readiness', projectId]);
    }
  });
}
```

**Acceptance Criteria**:
- [ ] Contract test T006 passes
- [ ] Optimistic update shows package immediately (<50ms perceived latency)
- [ ] Rollback on error restores previous state
- [ ] Toast notifications displayed

---

### T013 [P] Create useUpdatePackage mutation hook ✅
**File**: `src/hooks/usePackages.ts` (combined with T012, T014)
**Description**: TanStack Query mutation for updating packages with optimistic updates

**Implementation Details**:
- Call `supabase.rpc('update_test_package', payload)`
- Optimistic update: Update package in `['package-readiness', projectId]` cache
- On error: Rollback + show error toast
- On success: Invalidate queries + show success toast
- **Same pattern as T012** but with UPDATE logic

**Acceptance Criteria**:
- [ ] Contract test T007 passes
- [ ] Supports partial updates (only changed fields)
- [ ] Optimistic update immediate
- [ ] Error messages from RPC displayed in toast

---

### T014 Create usePackageComponents query hook ✅
**File**: `src/hooks/usePackages.ts` (combined with T012-T013)
**Description**: TanStack Query hook for fetching package components with inheritance

**Implementation Details**:
- Query key: `['package-components', { package_id, project_id }]`
- Stale time: 2 minutes
- Supabase query with OR condition:
  ```typescript
  .or(`test_package_id.eq.${packageId},and(test_package_id.is.null,drawings.test_package_id.eq.${packageId})`)
  ```
- Join drawings (for `drawing_no_norm`, `drawing_test_package_id`)
- Join progress_templates (for `milestones_config`)
- Filter: `is_retired = false`, `project_id = projectId`
- Client-side transform: Add `identityDisplay` via `formatIdentityKey`
- **Must match** package-components-query.contract.md lines 9-37

**Acceptance Criteria**:
- [ ] Contract test T008 passes (all 15 test cases)
- [ ] Returns both direct and inherited components
- [ ] Drawing info included for inheritance detection
- [ ] Formatted identityDisplay computed

---

### T015 Create PackageEditDialog component
**File**: `src/components/packages/PackageEditDialog.tsx`
**Description**: Modal dialog for creating/editing packages

**UI Components**:
- Radix Dialog primitive
- Form fields:
  - Name (required, text input)
  - Description (optional, textarea, max 100 chars with counter)
  - Target Date (optional, date picker)
- Mode prop: `'create' | 'edit'`
- Pre-fill values in edit mode
- Validation: Show error if name empty
- Uses `useCreatePackage` or `useUpdatePackage` based on mode

**Implementation Details**:
```tsx
interface PackageEditDialogProps {
  mode: 'create' | 'edit';
  projectId: string;
  package?: Package; // Required for edit mode
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PackageEditDialog({ mode, projectId, package, open, onOpenChange }: PackageEditDialogProps) {
  const createMutation = useCreatePackage(projectId);
  const updateMutation = useUpdatePackage(projectId);

  const handleSubmit = (formData) => {
    if (mode === 'create') {
      createMutation.mutate({ p_project_id: projectId, ...formData });
    } else {
      updateMutation.mutate({ p_package_id: package.id, ...formData });
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Form with name, description, target_date */}
    </Dialog>
  );
}
```

**Acceptance Criteria**:
- [ ] Create mode shows empty form
- [ ] Edit mode pre-fills values
- [ ] Description character counter (X/100)
- [ ] Validation prevents empty name submission
- [ ] Integration test T010 can render this component

---

### T016 Create PackageDetailPage component
**File**: `src/pages/PackageDetailPage.tsx`
**Description**: Drill-down page displaying all components in a test package

**Component Structure**:
```tsx
export function PackageDetailPage() {
  const { packageId } = useParams<{ packageId: string }>();
  const { projectId } = useAuth(); // From context
  const { data: components, isLoading } = usePackageComponents(packageId, projectId);
  const { data: packageInfo } = usePackageReadiness(projectId); // Find package by ID

  return (
    <Layout>
      <PackageDetailHeader package={packageInfo} />
      <ComponentTable
        components={components}
        showInheritanceBadges={true}
      />
    </Layout>
  );
}
```

**UI Elements**:
- Header: Package name, description, target date, progress bar
- Component table:
  - Columns: Drawing, Identity, Type, Progress, Milestones
  - Reuse `ComponentRow` from Feature 010 (research.md lines 114-143)
  - Show InheritanceBadge (gray) or AssignedBadge (blue) in Test Package column
  - No virtualization needed (max 200 components)

**Acceptance Criteria**:
- [ ] Integration test T010 passes
- [ ] Displays all inherited + direct components
- [ ] Shows correct badge types (gray vs blue)
- [ ] Empty state when 0 components
- [ ] Loading skeleton while fetching

---

### T017 Add inheritance badge display to ComponentRow
**File**: `src/components/drawing-table/ComponentRow.tsx` (modify)
**Description**: Extend ComponentRow to support test package badges

**Changes**:
- Add optional prop: `showTestPackageBadge?: boolean`
- If enabled, render badge in Test Package column:
  ```tsx
  {showTestPackageBadge && (
    getBadgeType(component.test_package_id, component.drawing_test_package_id) === 'inherited'
      ? <InheritanceBadge source={component.drawing_no_norm} />
      : <AssignedBadge />
  )}
  ```
- Reuse `InheritanceBadge` and `AssignedBadge` from Feature 011 (research.md lines 38-64)

**Acceptance Criteria**:
- [ ] Badge shown when `showTestPackageBadge={true}`
- [ ] Gray badge for inherited (NULL test_package_id)
- [ ] Blue badge for assigned (non-NULL test_package_id)
- [ ] Tooltip shows "From drawing XXX" for inherited

---

### T018 Update PackagesPage to show package descriptions
**File**: `src/pages/PackagesPage.tsx` (modify)
**Description**: Display package description on cards

**Changes**:
- Update query to select `description` from `mv_package_readiness`
- Pass `description` to PackageCard component
- Display description below package name (gray text, truncated at 60 chars)

**Acceptance Criteria**:
- [ ] Description displayed if present
- [ ] NULL description shows nothing (not "null")
- [ ] Truncation adds "..." after 60 chars

---

### T019 Add package detail route to App.tsx
**File**: `src/App.tsx` (modify)
**Description**: Register `/packages/:packageId/components` route

**Route Definition**:
```tsx
<Route
  path="/packages/:packageId/components"
  element={
    <ProtectedRoute>
      <PackageDetailPage />
    </ProtectedRoute>
  }
/>
```

**Acceptance Criteria**:
- [ ] Route accessible at `/packages/{uuid}/components`
- [ ] Protected by authentication
- [ ] PackageDetailPage renders correctly

---

### T020 Update PackagesPage card click to navigate to detail
**File**: `src/components/packages/PackageCard.tsx` (modify)
**Description**: Make package cards clickable to drill down

**Changes**:
- Wrap card in `<Link to={`/packages/${package.id}/components`}>`
- Exclude edit icon from clickable area (stopPropagation)
- Add hover state (border color change)

**Acceptance Criteria**:
- [ ] Clicking card navigates to detail page
- [ ] Clicking edit icon opens dialog (doesn't navigate)
- [ ] Hover state visible

---

## Phase 4: Polish

### T021 [P] Run quickstart Scenario 2 - Create package via UI
**File**: Manual test (refer to quickstart.md lines 70-103)
**Description**: Verify create package flow end-to-end

**Test Steps**:
1. Navigate to `/packages`
2. Click "New Package" button
3. Fill form: Name, Description, Target Date
4. Click "Create Package"
5. Verify toast, card appears, persisted to DB

**Acceptance Criteria**:
- [ ] Package created successfully
- [ ] Optimistic update immediate
- [ ] Description and target date saved
- [ ] Database verification query returns 1 row

---

### T022 [P] Run quickstart Scenario 3 - Edit package via UI
**File**: Manual test (refer to quickstart.md lines 105-145)
**Description**: Verify update package flow end-to-end

**Test Steps**:
1. Create test package
2. Click edit icon
3. Update name and description
4. Save
5. Verify changes persisted

**Acceptance Criteria**:
- [ ] Package updated successfully
- [ ] Only changed fields updated
- [ ] Optimistic update immediate
- [ ] Database verification query shows new values

---

### T023 [P] Run quickstart Scenario 5 - Component override behavior
**File**: Manual test (refer to quickstart.md lines 203-257)
**Description**: Verify inheritance vs override badge display

**Test Steps**:
1. Create 2 packages
2. Assign drawing to Package A (components inherit)
3. Override 1 component to Package B
4. Verify Package A detail shows gray badges (4 components)
5. Verify Package B detail shows blue badge (1 component)

**Acceptance Criteria**:
- [ ] Gray badges shown for inherited
- [ ] Blue badges shown for manually assigned
- [ ] Component counts correct in both packages

---

### T024 Performance test: Package detail page with 200 components
**File**: `tests/integration/012-test-package-readiness/performance.test.ts`
**Description**: Verify page load performance targets

**Test Setup**:
- Create 1 package with 200 components
- Measure query latency + render time
- Target: <2s total page load (quickstart.md line 322)

**Acceptance Criteria**:
- [ ] Query completes in <500ms (p95)
- [ ] Page load (query + render) <2s
- [ ] No virtualization needed (simple table rendering)

---

### T025 Update PackagesPage to use description field
**File**: `src/components/packages/PackageCard.tsx` (modify if not done in T018)
**Description**: Ensure description displayed on cards in packages grid

**Verification**:
- [ ] Description visible on all cards
- [ ] Matches data-model.md PackageCard interface
- [ ] Truncation working correctly

---

### T026 Add description to PackageEditDialog
**File**: `src/components/packages/PackageEditDialog.tsx` (verify from T015)
**Description**: Ensure description field editable in dialog

**Verification**:
- [ ] Description textarea present
- [ ] Character counter shows X/100
- [ ] Validation prevents >100 chars
- [ ] NULL description handled correctly

---

### T027 Verify all contract tests passing
**Command**: `npm test tests/contract/`
**Description**: Run all contract tests to verify implementation

**Test Files**:
- materialized-view-inheritance.contract.test.ts (T005)
- package-crud-create.contract.test.ts (T006)
- package-crud-update.contract.test.ts (T007)
- package-components-query.contract.test.ts (T008)

**Acceptance Criteria**:
- [ ] All 43 contract tests passing (11 + 8 + 9 + 15)
- [ ] No skipped or pending tests
- [ ] Coverage ≥80% for tested code paths

---

## Dependencies

**Phase Order**:
- Phase 1 (Setup) must complete before Phase 2
- Phase 2 (Tests) must FAIL before Phase 3
- Phase 3 (Implementation) makes tests pass
- Phase 4 (Polish) verifies end-to-end

**Task Dependencies**:
- T001-T003 are sequential (same migration file)
- T004 blocks all subsequent tasks (types must be generated)
- T005-T010 are parallel [P] (different test files)
- T011 blocks T012, T013, T014 (type definitions needed)
- T012, T013, T014 are parallel [P] (different hook files)
- T015 depends on T012, T013 (uses mutation hooks)
- T016 depends on T014 (uses query hook)
- T017 depends on T016 (modifies component used in page)
- T018-T020 can be parallel [P] (different files)
- T021-T027 are parallel [P] (independent verification tasks)

**Blocking Relationships**:
```
T001 → T002 → T003 → T004
                      ↓
         T005 [P]    T011 → T012 [P] → T015
         T006 [P]          → T013 [P] → T015
         T007 [P]          → T014    → T016 → T017
         T008 [P]
         T009 [P]
         T010 [P]                    ↓
                                T018 [P] → T020
                                T019 [P]
                                     ↓
                                T021 [P]
                                T022 [P]
                                T023 [P]
                                T024 [P]
                                T025 [P]
                                T026 [P]
                                T027 [P]
```

---

## Parallel Execution Examples

### Phase 2: Launch all contract tests together
```typescript
// After migration 00027 applied, run all contract tests to verify they fail:
Task("Contract test: mv_package_readiness", "tests/contract/materialized-view-inheritance.contract.test.ts")
Task("Contract test: create_test_package RPC", "tests/contract/package-crud-create.contract.test.ts")
Task("Contract test: update_test_package RPC", "tests/contract/package-crud-update.contract.test.ts")
Task("Contract test: usePackageComponents query", "tests/contract/package-components-query.contract.test.ts")
Task("Integration test: Scenario 1", "tests/integration/012-test-package-readiness/scenario-1-inheritance-fix.test.tsx")
Task("Integration test: Scenario 4", "tests/integration/012-test-package-readiness/scenario-4-drill-down.test.tsx")
```

### Phase 3: Launch hook implementations together
```typescript
// After type definitions (T011) complete:
Task("Implement useCreatePackage hook", "src/hooks/useCreatePackage.ts")
Task("Implement useUpdatePackage hook", "src/hooks/useUpdatePackage.ts")
Task("Implement usePackageComponents hook", "src/hooks/usePackageComponents.ts")
```

### Phase 4: Launch all polish tasks together
```typescript
// After core implementation complete:
Task("Quickstart Scenario 2", "Manual test - create package")
Task("Quickstart Scenario 3", "Manual test - edit package")
Task("Quickstart Scenario 5", "Manual test - override behavior")
Task("Performance test", "tests/integration/012-test-package-readiness/performance.test.ts")
Task("Verify descriptions", "src/components/packages/PackageCard.tsx")
Task("Verify dialog description", "src/components/packages/PackageEditDialog.tsx")
Task("Run all contract tests", "npm test tests/contract/")
```

---

## Validation Checklist

**Before marking feature complete**:
- [ ] All contracts have corresponding tests (✅ T005-T008)
- [ ] All tests come before implementation (✅ Phase 2 before Phase 3)
- [ ] Parallel tasks truly independent (✅ marked [P])
- [ ] Each task specifies exact file path (✅)
- [ ] Migration 00027 applied and types regenerated (✅ T001-T004)
- [ ] All 43 contract tests passing (✅ T027)
- [ ] All 6 quickstart scenarios pass (✅ T009-T010, T021-T023)
- [ ] Performance targets met (<2s page load) (✅ T024)
- [ ] No regressions in existing features (run full test suite)

---

## Notes

- **TDD Discipline**: Phase 2 tests MUST fail before implementing Phase 3 code. This validates we're testing real behavior, not mocks.
- **Optimistic Updates**: Use TanStack Query's `onMutate`/`onError`/`onSettled` pattern (research.md decision #5)
- **Component Reuse**: Leverage InheritanceBadge, AssignedBadge, ComponentRow from Feature 011 (research.md decision #2)
- **COALESCE Pattern**: Materialized view uses correlated subquery for inheritance (research.md decision #1)
- **RPC Functions**: All CRUD operations use SECURITY DEFINER functions (research.md decision #3)
- **No Virtualization**: Package detail page uses simple table (max 200 components, research.md decision #4)

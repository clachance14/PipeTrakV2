# Quickstart: Test Package Lifecycle Workflow

**Feature**: 030-test-package-workflow
**Audience**: Developers implementing this feature
**Estimated Reading Time**: 15 minutes

## Overview

This guide helps you implement test package lifecycle workflow functionality. Follow this guide after reading the feature spec and data model.

**What you'll build**:
- Package creation with drawing/component assignment
- Certificate form with test parameters
- 7-stage sequential workflow with sign-offs
- Component uniqueness enforcement

---

## Prerequisites

Before starting implementation:

1. **Read these documents** (in order):
   - `spec.md` - Feature requirements and user stories
   - `data-model.md` - Database schema and relationships
   - `research.md` - Design decisions and rationale

2. **Environment setup**:
   ```bash
   # Ensure you're on the feature branch
   git checkout 030-test-package-workflow

   # Install dependencies (if needed)
   npm install

   # Verify Supabase connection
   supabase status --linked
   ```

3. **Schema compliance** - Backend schema compliance skill completed ✅

---

## Implementation Phases

### Phase 1: Database Migrations (TDD)

**Goal**: Create 5 new migrations for schema changes.

**Files to create**:
```
supabase/migrations/
├── 00121_add_test_type_to_packages.sql
├── 00122_create_package_certificates.sql
├── 00123_create_package_workflow_stages.sql
├── 00124_create_package_assignments.sql
└── 00125_add_component_uniqueness.sql
```

**Order matters!** Create migrations sequentially with 2+ second delays to avoid timestamp collisions.

**Steps**:

1. **Create migration 00121** (test_type column):
   ```bash
   sleep 2
   supabase migration new add_test_type_to_packages
   ```

   Copy schema from `data-model.md` → Table 1 (`test_packages` modification).

   Test:
   ```bash
   ./db-push.sh
   ```

2. **Create migration 00122** (certificates table):
   ```bash
   sleep 2
   supabase migration new create_package_certificates
   ```

   Copy schema from `data-model.md` → Table 2 (`package_certificates`).

   Test:
   ```bash
   ./db-push.sh
   ```

3. **Create migration 00123** (workflow stages table):
   ```bash
   sleep 2
   supabase migration new create_package_workflow_stages
   ```

   Copy schema from `data-model.md` → Table 3 (`package_workflow_stages`).

   Test:
   ```bash
   ./db-push.sh
   ```

4. **Create migration 00124** (assignment tables):
   ```bash
   sleep 2
   supabase migration new create_package_assignments
   ```

   Copy schema from `data-model.md` → Tables 4 & 5 (`package_drawing_assignments`, `package_component_assignments`).

   Test:
   ```bash
   ./db-push.sh
   ```

5. **Create migration 00125** (component uniqueness):
   ```bash
   sleep 2
   supabase migration new add_component_uniqueness
   ```

   Copy schema from `data-model.md` → Table 6 (`components` modification).

   Test:
   ```bash
   ./db-push.sh
   ```

6. **Regenerate TypeScript types**:
   ```bash
   supabase gen types typescript --linked > src/types/database.types.ts
   ```

7. **Verify type check passes**:
   ```bash
   tsc -b
   ```

**Troubleshooting**:
- If `./db-push.sh` hangs: Known CLI bug, use `supabase db push --db-url "postgresql://..."`
- If "prepared statement already exists" error: Shouldn't occur with session mode (port 5432), but if it does, verify migration succeeded
- If timestamp collision: Rename migration file with +1 second (see CLAUDE.md)

---

### Phase 2: TypeScript Contracts (Copy from `contracts/`)

**Goal**: Add type-safe TypeScript interfaces to `src/types/`.

**Files to create**:
```
src/types/
├── package.types.ts      # Copy from contracts/package.types.ts
├── certificate.types.ts  # Copy from contracts/certificate.types.ts
├── workflow.types.ts     # Copy from contracts/workflow.types.ts
└── assignment.types.ts   # Copy from contracts/assignment.types.ts
```

**Steps**:
```bash
# Copy contract files to src/types/
cp specs/030-test-package-workflow/contracts/*.ts src/types/

# Verify type check passes
tsc -b
```

---

### Phase 3: TanStack Query Hooks (TDD)

**Goal**: Create custom hooks for data fetching and mutations.

**Files to create**:
```
src/hooks/
├── usePackageCertificate.ts       # CRUD for certificates
├── usePackageWorkflow.ts          # CRUD for workflow stages
├── usePackageAssignments.ts       # Manage assignments
└── usePackageCertificateNumber.ts # Generate cert numbers
```

**Pattern** (follow existing `usePackages.ts`):

```typescript
// Example: usePackageCertificate.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { PackageCertificate, CertificateCreateCompleteInput } from '@/types/certificate.types';

export function usePackageCertificate(packageId: string) {
  return useQuery({
    queryKey: ['package-certificate', packageId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('package_certificates')
        .select('*')
        .eq('package_id', packageId)
        .single();

      if (error) throw error;
      return data as PackageCertificate;
    }
  });
}

export function useCreateCertificate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CertificateCreateCompleteInput) => {
      // Generate certificate number first
      const certNumber = await generateCertificateNumber(input.package_id);

      const { data, error } = await supabase
        .from('package_certificates')
        .insert({ ...input, certificate_number: certNumber })
        .select()
        .single();

      if (error) throw error;
      return data as PackageCertificate;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['package-certificate', data.package_id] });
    }
  });
}
```

**Key points**:
- Use TanStack Query for all Supabase calls (Constitution Principle IV)
- Type-safe inputs/outputs using contract types
- Invalidate queries on mutation success
- Handle errors with `try/catch` or `onError` callback

---

### Phase 4: Validation Logic (TDD)

**Goal**: Create reusable validation functions.

**Files to create**:
```
src/lib/
├── packageValidation.ts      # Certificate validation, component uniqueness
└── workflowStageConfig.ts    # Stage definitions, required fields
```

**Example: packageValidation.ts**

```typescript
import type { CertificateValidationErrors } from '@/types/certificate.types';
import type { ComponentAssignmentConflict } from '@/types/assignment.types';

export function validateCertificate(input: {
  test_pressure?: number | null;
  test_media?: string | null;
  temperature?: number | null;
}): CertificateValidationErrors {
  const errors: CertificateValidationErrors = {};

  if (!input.test_pressure || input.test_pressure <= 0) {
    errors.test_pressure = ['Test pressure must be greater than 0'];
  }

  if (!input.test_media || input.test_media.trim().length === 0) {
    errors.test_media = ['Test media is required'];
  }

  if (input.temperature === null || input.temperature === undefined) {
    errors.temperature = ['Temperature is required'];
  } else if (input.temperature <= -273) {
    errors.temperature = ['Temperature must be above absolute zero (-273°C)'];
  }

  return errors;
}

export async function validateComponentAssignments(
  packageId: string,
  componentIds: string[]
): Promise<ComponentAssignmentConflict[]> {
  const { data, error } = await supabase
    .from('components')
    .select('id, test_package_id, test_packages(name)')
    .in('id', componentIds)
    .not('test_package_id', 'is', null)
    .neq('test_package_id', packageId);

  if (error) throw error;

  return (data || []).map(component => ({
    component_id: component.id,
    component_identity: formatComponentIdentity(component),
    current_package_id: component.test_package_id!,
    current_package_name: component.test_packages?.name || 'Unknown',
    error_message: `Component already assigned to package "${component.test_packages?.name}"`,
  }));
}
```

**Example: workflowStageConfig.ts**

```typescript
import type { StageName, StageConfig } from '@/types/workflow.types';

export const WORKFLOW_STAGES: StageConfig[] = [
  {
    name: 'Pre-Hydro Acceptance',
    order: 1,
    required_signoffs: ['qc_rep'],
    optional_signoffs: [],
  },
  {
    name: 'Test Acceptance',
    order: 2,
    required_signoffs: ['qc_rep', 'client_rep'],
    optional_signoffs: [],
  },
  {
    name: 'Drain/Flush Acceptance',
    order: 3,
    required_signoffs: ['qc_rep'],
    optional_signoffs: [],
  },
  {
    name: 'Post-Hydro Acceptance',
    order: 4,
    required_signoffs: ['qc_rep'],
    optional_signoffs: [],
  },
  {
    name: 'Protective Coatings Acceptance',
    order: 5,
    required_signoffs: ['qc_rep'],
    optional_signoffs: [],
  },
  {
    name: 'Insulation Acceptance',
    order: 6,
    required_signoffs: ['qc_rep'],
    optional_signoffs: [],
  },
  {
    name: 'Final Package Acceptance',
    order: 7,
    required_signoffs: ['qc_rep', 'client_rep', 'mfg_rep'],
    optional_signoffs: [],
  },
];

export function getStageConfig(stageName: StageName): StageConfig {
  const config = WORKFLOW_STAGES.find(s => s.name === stageName);
  if (!config) throw new Error(`Unknown stage: ${stageName}`);
  return config;
}

export function getNextStage(currentStage: StageName): StageName | null {
  const currentIndex = WORKFLOW_STAGES.findIndex(s => s.name === currentStage);
  if (currentIndex === -1 || currentIndex === WORKFLOW_STAGES.length - 1) {
    return null;
  }
  return WORKFLOW_STAGES[currentIndex + 1].name;
}
```

---

### Phase 5: UI Components (TDD)

**Goal**: Build React components for package workflow UI.

**Files to create**:
```
src/components/packages/
├── PackageCreateDialog.tsx            # NEW
├── PackageCertificateForm.tsx         # NEW
├── PackageWorkflowStepper.tsx         # NEW
├── PackageWorkflowStageForm.tsx       # NEW
├── DrawingSelectionList.tsx           # NEW
└── ComponentSelectionList.tsx         # NEW

src/components/ui/
└── stepper.tsx                        # NEW (shadcn component)

src/pages/
└── PackageDetailPage.tsx              # NEW
```

**Component patterns** (follow existing shadcn/ui patterns):

1. **PackageCreateDialog.tsx** - Two-mode assignment:
   - Tabs: "Select Drawings" vs. "Select Components"
   - Prevent mixing modes (FR-004)
   - Show assignment preview (FR-008)
   - Validate uniqueness before submit (FR-013)

2. **PackageCertificateForm.tsx** - React Hook Form + Zod:
   - Dual submission: "Save as Draft" vs. "Submit & Begin Testing"
   - Validate required fields only on "Submit"
   - Auto-populate from package (name, test_type)
   - Auto-generate certificate number on submit

3. **PackageWorkflowStepper.tsx** - Vertical stepper:
   - Install shadcn stepper: `npx shadcn@latest add stepper`
   - 7 stages with status colors (green=completed, blue=in_progress, gray=not_started/skipped)
   - Sequential enforcement: lock stages until previous completed
   - Show skip indicator with reason tooltip

4. **PackageWorkflowStageForm.tsx** - Dynamic form per stage:
   - Type-safe stage data rendering based on `StageData` discriminated union
   - Sign-off inputs (name + date pickers)
   - Skip stage option with required reason text
   - Audit trail display for completed stages

**Key UI patterns**:
- Desktop-only (no mobile layouts required per FR-034)
- Keyboard accessible (Tab, Enter, Escape)
- Loading/error states
- Optimistic updates with TanStack Query
- Toast notifications for success/error

---

### Phase 6: Integration Tests (TDD)

**Goal**: Write integration tests for all user stories.

**Files to create**:
```
tests/integration/packages/
├── packageCreation.test.ts       # User Story 1 & 2
├── packageCertificate.test.ts    # User Story 3
├── packageWorkflow.test.ts       # User Story 4
└── packageAssignments.test.ts    # Edge cases (component uniqueness)
```

**Test pattern** (follow existing integration tests):

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PackageCreateDialog } from '@/components/packages/PackageCreateDialog';

describe('Package Creation - User Story 1', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
  });

  it('creates package with drawing assignment (Scenario 1)', async () => {
    const user = userEvent.setup();

    render(
      <QueryClientProvider client={queryClient}>
        <PackageCreateDialog projectId="test-project-id" />
      </QueryClientProvider>
    );

    // Click "Create Package"
    const createButton = screen.getByRole('button', { name: /create package/i });
    await user.click(createButton);

    // Enter package name
    const nameInput = screen.getByLabelText(/package name/i);
    await user.type(nameInput, 'Hydro Package 1');

    // Select test type
    const testTypeSelect = screen.getByLabelText(/test type/i);
    await user.selectOptions(testTypeSelect, 'Hydrostatic');

    // Switch to "Select Drawings" tab
    const drawingsTab = screen.getByRole('tab', { name: /select drawings/i });
    await user.click(drawingsTab);

    // Select 3 drawings from Area 100
    const drawings = screen.getAllByRole('checkbox', { name: /drawing/i });
    await user.click(drawings[0]);
    await user.click(drawings[1]);
    await user.click(drawings[2]);

    // Verify preview shows component count
    await waitFor(() => {
      expect(screen.getByText(/50 components will be inherited from 3 drawings/i)).toBeInTheDocument();
    });

    // Submit
    const submitButton = screen.getByRole('button', { name: /create/i });
    await user.click(submitButton);

    // Verify package created
    await waitFor(() => {
      expect(screen.getByText(/package created successfully/i)).toBeInTheDocument();
    });
  });

  it('prevents creating package with duplicate name (Scenario 3)', async () => {
    // ... test implementation
  });
});
```

**Coverage targets** (Constitution Principle IX):
- Overall: ≥70%
- `src/lib/**`: ≥80%
- `src/components/**`: ≥60%

---

## Common Patterns

### 1. Querying Components for Package (Direct + Inherited)

```typescript
async function getPackageComponents(packageId: string) {
  const { data, error } = await supabase.rpc('get_package_components', {
    p_package_id: packageId
  });

  if (error) throw error;
  return data;
}
```

(Note: Implement RPC function in migration for complex JOIN query - see data-model.md Query Patterns)

### 2. Validating Component Uniqueness Before Assignment

```typescript
import { validateComponentAssignments } from '@/lib/packageValidation';

async function handleComponentAssignment(packageId: string, componentIds: string[]) {
  // Validate uniqueness
  const conflicts = await validateComponentAssignments(packageId, componentIds);

  if (conflicts.length > 0) {
    // Show error toast
    toast.error(`${conflicts.length} components already assigned to other packages`);
    return;
  }

  // Proceed with assignment
  await createComponentAssignments({ package_id: packageId, component_ids: componentIds });
}
```

### 3. Sequential Workflow Stage Enforcement

```typescript
function canProceedToStage(stages: PackageWorkflowStage[], targetStageOrder: number): boolean {
  const previousStages = stages.filter(s => s.stage_order < targetStageOrder);
  return previousStages.every(s => s.status === 'completed' || s.status === 'skipped');
}
```

### 4. Generating Certificate Number

```typescript
async function generateCertificateNumber(packageId: string): Promise<string> {
  // Get project_id from package
  const { data: pkg, error: pkgError } = await supabase
    .from('test_packages')
    .select('project_id')
    .eq('id', packageId)
    .single();

  if (pkgError) throw pkgError;

  // Call RPC function (see research.md Decision 1)
  const { data, error } = await supabase.rpc('generate_certificate_number', {
    p_project_id: pkg.project_id
  });

  if (error) throw error;
  return data; // Returns "PKG-001", "PKG-002", etc.
}
```

---

## Testing Checklist

Before marking implementation complete:

- [ ] All 5 migrations applied successfully
- [ ] TypeScript types regenerated (`supabase gen types...`)
- [ ] Type check passes (`tsc -b`)
- [ ] All 4 user stories have passing integration tests
- [ ] Edge cases tested (component uniqueness, duplicate names, sequential workflow)
- [ ] Coverage targets met (≥70% overall, ≥80% lib, ≥60% components)
- [ ] Manual testing on desktop browsers (Chrome, Firefox, Safari)
- [ ] All form validations working (certificate, workflow stages)
- [ ] Assignment preview shows correct component counts
- [ ] Workflow stepper enforces sequential progression
- [ ] Audit trail recorded for workflow stage completions

---

## Deployment

After all tests pass:

1. **Commit migrations + types together**:
   ```bash
   git add supabase/migrations/*.sql src/types/database.types.ts
   git commit -m "feat: add test package lifecycle schema"
   ```

2. **Commit application code**:
   ```bash
   git add src/
   git commit -m "feat: implement test package lifecycle workflow"
   ```

3. **Push to feature branch**:
   ```bash
   git push origin 030-test-package-workflow
   ```

4. **Create pull request** (see CLAUDE.md for PR format)

---

## Troubleshooting

### Migration Issues

**Problem**: `./db-push.sh` hangs at "Initializing login role"
**Solution**: Use full DB URL: `supabase db push --db-url "postgresql://..."`

**Problem**: "prepared statement already exists" error
**Solution**: Shouldn't occur with current db-push.sh (uses session mode). If it does, verify migration succeeded.

**Problem**: "duplicate key value violates unique constraint"
**Solution**: Timestamp collision - rename migration file with +1 second

### Type Check Errors

**Problem**: TypeScript errors after regenerating types
**Solution**: Check for breaking changes in migration (e.g., renamed column)

**Problem**: Contract types mismatch with database types
**Solution**: Ensure migrations match data-model.md exactly

### Test Failures

**Problem**: Integration test fails with "permission denied"
**Solution**: Verify RLS policies allow test user's organization_id

**Problem**: Component uniqueness test fails
**Solution**: Check unique index created correctly in migration 00125

---

## Next Steps

After implementation complete:

1. Update PROJECT-STATUS.md with feature completion
2. Add quickstart patterns to KNOWLEDGE-BASE.md (if reusable)
3. Update CLAUDE.md with new testing patterns (if novel)
4. Create follow-up tickets for:
   - Client user role implementation (currently QC provides all sign-offs)
   - Workflow stage configuration UI (currently hard-coded)
   - Bulk package creation from CSV import

---

## Additional Resources

- **Spec**: `specs/030-test-package-workflow/spec.md`
- **Data Model**: `specs/030-test-package-workflow/data-model.md`
- **Research**: `specs/030-test-package-workflow/research.md`
- **Constitution**: `.specify/memory/constitution.md`
- **CLAUDE.md**: Project-level guidance
- **Shadcn UI**: https://ui.shadcn.com/
- **TanStack Query**: https://tanstack.com/query/latest
- **React Hook Form**: https://react-hook-form.com/

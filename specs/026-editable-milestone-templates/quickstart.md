# Quickstart: Editable Milestone Weight Templates

**Phase**: 1 (Design & Contracts)
**Date**: 2025-11-10
**Audience**: Developers implementing this feature

## Overview

This feature enables admins and project managers to customize milestone weight percentages for each component type within their project. Implementation consists of:

1. **Database layer**: 2 new tables + 7 migrations + 6 RPC functions
2. **UI layer**: 6 new React components + 4 TanStack Query hooks
3. **Testing**: 12 test files (unit + integration)

**Estimated effort**: 16-20 hours (2-3 days for solo developer)

---

## Prerequisites

Before starting implementation:

- [x] Feature spec complete (`spec.md`)
- [x] Constitution check passed (all 5 principles compliant)
- [x] Research complete (`research.md` - all decisions made)
- [x] Data model defined (`data-model.md`)
- [x] RPC contracts written (`contracts/rpc-functions.sql`)

**Next step**: Run `/speckit.tasks` to generate task breakdown.

---

## Implementation Phases

### Phase 0: Database Schema (Migrations 1-5)

**Duration**: 2-3 hours

**Tasks**:
1. Create `project_progress_templates` table (migration 00085)
2. Add weight sum validation trigger (migration 00086)
3. Create `project_template_changes` audit table (migration 00087)
4. Implement `clone_system_templates_for_project` RPC (migration 00088)
5. Add auto-clone trigger on project creation (migration 00089)

**Testing**:
- Run migrations with `supabase db push --linked`
- Verify table creation with `psql` queries
- Test cloning RPC manually
- Write integration tests for cloning behavior

**Success Criteria**:
- All migrations apply without errors
- Cloning RPC creates exactly 55 template rows
- Auto-clone trigger fires on new project insert

---

### Phase 1: Progress Calculation Update (Migrations 6-7)

**Duration**: 1-2 hours

**Tasks**:
1. Update `calculate_component_percent` function with project template fallback (migration 00090)
2. Add RLS policies for template tables (migration 00091)

**Testing**:
- Test progress calculation with project templates
- Test fallback to system templates (for projects without cloned templates)
- Verify RLS policies block unauthorized access

**Success Criteria**:
- Components calculate progress using project templates when available
- Fallback to system templates works correctly
- RLS policies enforce admin/PM-only editing

---

### Phase 2: Core RPC Functions

**Duration**: 3-4 hours

**Tasks**:
1. Implement `update_project_template_weights` RPC
2. Implement `recalculate_components_with_template` RPC
3. Implement `get_project_template_summary` RPC
4. Add audit logging trigger

**Testing**:
- Unit tests for each RPC function
- Test optimistic locking (concurrent edit detection)
- Test weight validation (sum = 100%)
- Verify audit log entries created

**Success Criteria**:
- Weight updates persist correctly
- Recalculation affects correct component set
- Audit log captures all changes
- Concurrent edits rejected with clear error

---

### Phase 3: TanStack Query Hooks

**Duration**: 2-3 hours

**Tasks**:
1. Create `useProjectTemplates` hook (fetch templates)
2. Create `useUpdateProjectTemplates` hook (mutate weights)
3. Create `useCloneTemplates` hook (manual cloning)
4. Create `useTemplateChanges` hook (audit log)

**Testing**:
- Unit tests for each hook (mock Supabase client)
- Test query invalidation after mutations
- Test error handling (network errors, validation failures)

**Success Criteria**:
- Hooks return correct TypeScript types
- Mutations invalidate related queries
- Loading/error states handled gracefully

---

### Phase 4: UI Components (Main Page)

**Duration**: 3-4 hours

**Tasks**:
1. Create `MilestoneTemplatesPage` (main settings page)
2. Create `TemplateCard` (component type card)
3. Create `CloneTemplatesBanner` (prompt for existing projects)
4. Add route to `App.tsx`

**Testing**:
- Render tests for each component
- Test permission-based visibility
- Test clone button click flow
- Visual regression tests (desktop-only)

**Success Criteria**:
- Page displays all 11 component type cards
- Banner shows for projects without templates
- Clone button triggers RPC and refreshes UI
- Navigation link hidden for non-admin/PM users

---

### Phase 5: UI Components (Editor Modal)

**Duration**: 4-5 hours

**Tasks**:
1. Create `TemplateEditor` modal (weight editing)
2. Create `WeightInput` component (numeric input with validation)
3. Create `WeightProgressBar` (visual weight distribution)
4. Implement real-time validation (total = 100%)

**Testing**:
- Component interaction tests (input changes, save button)
- Validation tests (sum ≠ 100%, invalid values)
- Loading state tests (recalculation spinner)
- Keyboard navigation tests (Tab, Enter, Escape)

**Success Criteria**:
- Modal opens with current weights loaded
- Validation disables Save button when total ≠ 100%
- Progress bars update as user types
- Retroactive checkbox controls recalculation
- Success/error toasts display appropriately

---

### Phase 6: Integration Testing

**Duration**: 2-3 hours

**Tasks**:
1. Write RLS policy integration tests
2. Write E2E workflow tests (clone → edit → save → recalculate)
3. Write permission enforcement tests
4. Performance test recalculation (1,000 components)

**Testing**:
- RLS tests verify policy enforcement
- E2E tests cover complete user journeys
- Performance tests meet <3 second target

**Success Criteria**:
- All integration tests pass
- Code coverage ≥70% overall, ≥80% for utilities
- No RLS policy bypasses
- Recalculation performance within target

---

## Development Workflow (TDD)

**For each component/function**:

1. **RED**: Write failing test first
   ```typescript
   it('should disable Save button when weights sum ≠ 100%', () => {
     render(<TemplateEditor weights={[{name: 'A', weight: 50}, {name: 'B', weight: 40}]} />);
     expect(screen.getByRole('button', {name: /save/i})).toBeDisabled();
   });
   ```

2. **GREEN**: Implement minimum code to pass
   ```typescript
   const totalWeight = weights.reduce((sum, w) => sum + w.weight, 0);
   const isSaveDisabled = totalWeight !== 100;
   ```

3. **REFACTOR**: Improve code while keeping tests green
   ```typescript
   const validateWeights = (weights: Weight[]) => {
     const total = weights.reduce((sum, w) => sum + w.weight, 0);
     return { isValid: total === 100, total };
   };
   ```

4. **COMMIT**: Commit tests + implementation together
   ```bash
   git add src/components/settings/TemplateEditor.tsx
   git add src/components/settings/TemplateEditor.test.tsx
   git commit -m "test: add weight validation for template editor"
   ```

---

## File Creation Order

### Database (Migrations)

```bash
# Phase 0: Schema creation (order matters - foreign keys)
supabase/migrations/00085_project_progress_templates.sql
supabase/migrations/00086_template_validation.sql
supabase/migrations/00087_template_audit.sql
supabase/migrations/00088_clone_templates_rpc.sql
supabase/migrations/00089_auto_clone_templates_trigger.sql

# Phase 1: Progress calculation update
supabase/migrations/00090_update_calculate_percent.sql
supabase/migrations/00091_template_rls_policies.sql
```

### Hooks (Test First)

```bash
# Phase 3: TanStack Query hooks
src/hooks/useProjectTemplates.test.ts      # Write test first
src/hooks/useProjectTemplates.ts           # Then implementation

src/hooks/useUpdateProjectTemplates.test.ts
src/hooks/useUpdateProjectTemplates.ts

src/hooks/useCloneTemplates.test.ts
src/hooks/useCloneTemplates.ts

src/hooks/useTemplateChanges.test.ts
src/hooks/useTemplateChanges.ts
```

### Components (Test First)

```bash
# Phase 4: Main page components
src/components/settings/TemplateCard.test.tsx
src/components/settings/TemplateCard.tsx

src/components/settings/CloneTemplatesBanner.test.tsx
src/components/settings/CloneTemplatesBanner.tsx

src/components/settings/MilestoneTemplatesPage.test.tsx
src/components/settings/MilestoneTemplatesPage.tsx

# Phase 5: Editor modal components
src/components/settings/WeightInput.test.tsx
src/components/settings/WeightInput.tsx

src/components/settings/WeightProgressBar.test.tsx
src/components/settings/WeightProgressBar.tsx

src/components/settings/TemplateEditor.test.tsx
src/components/settings/TemplateEditor.tsx
```

### Integration Tests (After Implementation)

```bash
# Phase 6: Integration tests
tests/integration/rls/project-templates-rls.test.ts
tests/integration/settings/milestone-templates-workflow.test.ts
```

---

## Common Patterns (Copy from Existing Code)

### Hook Pattern

**Reference**: `src/hooks/useProgressTemplates.ts` (existing)

```typescript
export function useProjectTemplates(projectId: string, componentType: string) {
  return useQuery({
    queryKey: ['projectTemplates', projectId, componentType],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_progress_templates')
        .select('*')
        .eq('project_id', projectId)
        .eq('component_type', componentType)
        .order('milestone_order');

      if (error) throw error;
      return data;
    },
  });
}
```

### Mutation Hook Pattern

**Reference**: `src/hooks/useComponentAssignment.ts` (existing)

```typescript
export function useUpdateProjectTemplates(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ componentType, weights, applyToExisting, lastUpdated }) => {
      const { data, error } = await supabase.rpc('update_project_template_weights', {
        p_project_id: projectId,
        p_component_type: componentType,
        p_new_weights: weights,
        p_apply_to_existing: applyToExisting,
        p_last_updated: lastUpdated,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projectTemplates', projectId] });
    },
  });
}
```

### Dialog Pattern

**Reference**: `src/components/ComponentAssignDialog.tsx` (existing)

```typescript
export function TemplateEditor({ projectId, componentType, open, onOpenChange }) {
  const { data: templates } = useProjectTemplates(projectId, componentType);
  const updateMutation = useUpdateProjectTemplates(projectId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit {componentType} Milestone Weights</DialogTitle>
        </DialogHeader>
        {/* Weight inputs here */}
        <DialogFooter>
          <Button onClick={handleSave} disabled={!isValid}>
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

### Form Validation Pattern

**Reference**: `src/components/AreaForm.tsx` (existing)

```typescript
const templateSchema = z.object({
  weights: z.array(z.object({
    milestone_name: z.string(),
    weight: z.number().int().min(0).max(100)
  }))
}).refine(
  (data) => data.weights.reduce((sum, w) => sum + w.weight, 0) === 100,
  { message: "Weights must sum to 100%" }
);

const form = useForm<z.infer<typeof templateSchema>>({
  resolver: zodResolver(templateSchema),
  defaultValues: { weights: templates }
});
```

---

## Testing Checklist

### Unit Tests (Components)

- [ ] `TemplateCard` renders component type and milestone count
- [ ] `TemplateCard` shows "Edit" button for admin/PM users
- [ ] `TemplateCard` hides "Edit" button for other users
- [ ] `CloneTemplatesBanner` displays when no templates exist
- [ ] `CloneTemplatesBanner` calls cloning RPC on button click
- [ ] `WeightInput` validates range (0-100)
- [ ] `WeightInput` shows error border for invalid values
- [ ] `WeightProgressBar` displays correct width based on weight
- [ ] `TemplateEditor` loads current weights on open
- [ ] `TemplateEditor` calculates total weight in real-time
- [ ] `TemplateEditor` disables Save when total ≠ 100%
- [ ] `TemplateEditor` shows loading spinner during recalculation

### Unit Tests (Hooks)

- [ ] `useProjectTemplates` fetches templates for component type
- [ ] `useProjectTemplates` returns empty array for missing templates
- [ ] `useUpdateProjectTemplates` calls RPC with correct params
- [ ] `useUpdateProjectTemplates` invalidates query cache on success
- [ ] `useCloneTemplates` creates 55 template rows
- [ ] `useTemplateChanges` fetches audit log entries

### Integration Tests (Database)

- [ ] Cloning RPC creates exactly 55 rows
- [ ] Cloning RPC fails if templates already exist
- [ ] Weight validation trigger rejects sum ≠ 100%
- [ ] Weight validation trigger allows sum = 100%
- [ ] Update RPC logs changes to audit table
- [ ] Update RPC detects concurrent edits (optimistic locking)
- [ ] Recalculation RPC updates correct component set
- [ ] RLS policies allow admin/PM to update templates
- [ ] RLS policies block field engineers from updating
- [ ] `calculate_component_percent` uses project templates first
- [ ] `calculate_component_percent` falls back to system templates

### Integration Tests (E2E Workflow)

- [ ] User clones templates → sees 11 cards
- [ ] User opens editor → sees current weights
- [ ] User adjusts weights (sum = 100%) → Save enabled
- [ ] User adjusts weights (sum ≠ 100%) → Save disabled
- [ ] User saves without retroactive → existing components unchanged
- [ ] User saves with retroactive → existing components recalculated
- [ ] User saves → audit log entry created
- [ ] Concurrent user opens editor → sees stale data warning

---

## Performance Targets (SC-003)

| Operation | Target | Measurement |
|-----------|--------|-------------|
| Template weight update | <500ms | Time from Save click to success toast |
| Recalculate 1,000 components | <3 seconds | RPC execution time |
| UI validation (total weight) | <100ms | Input onChange to UI update |
| Template query (fetch) | <200ms | Time to render editor modal |

**Verify performance**:
```sql
-- Measure recalculation time
\timing on
SELECT recalculate_components_with_template(
  'project-uuid',
  'Field Weld'
);
\timing off
```

---

## Rollout Checklist

### Pre-Deployment

- [ ] All tests pass (`npm test`)
- [ ] Type checking passes (`tsc -b`)
- [ ] Coverage ≥70% overall, ≥80% for utilities
- [ ] Manual testing on staging environment
- [ ] Database migrations validated on staging
- [ ] Performance targets met (1,000 component recalculation <3s)

### Deployment

- [ ] Apply migrations to production (`supabase db push --linked`)
- [ ] Regenerate TypeScript types (`supabase gen types typescript --linked`)
- [ ] Deploy frontend with feature flag `ENABLE_TEMPLATE_EDITING=false`
- [ ] Enable feature flag for pilot projects (5-10 projects)
- [ ] Monitor for errors/performance issues (1 week)
- [ ] Enable feature flag for all users
- [ ] Update documentation (CLAUDE.md, PROJECT-STATUS.md)

### Post-Deployment

- [ ] Monitor adoption rate (target: 30% within 60 days per SC-006)
- [ ] Track bug reports (target: zero calculation discrepancies per SC-007)
- [ ] Conduct user satisfaction survey (target: ≥85% per SC-008)
- [ ] Review audit logs for usage patterns

---

## Troubleshooting

### Common Issues

**Issue**: Cloning RPC fails with "Templates already exist"
**Solution**: Check if project already has rows in `project_progress_templates`. Delete manually if needed.

**Issue**: Weight validation trigger rejects valid weights
**Solution**: Verify sum equals exactly 100 (not 99.99 or 100.01). Check for floating-point precision errors.

**Issue**: Recalculation takes >3 seconds for 1,000 components
**Solution**: Check `calculate_component_percent` performance. Add index on `components(project_id, component_type)` if missing.

**Issue**: Concurrent edit not detected (optimistic locking fails)
**Solution**: Verify `updated_at` timestamp is updated on every weight change. Check RPC logic for timestamp comparison.

**Issue**: RLS policy allows unauthorized user to edit templates
**Solution**: Verify user role is `admin` or `project_manager` in `organization_members` table. Check policy logic.

---

## Next Steps

1. **Run `/speckit.tasks`** to generate ordered task breakdown
2. **Start Phase 0** (database migrations) following TDD workflow
3. **Commit frequently** (per-task commits with tests + implementation)
4. **Update `PROJECT-STATUS.md`** after each phase completes
5. **Request code review** before merging to `main`

**Estimated timeline**: 2-3 days for solo developer, 1-2 days with pair programming.

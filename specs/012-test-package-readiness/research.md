# Research: Test Package Readiness Page Enhancement

**Feature**: 012-test-package-readiness
**Date**: 2025-10-21
**Status**: Complete

## Research Questions

### 1. PostgreSQL Materialized View COALESCE Pattern for Inheritance

**Question**: How to efficiently count components that inherit `test_package_id` from their drawing in a materialized view?

**Decision**: Use COALESCE with correlated subquery in LEFT JOIN condition

**Rationale**:
- COALESCE allows fallback: `component.test_package_id OR drawing.test_package_id`
- Correlated subquery fetches drawing value only when needed
- LEFT JOIN ensures packages with 0 components still appear (existing behavior)
- Performance: Subquery runs once per component row, acceptably fast for 50-500 components per package

**SQL Pattern**:
```sql
LEFT JOIN components c ON
  COALESCE(c.test_package_id, (SELECT d.test_package_id FROM drawings d WHERE d.id = c.drawing_id)) = tp.id
  AND NOT c.is_retired
```

**Alternatives Considered**:
1. **LATERAL JOIN**: More explicit, but requires PostgreSQL 9.3+ and adds complexity
2. **Separate inherited/direct CTEs**: Clearer logic, but 2x slower due to duplicate component scans
3. **Application-level aggregation**: Flexible, but loses materialized view performance benefit (60s refresh)

**References**:
- PostgreSQL COALESCE docs: https://www.postgresql.org/docs/current/functions-conditional.html
- Existing implementation: Feature 011's `assign_drawing_with_inheritance` function uses same COALESCE pattern

### 2. Component Reuse from Feature 011 (Inheritance Badges)

**Question**: Should we duplicate InheritanceBadge/AssignedBadge components or reuse from Feature 011?

**Decision**: Reuse existing components from `src/components/drawing-table/`

**Rationale**:
- DRY principle: Badge logic identical for test_package_id, area_id, system_id
- Consistency: Same visual design across all metadata fields
- Maintainability: Single source of truth for badge styling and tooltip behavior
- Already tested: Feature 011 has 37 passing tests for metadata-inheritance.ts

**Import Pattern**:
```typescript
import { InheritanceBadge } from '@/components/drawing-table/InheritanceBadge';
import { AssignedBadge } from '@/components/drawing-table/AssignedBadge';
import { getBadgeType, getTooltipText } from '@/lib/metadata-inheritance';
```

**Alternatives Considered**:
1. **Duplicate components**: Simpler imports, but violates DRY and creates maintenance burden
2. **Generic Badge component**: More flexible, but over-engineered for 2 badge types
3. **Move to shared location**: Technically cleaner, but requires refactoring Feature 011 (scope creep)

**References**:
- Feature 011 implementation: `src/components/drawing-table/InheritanceBadge.tsx`
- Utility functions: `src/lib/metadata-inheritance.ts`
- Contract tests: `tests/contract/inheritance-detection.contract.test.ts`

### 3. RPC Functions vs Direct SQL for Package CRUD

**Question**: Should package create/update use RPC functions or direct Supabase client SQL?

**Decision**: Use RPC functions for create/update operations

**Rationale**:
- Encapsulation: Business logic in database (consistent with Feature 011's approach)
- Validation: RLS policies enforced automatically via SECURITY DEFINER
- Atomicity: Single round-trip for validation + insert/update
- Audit trail: Can add audit_log entries in same transaction (future enhancement)
- Performance: SECURITY DEFINER avoids RLS overhead on individual statements

**RPC Signatures**:
```sql
CREATE OR REPLACE FUNCTION create_test_package(
  p_project_id UUID,
  p_name TEXT,
  p_description TEXT DEFAULT NULL,
  p_target_date DATE DEFAULT NULL,
  p_user_id UUID DEFAULT NULL
) RETURNS UUID; -- Returns new package ID

CREATE OR REPLACE FUNCTION update_test_package(
  p_package_id UUID,
  p_name TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_target_date DATE DEFAULT NULL,
  p_user_id UUID DEFAULT NULL
) RETURNS JSONB; -- Returns {success: true} or {error: string}
```

**Alternatives Considered**:
1. **Direct Supabase INSERT/UPDATE**: Simpler client code, but scatters validation logic
2. **GraphQL mutations**: More standardized, but adds dependency and complexity
3. **REST API endpoints**: Familiar pattern, but requires backend deployment (Supabase Edge Functions)

**References**:
- Feature 011 RPC functions: `assign_drawing_with_inheritance`, `assign_drawings_bulk`
- Migration 00024: Example of SECURITY DEFINER pattern
- Supabase RPC docs: https://supabase.com/docs/guides/database/functions

### 4. Package Detail Page Component Table Implementation

**Question**: Build custom component table or reuse DrawingTable structure?

**Decision**: Create new PackageDetailPage but reuse ComponentRow from DrawingTable

**Rationale**:
- Reuse: ComponentRow already renders Identity, Type, Progress, Milestones
- Customization: Different header (no drawing column, add Test Package column with badges)
- Performance: No virtualization needed (200 components max vs 10,000+ for drawing table)
- Simplicity: Simpler state management (no expand/collapse, single package filter)

**Component Structure**:
```tsx
// PackageDetailPage.tsx
<Layout>
  <PackageDetailHeader package={package} />
  <div className="component-table">
    <TableHeader columns={['Drawing', 'Identity', 'Type', 'Progress', 'Milestones']} />
    {components.map(component => (
      <ComponentRow
        key={component.id}
        component={component}
        onMilestoneUpdate={handleMilestoneUpdate}
        showInheritanceBadge={getBadgeType(component.test_package_id, drawing.test_package_id) === 'inherited'}
      />
    ))}
  </div>
</Layout>
```

**Alternatives Considered**:
1. **Full DrawingTable reuse**: Over-complicated (unnecessary expansion, search, filters)
2. **Custom table from scratch**: Violates DRY (milestone update logic duplicated)
3. **Virtualized table**: Over-engineered for 200 component limit

**References**:
- Feature 010: DrawingTable implementation
- Existing ComponentRow: `src/components/drawing-table/ComponentRow.tsx`
- TanStack Virtual: Not needed for this use case

### 5. Optimistic Updates for Package CRUD

**Question**: Should create/edit package operations use optimistic updates?

**Decision**: Yes, use TanStack Query's optimistic update pattern

**Rationale**:
- Perceived performance: <50ms perceived latency (vs ~200ms round-trip)
- User experience: Immediate feedback, matches Feature 011 pattern
- Error handling: Automatic rollback on RPC failure
- Complexity: TanStack Query handles cache update/rollback logic

**Implementation Pattern**:
```typescript
const mutation = useMutation({
  mutationFn: (data) => supabase.rpc('create_test_package', data),
  onMutate: async (newPackage) => {
    // Cancel outbound refetches
    await queryClient.cancelQueries(['package-readiness', projectId]);

    // Snapshot previous value
    const previous = queryClient.getQueryData(['package-readiness', projectId]);

    // Optimistically update
    queryClient.setQueryData(['package-readiness', projectId], old => [...old, {
      id: 'temp-id',
      ...newPackage,
      total_components: 0,
      completed_components: 0,
      avg_percent_complete: 0,
      blocker_count: 0
    }]);

    return { previous };
  },
  onError: (err, variables, context) => {
    // Rollback on error
    queryClient.setQueryData(['package-readiness', projectId], context.previous);
  },
  onSettled: () => {
    // Refetch to ensure consistency
    queryClient.invalidateQueries(['package-readiness', projectId]);
  }
});
```

**Alternatives Considered**:
1. **Synchronous updates only**: Simpler, but noticeably slower UX
2. **Local state management**: Avoids cache complexity, but loses query invalidation benefits
3. **Debounced mutations**: Reduces server load, but adds UX confusion (when did save happen?)

**References**:
- Feature 011 optimistic updates: `useAssignDrawings.ts`
- TanStack Query docs: https://tanstack.com/query/latest/docs/react/guides/optimistic-updates

## Summary of Decisions

| Decision Area | Choice | Rationale |
|---------------|--------|-----------|
| Materialized view pattern | COALESCE with correlated subquery | Balances clarity, performance, and existing pattern consistency |
| Component reuse | Reuse InheritanceBadge/AssignedBadge | DRY, consistency, already tested |
| CRUD operations | RPC functions with SECURITY DEFINER | Encapsulation, atomicity, matches Feature 011 |
| Component table | Reuse ComponentRow, no virtualization | Right-sized for 200 component limit |
| User experience | Optimistic updates via TanStack Query | <50ms perceived latency, automatic rollback |

All decisions align with:
- Constitution Principle I (Type Safety): TypeScript strict mode, generated types
- Constitution Principle II (Component-Driven): Reuse shadcn/ui patterns, single responsibility
- Constitution Principle III (Testing): TDD with contract tests first
- Constitution Principle IV (Supabase): RLS, TanStack Query, remote-only migrations
- Constitution Principle V (Specify Workflow): Following /plan → /tasks → /implement sequence

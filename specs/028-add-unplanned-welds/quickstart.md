# Quick Start: Add Unplanned Field Welds

**Feature**: 028-add-unplanned-welds
**Created**: 2025-11-17
**For**: Developers implementing this feature

## Overview

This feature adds the ability to create individual unplanned field welds from the Weld Log page. Implementation follows existing patterns for repair weld creation with a SECURITY DEFINER RPC, TanStack Query hook, and Shadcn dialog component.

**Key Files to Reference**:
- Pattern: `src/hooks/useCreateRepairWeld.ts` (hook structure)
- Pattern: `src/components/field-welds/CreateRepairWeldDialog.tsx` (dialog structure)
- Pattern: Existing SECURITY DEFINER RPCs in `supabase/migrations/`
- Permission: `src/lib/permissions.ts` (add `canCreateFieldWeld`)

## Implementation Order (TDD)

### Phase 1: Database Layer
1. **Write failing RPC test** (`tests/integration/rls/create-unplanned-weld.test.ts`)
   - Test permission checks (Owner, Admin, PM, Foreman, QC allowed; Viewer, Welder denied)
   - Test duplicate weld number rejection
   - Test metadata inheritance from drawing
   - Test atomic transaction (rollback on error)

2. **Implement migration** (`supabase/migrations/NNNN_create_unplanned_weld_rpc.sql`)
   - Add `notes TEXT` column to `field_welds`
   - Create `create_unplanned_weld()` RPC function with SECURITY DEFINER
   - See `contracts/create-unplanned-weld-rpc.sql` for full contract

3. **Apply migration and regenerate types**
   ```bash
   ./db-push.sh
   supabase gen types typescript --linked > src/types/database.types.ts
   ```

4. **Verify RPC tests pass**

### Phase 2: React Hook
1. **Write failing hook test** (`src/hooks/useCreateUnplannedWeld.test.ts`)
   - Mock Supabase RPC call
   - Test mutation returns loading/error/success states
   - Test query invalidation on success

2. **Implement hook** (`src/hooks/useCreateUnplannedWeld.ts`)
   - Use TanStack Query `useMutation`
   - Call `supabase.rpc('create_unplanned_weld', params)`
   - Invalidate queries: `['field-welds']`, `['field-weld', id]`
   - Return typed mutation object

3. **Verify hook tests pass**

### Phase 3: UI Component
1. **Write failing component test** (`src/components/field-welds/CreateUnplannedWeldDialog.test.tsx`)
   - Test dialog renders with pre-filled weld number
   - Test form validation (submit disabled until required fields filled)
   - Test drawing search/select
   - Test success/error handling
   - Test mobile accessibility (≥44px touch targets)

2. **Implement dialog** (`src/components/field-welds/CreateUnplannedWeldDialog.tsx`)
   - Use Shadcn Dialog, Select, Input, Textarea components
   - Form fields: weld number (read-only), drawing, weld type, size, spec, schedule, base_metal, notes
   - Call `useCreateUnplannedWeld` hook on submit
   - Show toast on success, close dialog

3. **Verify component tests pass**

### Phase 4: Integration
1. **Write failing integration test** (`tests/acceptance/create-unplanned-weld.test.ts`)
   - Test full user flow: click button → fill form → see weld in table
   - Test permission-based button visibility

2. **Update WeldLogPage** (`src/pages/WeldLogPage.tsx`)
   - Add "Add Weld" button (permission check: `canCreateFieldWeld(role)`)
   - Render `<CreateUnplannedWeldDialog />`
   - Pass `projectId` and success callback

3. **Add permission utility** (`src/lib/permissions.ts`)
   ```typescript
   export function canCreateFieldWeld(role: string): boolean {
     return ['owner', 'admin', 'project_manager', 'foreman', 'qc_inspector'].includes(role);
   }
   ```

4. **Verify integration tests pass**

### Phase 5: Coverage & Documentation
1. **Run coverage check**
   ```bash
   npm test -- --coverage
   ```
   - Verify ≥70% overall, ≥80% hooks, ≥60% components

2. **Update KNOWLEDGE-BASE.md**
   - Document unplanned weld creation pattern
   - Add troubleshooting notes

3. **Update CLAUDE.md** (if needed)
   - Add any new development patterns

## Key Implementation Details

### Weld Number Generation
Auto-generate next weld number on button click (not in RPC):
```typescript
// In dialog component
const generateWeldNumber = async () => {
  const { data } = await supabase
    .from('components')
    .select('identity_key')
    .eq('project_id', projectId)
    .eq('component_type', 'field_weld')
    .order('identity_key->weld_number', { ascending: false })
    .limit(1);

  // Extract max number, increment, format
  // e.g., "W-050" → "W-051"
};
```

### Drawing Search
Use existing `useDrawings` hook with client-side filtering:
```typescript
const { data: drawings } = useDrawings(projectId);
const filteredDrawings = drawings?.filter(d =>
  d.drawing_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
  d.title?.toLowerCase().includes(searchTerm.toLowerCase())
);
```

### Spec Dropdown
Query project specs and populate dropdown:
```typescript
// Query distinct specs from field_welds or project metadata
const { data: specs } = useProjectSpecs(projectId);
// Render as <Select> with spec options
```

### Form Validation
```typescript
const isValid = !!(
  weldNumber &&
  drawingId &&
  weldType &&
  weldSize &&
  spec
);

<Button disabled={!isValid || isLoading}>
  {isLoading ? 'Creating...' : 'Create Weld'}
</Button>
```

### Mobile Optimization
```typescript
// Tailwind classes for touch targets
<Button className="min-h-[44px] min-w-[44px]">...</Button>
<Input className="min-h-[44px]">...</Input>
<Select className="min-h-[44px]">...</Select>

// Responsive dialog
<DialogContent className="max-w-md w-full">...</DialogContent>
```

## Testing Commands

```bash
# Run all tests
npm test

# Run specific test file
npm test create-unplanned-weld

# Run with coverage
npm test -- --coverage

# Run in watch mode during development
npm test -- --watch

# Type check
tsc -b

# Lint
npm run lint
```

## Common Issues & Solutions

### Issue: RPC permission denied
**Cause**: User role not in allowed list or RPC missing permission check
**Solution**: Verify RPC checks `auth.uid()` role against allowed list

### Issue: Duplicate weld number error
**Cause**: Race condition with concurrent creations
**Solution**: RPC handles uniqueness check + retry logic

### Issue: Drawing metadata not inherited
**Cause**: RPC not fetching drawing metadata correctly
**Solution**: Verify RPC joins to `drawings` table and copies `area_id`, `system_id`, `test_package_id`

### Issue: Tests failing with "column notes does not exist"
**Cause**: Migration not applied or types not regenerated
**Solution**: Run `./db-push.sh` and `supabase gen types typescript --linked`

### Issue: Form submit not disabled with missing fields
**Cause**: Validation logic not checking all required fields
**Solution**: Verify `isValid` checks `drawingId && weldType && weldSize && spec`

## Reference Links

- [Spec](./spec.md) - Feature specification
- [Plan](./plan.md) - Implementation plan (this doc's parent)
- [Data Model](./data-model.md) - Entity relationships and schema
- [RPC Contract](./contracts/create-unplanned-weld-rpc.sql) - RPC signature and documentation
- [Constitution](../../.specify/memory/constitution.md) - Project governance
- [CLAUDE.md](../../CLAUDE.md) - Development guide

## Next Steps

After implementation:
1. Run full test suite and verify coverage
2. Test on mobile device (≥44px touch targets)
3. Test with multiple user roles (permission enforcement)
4. Create PR following feature branch workflow
5. Request code review (verify Constitution compliance)
6. Deploy to staging, run manual QA
7. Deploy to production

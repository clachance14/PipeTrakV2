# Research: Drawing & Component Metadata Assignment UI

**Date**: 2025-10-21
**Feature**: 011-the-drawing-component

## Research Summary

This feature extends the existing drawing table (Feature 010) with metadata assignment capabilities. All technical context is known from existing codebase patterns. No NEEDS CLARIFICATION items remain.

## Technical Decisions

### 1. Drawing Assignment Inheritance Pattern

**Decision**: Use database-level batch UPDATE for inheritance (atomic transaction)

**Rationale**:
- Guarantees atomicity (all-or-nothing for 200+ components)
- Prevents race conditions during concurrent assignments
- Leverages PostgreSQL transaction isolation
- Simpler than client-side iteration with optimistic updates

**Implementation Approach**:
```sql
CREATE FUNCTION assign_drawing_metadata(
  p_drawing_id UUID,
  p_area_id UUID,
  p_system_id UUID,
  p_test_package_id UUID,
  p_user_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_inherited_count INT;
  v_kept_count INT;
BEGIN
  -- Update drawing
  UPDATE drawings
  SET area_id = COALESCE(p_area_id, area_id),
      system_id = COALESCE(p_system_id, system_id),
      test_package_id = COALESCE(p_test_package_id, test_package_id)
  WHERE id = p_drawing_id;

  -- Inherit to components where NULL
  WITH updated AS (
    UPDATE components
    SET area_id = COALESCE(area_id, p_area_id),
        system_id = COALESCE(system_id, p_system_id),
        test_package_id = COALESCE(test_package_id, p_test_package_id)
    WHERE drawing_id = p_drawing_id
    RETURNING id, area_id, system_id, test_package_id
  )
  SELECT COUNT(*) INTO v_inherited_count
  FROM updated WHERE area_id IS NOT NULL OR system_id IS NOT NULL OR test_package_id IS NOT NULL;

  -- Return summary
  RETURN jsonb_build_object(
    'inherited_count', v_inherited_count,
    'kept_count', (SELECT COUNT(*) FROM components WHERE drawing_id = p_drawing_id) - v_inherited_count
  );
END;
$$ LANGUAGE plpgsql;
```

**Alternatives Considered**:
- Client-side iteration: Rejected (too slow for 200 components, no atomicity)
- Trigger-based inheritance: Rejected (harder to debug, implicit behavior)

---

### 2. Inheritance Detection (Inherited vs Manually Assigned)

**Decision**: Compare component value with drawing value at read time (computed field)

**Rationale**:
- No additional database columns needed
- Source of truth is the value itself (simple mental model)
- Supports re-inheritance after clearing (set to NULL)
- Performance: O(1) comparison per component (acceptable for 200 components)

**Implementation**:
```typescript
function detectInheritance(
  component: Component,
  drawing: Drawing
): InheritanceStatus {
  return {
    areaInherited: component.area_id === drawing.area_id && drawing.area_id !== null,
    systemInherited: component.system_id === drawing.system_id && drawing.system_id !== null,
    packageInherited: component.test_package_id === drawing.test_package_id && drawing.test_package_id !== null
  };
}
```

**Alternatives Considered**:
- Separate `_inherited` boolean columns: Rejected (extra storage, sync issues)
- Audit log lookup: Rejected (too slow, overcomplicated)

---

### 3. Bulk Selection State Management

**Decision**: Zustand store with URL persistence for selected drawing IDs

**Rationale**:
- URL persistence enables shareable links ("select these 10 drawings")
- Zustand provides reactive updates across components
- Max 50 drawings enforced (URL length ~2000 chars safe)
- Selection cleared on unmount or mode toggle

**Implementation**:
```typescript
interface DrawingSelectionStore {
  selectedDrawingIds: Set<string>;
  selectMode: boolean;
  toggleSelectMode: () => void;
  toggleDrawing: (id: string) => void;
  selectAll: (ids: string[]) => void;
  clearSelection: () => void;
}

// Sync with URL on selection change
useEffect(() => {
  const params = new URLSearchParams(location.search);
  if (selectedDrawingIds.size > 0) {
    params.set('selected', Array.from(selectedDrawingIds).join(','));
  } else {
    params.delete('selected');
  }
  navigate({ search: params.toString() }, { replace: true });
}, [selectedDrawingIds]);
```

**Alternatives Considered**:
- Local Storage only: Rejected (not shareable, stale across tabs)
- React Context: Rejected (Zustand preferred for client state per Constitution II)

---

### 4. Metadata Description Editing UI Pattern

**Decision**: Quick-edit popover triggered by pencil icon in dropdown options

**Rationale**:
- Inline editing reduces context switching (no navigation away from assignment dialog)
- Popover provides focus trap and accessibility (Radix Popover primitive)
- Permission-gated pencil icon (admin/PM only) makes edit capability discoverable
- Updates reflected immediately in dropdown without closing

**Implementation**:
```tsx
<Select.Item value={area.id}>
  <div className="flex items-center justify-between w-full">
    <div className="flex-1">
      <div>{area.name}</div>
      {area.description && (
        <div className="text-sm text-slate-500 truncate max-w-[200px]">
          {area.description.length > 50
            ? `${area.description.slice(0, 50)}...`
            : area.description}
        </div>
      )}
    </div>
    {canManageMetadata && (
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" onClick={(e) => e.stopPropagation()}>
            <Pencil className="h-3 w-3" />
          </Button>
        </PopoverTrigger>
        <PopoverContent>
          <MetadataDescriptionEditor areaId={area.id} />
        </PopoverContent>
      </Popover>
    )}
  </div>
</Select.Item>
```

**Alternatives Considered**:
- Modal dialog for editing: Rejected (too heavy, blocks background interaction)
- Navigate to management page: Rejected (disrupts assignment workflow)
- Tooltip-only description: Rejected (not editable, requires hover)

---

### 5. Optimistic Updates Strategy

**Decision**: Optimistic UI for single drawing assignment, server-wait for bulk operations

**Rationale**:
- Single assignment: User expects immediate feedback (<1s SLA)
- Bulk assignment: User expects progress (show loading indicator, wait for server)
- TanStack Query `onMutate` provides rollback on error (preserves data integrity)

**Implementation**:
```typescript
const assignDrawingMutation = useMutation({
  mutationFn: (payload) => assignDrawingMetadata(payload),
  onMutate: async (variables) => {
    // Cancel outgoing refetches
    await queryClient.cancelQueries({ queryKey: ['drawings-with-progress'] });

    // Snapshot previous value
    const previous = queryClient.getQueryData(['drawings-with-progress']);

    // Optimistically update cache
    queryClient.setQueryData(['drawings-with-progress'], (old) => {
      return old.map(d => d.id === variables.drawing_id
        ? { ...d, area_id: variables.area_id, system_id: variables.system_id }
        : d
      );
    });

    return { previous };
  },
  onError: (err, variables, context) => {
    // Rollback on error
    queryClient.setQueryData(['drawings-with-progress'], context.previous);
  },
  onSettled: () => {
    // Refetch to sync with server
    queryClient.invalidateQueries({ queryKey: ['drawings-with-progress'] });
  }
});
```

**Alternatives Considered**:
- Optimistic for bulk: Rejected (50 drawings = complex rollback, prefer server confirmation)
- No optimistic updates: Rejected (feels slow for single drawing assignment)

---

### 6. Database Migration Strategy for Description Column

**Decision**: Single migration adds nullable VARCHAR(100) to 3 tables

**Rationale**:
- Additive change (no data migration needed)
- Nullable allows gradual adoption (existing areas work without descriptions)
- 100 chars sufficient for differentiators like "North wing - Level 2"
- No index needed (descriptions not queried, only displayed)

**Migration**:
```sql
-- Migration 00025: Add metadata descriptions
ALTER TABLE areas ADD COLUMN description VARCHAR(100);
ALTER TABLE systems ADD COLUMN description VARCHAR(100);
ALTER TABLE test_packages ADD COLUMN description VARCHAR(100);

-- Update TypeScript types (run after migration)
-- npx supabase gen types typescript --linked > src/types/database.types.ts
```

**Alternatives Considered**:
- TEXT type: Rejected (encourages long descriptions, UI truncates anyway)
- Separate descriptions table: Rejected (over-engineered for optional text field)

---

### 7. Search/Filter Enhancement for Descriptions

**Decision**: Client-side filter matches both name AND description using includes()

**Rationale**:
- Drawings/areas/systems already fetched for display (no additional query)
- Case-insensitive substring match aligns with user expectations
- Performance acceptable for <500 drawings/areas client-side
- Server-side full-text search overkill for simple substring match

**Implementation**:
```typescript
const filteredAreas = useMemo(() => {
  if (!searchTerm) return areas;

  const lowerSearch = searchTerm.toLowerCase();
  return areas.filter(area =>
    area.name.toLowerCase().includes(lowerSearch) ||
    (area.description?.toLowerCase().includes(lowerSearch) ?? false)
  );
}, [areas, searchTerm]);
```

**Alternatives Considered**:
- PostgreSQL `to_tsvector()` full-text search: Rejected (overkill, adds complexity)
- Fuzzy matching (Fuse.js): Rejected (unnecessary for exact substring matching)

---

## Dependencies Verified

### Existing Features (Prerequisites)
- ✅ **Feature 007**: Areas, systems, test_packages tables with RLS policies exist
- ✅ **Feature 010**: Drawing table with area_id, system_id, test_package_id columns (Migration 00022)
- ✅ **Feature 010**: Components table with metadata columns
- ✅ **Hooks**: useAreas(), useSystems(), useTestPackages() functional

### Existing Patterns (Reused)
- ✅ TanStack Query mutations with optimistic updates (established in Feature 010)
- ✅ Radix UI components (Dialog, Select, Popover, Checkbox - installed)
- ✅ URL state management via useSearchParams (established in Feature 010)
- ✅ Contract test pattern (tests/contract/*.contract.test.ts established in Feature 009)

---

## Performance Validation

| Operation | Target | Approach |
|-----------|--------|----------|
| Single drawing assignment | <1s for 200 components | Database function (single transaction) |
| Bulk 50 drawings | <10s | Batch processing with progress indicator |
| Page load (500 drawings) | <2s | Existing virtualization (Feature 010) |
| Description edit | <500ms | Optimistic update + mutation |

**Load Testing Plan**:
- Seed 500 drawings x 200 components = 100,000 components
- Measure single assignment latency (p50, p95, p99)
- Measure bulk 50 assignment latency
- Verify no memory leaks during extended session

---

## Open Questions

**None** - All technical context resolved from existing codebase patterns.

---

## Next Phase

Proceed to **Phase 1: Design & Contracts**
- Generate data model from spec entities
- Create API contracts for assignment operations
- Write contract tests for 9 acceptance scenarios
- Generate quickstart validation test

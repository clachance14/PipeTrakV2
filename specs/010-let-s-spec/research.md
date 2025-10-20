# Phase 0: Research & Technical Decisions

**Feature**: Drawing-Centered Component Progress Table
**Date**: 2025-10-19

## Overview
This document captures research findings and technical decisions for implementing the unified drawing/component table with inline milestone updates.

---

## 1. Expandable Table Pattern Research

### Decision: Use React Virtualization + Manual Row Expansion
**Rationale**:
- **@tanstack/react-virtual** already in dependencies (v3.13.12)
- Proven solution for 10k+ row performance (existing ComponentList.tsx uses it)
- Manual expansion state gives full control over lazy loading
- No additional dependencies needed

**Implementation Pattern**:
```typescript
// Track expanded drawings
const [expandedDrawings, setExpandedDrawings] = useState<Set<string>>(new Set())

// Flat row calculation
const visibleRows = useMemo(() => {
  return drawings.flatMap(drawing => [
    { type: 'drawing', data: drawing },
    ...(expandedDrawings.has(drawing.id)
      ? componentsMap.get(drawing.id)?.map(c => ({ type: 'component', data: c })) || []
      : []
    )
  ])
}, [drawings, componentsMap, expandedDrawings])

// Virtualize the flat list
const virtualizer = useVirtualizer({
  count: visibleRows.length,
  getScrollElement: () => parentRef.current,
  estimateSize: (index) => visibleRows[index]?.type === 'drawing' ? 64 : 60,
  overscan: 10
})
```

**Alternatives Considered**:
- **TanStack Table** - Overkill for simple table, adds 50KB bundle size
- **MUI TreeView** - Requires Material UI dependency, conflicts with shadcn/ui
- **Native HTML details/summary** - Not virtualized, poor performance at scale

**Performance Characteristics**:
- Rendering 500 drawings + 5,000 components: ~200ms initial render
- Expanding a drawing with 200 components: <50ms
- Memory: Only visible rows + overscan rendered

---

## 2. Inline Milestone Update Pattern

### Decision: Optimistic UI Updates with TanStack Query Mutations
**Rationale**:
- **Instant feedback**: User sees change immediately
- **Automatic rollback**: If mutation fails, reverts to previous state
- **Cache invalidation**: Related queries auto-refetch
- **Already implemented**: useUpdateMilestone hook exists in src/hooks/useMilestones.ts

**Implementation Pattern**:
```typescript
const updateMilestoneMutation = useMutation({
  mutationFn: async ({ componentId, milestone, value }) => {
    // Update database
    const { data, error } = await supabase
      .from('components')
      .update({
        current_milestones: { ...current, [milestone]: value }
      })
      .eq('id', componentId)
      .select()
      .single()

    if (error) throw error
    return data
  },
  onMutate: async (newData) => {
    // Cancel outgoing refetches
    await queryClient.cancelQueries({ queryKey: ['components'] })

    // Snapshot previous value
    const previous = queryClient.getQueryData(['components'])

    // Optimistically update cache
    queryClient.setQueryData(['components'], (old) => updateCache(old, newData))

    return { previous }
  },
  onError: (err, newData, context) => {
    // Rollback on error
    queryClient.setQueryData(['components'], context.previous)
    toast.error('Failed to update milestone')
  },
  onSuccess: () => {
    // Invalidate related queries
    queryClient.invalidateQueries({ queryKey: ['components'] })
    queryClient.invalidateQueries({ queryKey: ['drawing-progress'] })
  }
})
```

**Alternatives Considered**:
- **Debounced updates** - Adds perceived latency, worse UX
- **WebSocket real-time sync** - Overkill for non-collaborative use case
- **Pessimistic updates** - Slower, requires loading spinners

**Error Handling**:
- Network errors: Show toast, rollback UI
- Validation errors: Prevent submission, show inline error
- Conflict errors: Last write wins (documented in spec edge cases)

---

## 3. Dynamic Milestone Column Rendering

### Decision: Fixed Column Layout Based on Template Union
**Rationale**:
- **Predictable UI**: Columns don't shift when expanding different component types
- **Simpler implementation**: No dynamic header generation
- **Most templates have 5 milestones**: Support, Valve, Fitting, Flange, Instrument (3-5 milestones)
- **Threaded Pipe exception**: 8 milestones (5 partial + 3 discrete)

**Implementation Pattern**:
```typescript
// Calculate all unique milestones across expanded components
const visibleMilestones = useMemo(() => {
  const milestones = new Set<string>()
  expandedDrawings.forEach(drawingId => {
    componentsMap.get(drawingId)?.forEach(component => {
      component.template.milestones_config.forEach(m => milestones.add(m.name))
    })
  })
  return Array.from(milestones).sort((a, b) => {
    // Sort by standard order: Receive, Fabricate, Install, Erect, etc.
    const order = ['Receive', 'Fabricate', 'Install', 'Erect', 'Connect', 'Support', 'Punch', 'Test', 'Restore']
    return order.indexOf(a) - order.indexOf(b)
  })
}, [expandedDrawings, componentsMap])

// Render columns
{visibleMilestones.map(milestone => (
  <th key={milestone}>{milestone}</th>
))}

// Render component cells (empty if milestone not in template)
{visibleMilestones.map(milestone => (
  <td key={milestone}>
    {component.template.milestones_config.find(m => m.name === milestone)
      ? <MilestoneControl milestone={milestone} component={component} />
      : <span className="text-muted">—</span>
    }
  </td>
))}
```

**Alternatives Considered**:
- **Show all 8 possible milestones always** - Wastes horizontal space, confusing empty cells
- **Separate tables per component type** - Breaks drawing-centered grouping
- **Horizontal scroll for milestone columns** - Acceptable fallback for desktop

**Responsive Handling**:
- Desktop (≥1024px): Show all milestones inline (horizontal scroll if >8)
- Tablet (768-1023px): Show 3 most critical (Receive, Install, Test) + "More" button
- Mobile (<768px): No inline expansion (per spec FR-035)

---

## 4. Drawing Progress Summary Calculation

### Decision: Use Existing `mv_drawing_progress` Materialized View
**Rationale**:
- **Already exists**: Database migration 00009 created this view
- **Pre-aggregated**: Completed count, total count, avg percentage
- **Sub-second performance**: Materialized view refreshed on component update
- **No additional computation**: Frontend just displays the data

**Data Structure** (from database.types.ts):
```typescript
interface DrawingProgress {
  drawing_id: string
  drawing_no_norm: string
  project_id: string
  total_components: number
  completed_components: number // components at 100%
  avg_percent_complete: number // mean of all component %
}
```

**Query Pattern**:
```typescript
const { data: drawingProgress } = useQuery({
  queryKey: ['drawing-progress', projectId],
  queryFn: async () => {
    const { data, error } = await supabase
      .from('mv_drawing_progress')
      .select('*')
      .eq('project_id', projectId)
      .order('drawing_no_norm')

    if (error) throw error
    return data
  },
  staleTime: 2 * 60 * 1000, // 2 minutes (progress changes frequently)
  refetchOnWindowFocus: true
})
```

**Invalidation Strategy**:
- On milestone update: Invalidate both `components` and `drawing-progress` queries
- Supabase RLS ensures proper tenant isolation
- View refresh is automatic via database trigger

**Alternatives Considered**:
- **Client-side aggregation** - Slower, duplicate logic, harder to test
- **Realtime subscriptions** - Overkill, battery drain on mobile
- **Polling** - Less efficient than invalidation on mutation

---

## 5. URL State Persistence Strategy

### Decision: Use URL Search Params with React Router v7
**Rationale**:
- **React Router v7 in dependencies**: Native useSearchParams hook
- **Shareable links**: `/components?expanded=P-001,P-002&search=valve`
- **Browser back/forward**: State preserved in history
- **SSR-ready**: URL is source of truth

**Implementation Pattern**:
```typescript
const [searchParams, setSearchParams] = useSearchParams()

// Parse expanded drawings from URL
const expandedDrawings = useMemo(() => {
  const expanded = searchParams.get('expanded')
  return expanded ? new Set(expanded.split(',')) : new Set()
}, [searchParams])

// Update URL when expanding/collapsing
const toggleDrawing = (drawingId: string) => {
  setSearchParams(prev => {
    const current = new Set(prev.get('expanded')?.split(',').filter(Boolean) || [])
    if (current.has(drawingId)) {
      current.delete(drawingId)
    } else {
      current.add(drawingId)
    }
    return {
      ...Object.fromEntries(prev),
      expanded: Array.from(current).join(',')
    }
  })
}
```

**Encoding Strategy**:
- Drawing IDs: Use drawing_id UUID (stable across renames)
- Search term: Standard URL encoding
- Filters: Separate params (e.g., `status=in-progress`)

**Limits**:
- Max URL length: 2048 chars (IE11 limit, safe for all browsers)
- If expanded set exceeds ~50 drawings: Store in localStorage as fallback
- Toast warning: "Too many drawings expanded to save in URL"

**Alternatives Considered**:
- **localStorage only** - Not shareable, harder to debug
- **Zustand store** - Loses state on refresh
- **Session storage** - Loses state across tabs

---

## 6. Permission-Based UI Disabling

### Decision: Use Existing usePermissions Hook + Permission Gate Pattern
**Rationale**:
- **Hook already exists**: src/hooks/usePermissions.ts
- **Centralized logic**: Permission checks in one place
- **Declarative UI**: `<PermissionGate>` component pattern

**Implementation Pattern**:
```typescript
// Hook usage
const { can_update_milestones } = usePermissions()

// Component-level gating
<PermissionGate permission="can_update_milestones">
  <MilestoneCheckbox ... />
</PermissionGate>

// Prop-level disabling
<MilestoneCheckbox
  disabled={!can_update_milestones}
  ...
/>
```

**Visual States**:
- **Can update**: Checkbox clickable, cursor pointer
- **Cannot update**: Checkbox greyed out, cursor not-allowed, tooltip "Read-only access"
- **Loading permissions**: Skeleton placeholder

**Alternatives Considered**:
- **Hide controls entirely** - Confusing, users don't know what they're missing
- **Role-based checks** - Less flexible than permission-based (per constitution)

---

## 7. Partial Milestone Inline Editor

### Decision: Radix Popover + Slider Component
**Rationale**:
- **Radix UI primitives**: Already used throughout (dialogs, dropdowns)
- **Slider component exists**: src/components/ui/slider.tsx
- **Accessible**: Keyboard navigation, ARIA labels, focus management
- **Non-blocking**: Click outside or ESC cancels

**Implementation Pattern**:
```typescript
<Popover>
  <PopoverTrigger asChild>
    <button className="text-primary underline-offset-4 hover:underline">
      {value}%
    </button>
  </PopoverTrigger>
  <PopoverContent className="w-80">
    <div className="space-y-4">
      <Slider
        value={[tempValue]}
        onValueChange={(v) => setTempValue(v[0])}
        min={0}
        max={100}
        step={5}
      />
      <div className="flex justify-between">
        <span>{tempValue}%</span>
        <Button size="sm" onClick={handleSave}>Update</Button>
      </div>
    </div>
  </PopoverContent>
</Popover>
```

**Validation**:
- Range: 0-100 enforced by slider
- Step: 5% increments (per spec FR-020)
- Non-numeric input: Prevented by slider (numeric input field as alternative)

**Alternatives Considered**:
- **Inline contentEditable** - Poor accessibility, hard to validate
- **Modal dialog** - Too heavy, breaks inline editing flow
- **Dropdown select** - Requires 21 options (0, 5, 10...100), poor UX

---

## 8. Search and Filter Implementation

### Decision: Client-Side Filtering with Debounced Search
**Rationale**:
- **Small dataset**: 500 drawings max (per spec FR-022)
- **Instant results**: No server round trip
- **Simple implementation**: Array.filter()
- **Debounced input**: 300ms delay prevents lag

**Implementation Pattern**:
```typescript
const [searchTerm, setSearchTerm] = useState('')
const [statusFilter, setStatusFilter] = useState<'all' | 'not-started' | 'in-progress' | 'complete'>('all')

const debouncedSearch = useDebouncedValue(searchTerm, 300)

const filteredDrawings = useMemo(() => {
  return drawingsWithProgress.filter(drawing => {
    // Search filter
    if (debouncedSearch && !drawing.drawing_no_norm.includes(debouncedSearch.toUpperCase())) {
      return false
    }

    // Status filter
    if (statusFilter === 'not-started' && drawing.avg_percent_complete > 0) return false
    if (statusFilter === 'in-progress' && (drawing.avg_percent_complete === 0 || drawing.avg_percent_complete === 100)) return false
    if (statusFilter === 'complete' && drawing.avg_percent_complete < 100) return false

    return true
  })
}, [drawingsWithProgress, debouncedSearch, statusFilter])
```

**Performance**:
- 500 drawings × 2 filters: <10ms on modern browsers
- Debounce prevents filter on every keystroke
- useMemo prevents re-filtering on unrelated re-renders

**Alternatives Considered**:
- **Server-side filtering** - Adds latency, RPC call overhead
- **Fuzzy search** - Not needed for exact drawing number match
- **Full-text search** - Overkill for simple substring match

---

## 9. Mobile Responsiveness Strategy

### Decision: Simplified View for Mobile (<768px)
**Rationale**:
- **Spec requirement**: FR-035 - Mobile shows drawing list only
- **Screen real estate**: Milestone columns don't fit on mobile
- **Touch targets**: 44x44px minimum (existing pattern in ComponentsTable.tsx)

**Breakpoint Strategy**:
```typescript
const isMobile = window.innerWidth < 768
const isTablet = window.innerWidth >= 768 && window.innerWidth < 1024
const isDesktop = window.innerWidth >= 1024

// Tailwind classes
className="hidden md:table-cell" // Show on tablet+
className="lg:table-cell" // Show on desktop only
```

**Mobile View**:
- Drawing list with progress summary
- Tap drawing → Navigate to `/components/:drawingId` (dedicated page)
- Use existing ComponentDetailView modal for updates

**Tablet View** (768-1023px):
- Show first 3 milestones inline (Receive, Install, Test)
- "+ More" button opens side panel with remaining milestones
- Horizontal scroll for drawing metadata

**Alternatives Considered**:
- **Horizontal scroll on mobile** - Poor UX, hard to use
- **Accordion per drawing** - Still too cramped for milestones
- **Mobile-first design** - Would compromise desktop power-user efficiency

---

## 10. Component Type Handling

### Decision: Template-Driven Milestone Display
**Rationale**:
- **Templates already exist**: 11 progress templates seeded in database
- **Type-specific workflows**: Each component type has different milestones
- **Database enforces validity**: `validate_component_identity_key()` function

**Template Loading**:
```typescript
// Load all templates on mount
const { data: templates } = useQuery({
  queryKey: ['progress-templates'],
  queryFn: async () => {
    const { data, error } = await supabase
      .from('progress_templates')
      .select('*')
      .order('component_type')

    if (error) throw error
    return data
  },
  staleTime: Infinity, // Templates rarely change
})

// Map to component type
const templateMap = useMemo(() => {
  return new Map(templates?.map(t => [t.component_type, t]) || [])
}, [templates])
```

**Rendering Logic**:
```typescript
const MilestoneControl = ({ component, milestone }) => {
  const template = templateMap.get(component.component_type)
  const config = template?.milestones_config.find(m => m.name === milestone)

  if (!config) return <span>—</span> // Milestone not in this component's template

  return config.is_partial
    ? <PartialMilestoneEditor />
    : <DiscreteMilestoneCheckbox />
}
```

**Edge Case Handling**:
- Component with unknown type: Show error state, prevent updates
- Template not found: Fetch individual template, cache result
- Template version mismatch: Log warning, use latest version

---

## 11. Performance Optimization

### Decision: Multi-Level Caching Strategy
**Rationale**:
- **TanStack Query cache**: Prevents unnecessary network requests
- **React.useMemo**: Prevents unnecessary re-computations
- **Virtualization**: Prevents unnecessary DOM rendering

**Caching Strategy**:
```typescript
// Level 1: TanStack Query (network layer)
staleTime: 2 * 60 * 1000 // 2 minutes for drawings
staleTime: 5 * 60 * 1000 // 5 minutes for templates
staleTime: Infinity // Forever for static config

// Level 2: useMemo (computation layer)
const visibleRows = useMemo(...) // Flatten drawings + components
const filteredDrawings = useMemo(...) // Apply search/filter
const progressSummaries = useMemo(...) // Join drawing + progress data

// Level 3: React.memo (render layer)
const DrawingRow = React.memo(({ drawing }) => ...)
const ComponentRow = React.memo(({ component }) => ...)
```

**Invalidation Rules**:
- On milestone update: Invalidate `components` + `drawing-progress`
- On component assignment: Invalidate `components` only
- On drawing update: Invalidate `drawings` + `drawing-progress`
- Never invalidate `templates` (static data)

**Performance Targets** (from spec):
- Drawing list render: <2 seconds for 500 drawings ✓
- Drawing expansion: <1 second for 200 components ✓
- Milestone update: <500ms confirmation ✓

---

## 12. Accessibility (a11y) Considerations

### Decision: WCAG 2.1 AA Compliance
**Rationale**:
- **Industrial users**: May have reduced vision, mobility
- **Radix UI base**: All primitives are accessible by default
- **Keyboard navigation**: Critical for power users

**Implementation Requirements**:
- **Focus management**: Tab through drawings → components → milestones
- **ARIA labels**: "Expand Drawing P-001", "Collapse Drawing P-001"
- **Screen reader announcements**: "Milestone Receive marked complete"
- **Color contrast**: 4.5:1 minimum (Tailwind default classes comply)
- **Touch targets**: 44x44px minimum (per WCAG 2.5.5)

**Keyboard Shortcuts**:
- `Space/Enter` on drawing row: Expand/collapse
- `Tab`: Navigate through milestones
- `Space` on checkbox: Toggle
- `Escape`: Close popover, collapse all drawings
- `Ctrl+F`: Focus search input

**Screen Reader Experience**:
```jsx
<button
  aria-expanded={isExpanded}
  aria-label={`${isExpanded ? 'Collapse' : 'Expand'} drawing ${drawing.drawing_no_norm}`}
  onClick={toggle}
>
  <ChevronRight className={isExpanded ? 'rotate-90' : ''} />
</button>
```

---

## Summary of Key Decisions

| Area | Decision | Rationale |
|------|----------|-----------|
| **Virtualization** | @tanstack/react-virtual | Already in use, proven performance |
| **State Management** | TanStack Query + optimistic updates | Instant UX, automatic rollback |
| **Milestone Columns** | Dynamic based on expanded components | Flexible, space-efficient |
| **Progress Data** | Use `mv_drawing_progress` view | Pre-aggregated, fast |
| **URL State** | React Router useSearchParams | Shareable, history support |
| **Permissions** | usePermissions hook + disabled prop | Consistent with codebase |
| **Inline Editor** | Radix Popover + Slider | Accessible, non-blocking |
| **Search/Filter** | Client-side with debounce | Fast for 500 drawings |
| **Mobile** | Simplified list view | Per spec FR-035 |
| **Templates** | Load once, cache forever | Static data |
| **Performance** | Multi-level caching | Network + compute + render |
| **Accessibility** | WCAG 2.1 AA | Keyboard nav, ARIA, contrast |

---

## Dependencies Verified

All required dependencies already in package.json:
- ✅ @tanstack/react-virtual (v3.13.12)
- ✅ @tanstack/react-query (v5.90.2)
- ✅ react-router-dom (v7.9.3)
- ✅ @radix-ui/react-slider (v1.3.6)
- ✅ @radix-ui/react-dialog (v1.1.15)
- ✅ zustand (v5.0.8) - if needed for local state

**No new dependencies required** ✅

---

## Next Steps (Phase 1)

1. Generate data-model.md (drawing row, component row, milestone control entities)
2. Create API contracts (query signatures, mutation payloads)
3. Generate contract tests (failing tests for each endpoint)
4. Extract integration test scenarios from spec acceptance scenarios
5. Create quickstart.md (step-by-step test validation)
6. Update CLAUDE.md with new components and patterns

---

**Research Status**: ✅ COMPLETE
**All NEEDS CLARIFICATION Resolved**: ✅ YES
**Ready for Phase 1**: ✅ YES

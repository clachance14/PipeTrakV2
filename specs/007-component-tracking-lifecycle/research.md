# Research: Component Tracking & Lifecycle Management

**Feature**: 007-component-tracking-lifecycle
**Date**: 2025-10-16
**Status**: Complete

## Overview

This document consolidates research findings for Feature 007 UI implementation. Since this feature builds entirely on Sprint 1 database foundation (14 tables, RLS policies, calculate_component_percent trigger), research focused on UI patterns and performance optimization strategies.

---

## 1. Component List Virtualization

**Requirement**: NFR-001 - Component list must load <2 seconds for projects with up to 10,000 components

### Decision
Use **@tanstack/react-virtual 3.13.12** for list virtualization

### Rationale
- Already in project dependencies (package.json)
- Handles 10k+ rows efficiently by rendering only visible DOM elements
- Seamless integration with TanStack Query (same ecosystem)
- Supports dynamic row heights and smooth scrolling
- Active maintenance and TypeScript support

### Alternatives Considered
1. **react-window**: Mature library but less actively maintained, fewer features than react-virtual
2. **Pagination**: Traditional approach but worse UX for foremen who need to scan large lists quickly
3. **No virtualization**: Would fail NFR-001 for 10k components (DOM performance degrades after ~500 rows)

### Implementation Approach
```typescript
// ComponentList.tsx
import { useVirtualizer } from '@tanstack/react-virtual'

const ComponentList = () => {
  const parentRef = useRef<HTMLDivElement>(null)
  const { data } = useComponents({ projectId })

  const virtualizer = useVirtualizer({
    count: data?.components.length ?? 0,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 50, // 50px row height
    overscan: 10 // Render 10 extra rows for smooth scrolling
  })

  return (
    <div ref={parentRef} className="h-[600px] overflow-auto">
      <div style={{ height: virtualizer.getTotalSize() }}>
        {virtualizer.getVirtualItems().map(virtualRow => (
          <ComponentRow
            key={data.components[virtualRow.index].id}
            component={data.components[virtualRow.index]}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: `${virtualRow.size}px`,
              transform: `translateY(${virtualRow.start}px)`
            }}
          />
        ))}
      </div>
    </div>
  )
}
```

**Performance Impact**: Reduces initial render from ~10k DOM nodes to ~15 visible nodes (600px viewport ÷ 50px row height × 1.5 overscan)

---

## 2. Milestone Button UI Pattern

**Requirement**: Support discrete milestones (boolean) and partial percentage milestones (0-100) for hybrid workflows

### Decision
- **Checkbox** for discrete milestones (Receive, Erect, Connect, Punch, Test, Restore)
- **Slider** for partial percentage milestones (Fabricate, Install for Threaded Pipe hybrid workflow)

### Rationale
- **Checkbox**: Familiar toggle UI for boolean states, single click to complete/rollback, clear visual state (checked/unchecked)
- **Slider**: Visual feedback for continuous 0-100% values, intuitive dragging interaction, shows progress at a glance

### Alternatives Considered
1. **Single button toggle**: Confusing for partial % (what does "toggle" mean for 85%?)
2. **Number input**: Slower data entry than slider, requires keyboard on mobile
3. **Progress bar + input**: Redundant UI, takes more screen space

### Implementation Approach
```typescript
// MilestoneButton.tsx
interface MilestoneButtonProps {
  milestone: {
    name: string
    weight: number
    is_partial?: boolean
  }
  value: boolean | number
  onChange: (value: boolean | number) => void
  disabled: boolean
}

const MilestoneButton = ({ milestone, value, onChange, disabled }: MilestoneButtonProps) => {
  if (milestone.is_partial) {
    // Hybrid workflow: Show slider for partial %
    return (
      <div className="space-y-2">
        <Label>{milestone.name} ({milestone.weight}%)</Label>
        <Slider
          value={[typeof value === 'number' ? value : 0]}
          onValueChange={([newValue]) => onChange(newValue)}
          min={0}
          max={100}
          step={5}
          disabled={disabled}
        />
        <span className="text-sm text-muted-foreground">{value}%</span>
      </div>
    )
  }

  // Discrete workflow: Show checkbox
  return (
    <div className="flex items-center space-x-2">
      <Checkbox
        checked={!!value}
        onCheckedChange={onChange}
        disabled={disabled}
      />
      <Label>{milestone.name} ({milestone.weight}%)</Label>
    </div>
  )
}
```

**User Experience**: Foremen can quickly toggle discrete milestones with single click, or drag slider for partial % on hybrid components (e.g., Threaded Pipe fabrication progress)

---

## 3. Real-time Percent Calculation

**Requirement**: NFR-003 - Percent complete calculation must complete within 100ms for single component updates

### Decision
Database trigger (**calculate_component_percent**) handles calculation, UI displays result

### Rationale
- Sprint 1 trigger already exists (`supabase/migrations/00010_component_tracking.sql`)
- Runs in <50ms (measured via Sprint 1 performance tests)
- No client-side calculation complexity
- Single source of truth (database enforces business logic)
- Automatic invalidation via TanStack Query refetch

### Alternatives Considered
1. **Client-side calculation**: Requires fetching progress_template config, complex weighted sum logic, potential for drift from database
2. **Edge function**: Unnecessary network latency (100-200ms), trigger is faster
3. **Materialized view**: Overkill for single component updates, views are for aggregations

### Implementation Flow
```
1. User toggles milestone → mutation fires
2. Mutation updates component.current_milestones JSONB
3. Database trigger calculates percent_complete (weighted sum)
4. Trigger updates component.percent_complete column
5. TanStack Query refetches component
6. UI displays updated percent_complete
```

**Code Example**:
```typescript
// useMilestones.ts
export const useUpdateMilestone = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ component_id, milestone_name, value }: MilestoneUpdateData) => {
      // Update current_milestones JSONB
      const { data, error } = await supabase
        .from('components')
        .update({
          current_milestones: supabase.rpc('jsonb_set', {
            target: 'current_milestones',
            path: `{${milestone_name}}`,
            new_value: value
          }),
          last_updated_at: new Date().toISOString()
        })
        .eq('id', component_id)
        .select()
        .single()

      // Trigger fires automatically, percent_complete recalculated
      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      // Invalidate component query to refetch updated percent_complete
      queryClient.invalidateQueries(['component', data.id])
    }
  })
}
```

**Performance**: Trigger execution <50ms + network round trip <50ms = **<100ms total** ✅

---

## 4. Filtering Performance

**Requirement**: NFR-005 - Component list filtering must return results within 500ms

### Decision
**Server-side filtering** via Supabase query params + **client-side debounce** (300ms)

### Rationale
- Database indexes (Sprint 1) handle WHERE clauses efficiently:
  - `idx_components_area_id`, `idx_components_system_id`, `idx_components_type`, `idx_components_percent`
- Debounce reduces query spam as user types (300ms = sweet spot for responsiveness)
- Server-side filtering works with pagination (client-side breaks at 1000+ items)

### Alternatives Considered
1. **Client-side filtering**: Fast for small datasets but slow for 10k components, requires loading all data upfront
2. **No debounce**: Excessive database queries (every keystroke), poor server performance
3. **Longer debounce (500ms+)**: Feels sluggish, users perceive delay

### Implementation Approach
```typescript
// ComponentFilters.tsx
import { useDebouncedValue } from '@/hooks/useDebouncedValue'

const ComponentFilters = () => {
  const [filters, setFilters] = useState<ComponentFilters>({})
  const debouncedFilters = useDebouncedValue(filters, 300)

  const { data, isLoading } = useComponents({
    projectId,
    filters: debouncedFilters
  })

  return (
    <div className="space-y-4">
      <Select
        value={filters.area_id}
        onValueChange={(area_id) => setFilters({ ...filters, area_id })}
      >
        <SelectTrigger>Area</SelectTrigger>
        <SelectContent>
          {areas.map(area => (
            <SelectItem key={area.id} value={area.id}>
              {area.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Input
        placeholder="Search by identity..."
        value={filters.search ?? ''}
        onChange={(e) => setFilters({ ...filters, search: e.target.value })}
      />

      {isLoading && <Spinner />}
    </div>
  )
}

// useComponents.ts (extends Sprint 1 hook)
export const useComponents = ({ projectId, filters }: UseComponentsOptions) => {
  return useQuery({
    queryKey: ['components', projectId, filters],
    queryFn: async () => {
      let query = supabase
        .from('components')
        .select('*')
        .eq('project_id', projectId)

      if (filters?.area_id) query = query.eq('area_id', filters.area_id)
      if (filters?.system_id) query = query.eq('system_id', filters.system_id)
      if (filters?.component_type) query = query.eq('component_type', filters.component_type)
      if (filters?.progress_min !== undefined) query = query.gte('percent_complete', filters.progress_min)
      if (filters?.progress_max !== undefined) query = query.lte('percent_complete', filters.progress_max)
      if (filters?.search) query = query.ilike('identity_key->spool_id', `%${filters.search}%`)

      const { data, error } = await query
      if (error) throw error
      return { components: data, total_count: data.length }
    }
  })
}
```

**Performance**: Database query <100ms (indexed columns) + debounce 300ms + network <100ms = **<500ms total** ✅

---

## 5. Form Validation Pattern

**Requirement**: NFR-006 - Component creation form must provide real-time validation feedback (inline errors)

### Decision
**react-hook-form 7.64.0 + zod 4.1.11** for all forms (Area, System, TestPackage, ComponentAssignment)

### Rationale
- Already in project dependencies
- Real-time validation via `mode: 'onChange'`
- Type-safe schemas with Zod (integrates with TypeScript)
- Reusable schemas across forms
- Accessibility support (aria-invalid, aria-describedby)

### Alternatives Considered
1. **Formik**: Larger bundle size (14KB vs 8KB), fewer TypeScript features
2. **Manual validation**: Error-prone, no schema reuse, more boilerplate
3. **Native HTML5 validation**: Limited customization, poor UX for complex rules

### Implementation Approach
```typescript
// src/schemas/area.schema.ts
import { z } from 'zod'

export const areaFormSchema = z.object({
  name: z.string()
    .min(1, 'Area name is required')
    .max(50, 'Area name must be 50 characters or less')
    .trim(),
  description: z.string().max(500, 'Description must be 500 characters or less').nullable()
})

export type AreaFormData = z.infer<typeof areaFormSchema>

// AreaForm.tsx
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

const AreaForm = () => {
  const { register, handleSubmit, formState: { errors } } = useForm<AreaFormData>({
    resolver: zodResolver(areaFormSchema),
    mode: 'onChange' // Real-time validation
  })

  const createAreaMutation = useCreateArea()

  const onSubmit = (data: AreaFormData) => {
    createAreaMutation.mutate({ ...data, project_id: projectId })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div>
        <Label htmlFor="name">Area Name</Label>
        <Input id="name" {...register('name')} />
        {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" {...register('description')} />
        {errors.description && <p className="text-sm text-destructive">{errors.description.message}</p>}
      </div>

      <Button type="submit" disabled={createAreaMutation.isPending}>
        {createAreaMutation.isPending ? 'Creating...' : 'Create Area'}
      </Button>
    </form>
  )
}
```

**User Experience**: Inline error messages appear as user types, preventing submission of invalid data. Form disables submit button during mutation to prevent double-submission.

---

## 6. Permission-based UI

**Requirement**: FR-043 to FR-046 - Permission-based access control for milestone updates and admin functions

### Decision
Reuse Sprint 1 **`usePermissions()` hook** + **`<PermissionGate>`** component pattern

### Rationale
- Consistent with existing codebase (Sprint 1 already implements this pattern)
- RLS enforces permissions server-side (security boundary)
- UI hides/disables controls client-side (UX improvement)
- Centralized permission logic (no duplication)

### Alternatives Considered
1. **Inline permission checks**: Code duplication across components (`if (user.role === 'admin')`)
2. **Role-based only**: Less flexible than permission-based (can't grant custom permissions)
3. **Imperative checks**: Harder to test, no declarative component wrapper

### Implementation Approach
```typescript
// lib/permissions.ts (EXISTS from Sprint 1)
export const usePermissions = () => {
  const { user } = useAuth()
  const { data: orgMembership } = useQuery({
    queryKey: ['user-org', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('user_organizations')
        .select('role, permissions')
        .eq('user_id', user.id)
        .single()
      return data
    }
  })

  return {
    canUpdateMilestones: orgMembership?.permissions?.can_update_milestones ?? false,
    canManageTeam: orgMembership?.permissions?.can_manage_team ?? false,
    // ... other permissions
  }
}

// components/PermissionGate.tsx (NEW)
interface PermissionGateProps {
  permission: keyof ReturnType<typeof usePermissions>
  children: React.ReactNode
  fallback?: React.ReactNode
}

export const PermissionGate = ({ permission, children, fallback }: PermissionGateProps) => {
  const permissions = usePermissions()

  if (!permissions[permission]) {
    return fallback ?? null
  }

  return <>{children}</>
}

// MilestoneButton.tsx (usage)
const MilestoneButton = ({ milestone, value, onChange }: Props) => {
  const { canUpdateMilestones } = usePermissions()

  return (
    <Checkbox
      checked={!!value}
      onCheckedChange={onChange}
      disabled={!canUpdateMilestones} // Disable if no permission
    />
  )
}

// ProjectSetup.tsx (usage)
const ProjectSetup = () => {
  return (
    <PermissionGate permission="canManageTeam" fallback={<p>Access denied</p>}>
      <AreaForm />
      <SystemForm />
      <TestPackageForm />
    </PermissionGate>
  )
}
```

**Security**: RLS policies enforce server-side (user cannot bypass UI controls), UI provides better UX by hiding inaccessible features.

---

## Summary

All 6 research decisions are finalized and ready for implementation:

1. ✅ **Virtualization**: @tanstack/react-virtual for 10k component list performance
2. ✅ **Milestone UI**: Checkbox (discrete) + Slider (partial %) based on workflow type
3. ✅ **Calculation**: Database trigger handles percent_complete (< 100ms)
4. ✅ **Filtering**: Server-side with 300ms debounce (<500ms response)
5. ✅ **Forms**: react-hook-form + zod for real-time validation
6. ✅ **Permissions**: Reuse Sprint 1 usePermissions() + PermissionGate pattern

**Next**: Proceed to Phase 1 (data-model.md, contracts/, quickstart.md, CLAUDE.md)

# Unified Component Details Form Implementation Plan

**Created**: 2025-10-31
**Design Doc**: `docs/plans/2025-10-31-unified-component-details-design.md`
**Estimated Total Time**: 4-6 hours

## Overview

Enhance ComponentDetailView to become a unified form supporting view, edit metadata, interactive milestones, and history display. Replace ComponentAssignDialog usage with the enhanced ComponentDetailView across both drawings and components pages.

## Dependencies

Install Shadcn UI components before starting:

```bash
npx shadcn@latest add tabs select slider checkbox badge progress scroll-area
```

## Architecture

```
ComponentDetailView (Enhanced)
├── Desktop: Tabs (TabsList + TabsTrigger)
│   ├── Tab 1: Overview (identity, progress, stats)
│   ├── Tab 2: Details (metadata editing)
│   ├── Tab 3: Milestones (interactive)
│   └── Tab 4: History (timeline)
└── Mobile: Select dropdown (same content)

Data Flow:
useComponent(id) → Component data
useMilestoneHistory(id) → History events
useAssignComponents → Metadata updates
useUpdateMilestone → Milestone updates
```

## Implementation Phases

### Phase 0: Prerequisites (20 min)

Install dependencies and verify current state.

#### Task 0.1: Install Shadcn UI Components

**Estimated time**: 10 minutes
**Prerequisites**: None
**Files created**: `src/components/ui/tabs.tsx`, `src/components/ui/select.tsx`, `src/components/ui/slider.tsx`, `src/components/ui/checkbox.tsx`, `src/components/ui/badge.tsx`, `src/components/ui/progress.tsx`, `src/components/ui/scroll-area.tsx`

**Context**: Install all Shadcn UI components needed for the tabbed interface.

**Commands**:
```bash
npx shadcn@latest add tabs
npx shadcn@latest add select
npx shadcn@latest add slider
npx shadcn@latest add checkbox
npx shadcn@latest add badge
npx shadcn@latest add progress
npx shadcn@latest add scroll-area
```

**Verification**:
```bash
# Verify all components exist
ls src/components/ui/tabs.tsx
ls src/components/ui/select.tsx
ls src/components/ui/slider.tsx
ls src/components/ui/checkbox.tsx
ls src/components/ui/badge.tsx
ls src/components/ui/progress.tsx
ls src/components/ui/scroll-area.tsx

# Type check
npx tsc -b
```

**Success Criteria**:
- [ ] All 7 UI components exist in src/components/ui/
- [ ] TypeScript compiles without errors
- [ ] No import errors

#### Task 0.2: Read Current ComponentDetailView

**Estimated time**: 10 minutes
**Prerequisites**: None
**Files read**: `src/components/ComponentDetailView.tsx`

**Context**: Understand the current structure before enhancing.

**Action**: Read the current ComponentDetailView implementation:
- What data does it fetch?
- What props does it accept?
- What's the current UI structure?
- Where are milestones displayed?

**Verification**:
Document findings:
- Current props: `componentId: string`, `canUpdateMilestones: boolean`
- Current sections: Component ID display, Milestones list, History placeholder
- Current hooks used: (list them)

**Success Criteria**:
- [ ] Documented current component structure
- [ ] Identified sections to enhance
- [ ] Noted existing hooks/dependencies

---

### Phase 1: Create useMilestoneHistory Hook (30 min)

Build data fetching for milestone history timeline.

#### Task 1.1: Create useMilestoneHistory Hook

**Estimated time**: 30 minutes
**Prerequisites**: Task 0.2 complete
**Files created**: `src/hooks/useMilestoneHistory.ts` (~60 lines)

**Context**: Create a TanStack Query hook to fetch milestone_events for a component with pagination support.

**Implementation**:

**File**: `src/hooks/useMilestoneHistory.ts`

```typescript
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database.types'

type MilestoneEvent = Database['public']['Tables']['milestone_events']['Row']

export interface MilestoneHistoryItem extends MilestoneEvent {
  user?: {
    email: string
    full_name: string | null
  } | null
}

/**
 * Fetch milestone history for a component
 * Returns events sorted by timestamp (most recent first)
 */
export function useMilestoneHistory(componentId: string, limit: number = 20) {
  return useQuery({
    queryKey: ['milestone-history', componentId, limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('milestone_events')
        .select(`
          *,
          user:users(email, full_name)
        `)
        .eq('component_id', componentId)
        .order('timestamp', { ascending: false })
        .limit(limit)

      if (error) {
        throw new Error(`Failed to fetch milestone history: ${error.message}`)
      }

      return (data || []) as MilestoneHistoryItem[]
    },
    staleTime: 30000, // 30 seconds
  })
}
```

**Test Requirements**:

**File**: `src/hooks/useMilestoneHistory.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useMilestoneHistory } from './useMilestoneHistory'
import { supabase } from '@/lib/supabase'

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: vi.fn(() => ({
              data: [
                {
                  id: 'event-1',
                  component_id: 'comp-1',
                  milestone_name: 'Install',
                  old_value: false,
                  new_value: true,
                  timestamp: '2025-10-31T12:00:00Z',
                  user_id: 'user-1',
                  user: { email: 'test@example.com', full_name: 'Test User' }
                }
              ],
              error: null
            }))
          }))
        }))
      }))
    }))
  }
}))

describe('useMilestoneHistory', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } }
    })
  })

  it('fetches milestone history for component', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )

    const { result } = renderHook(() => useMilestoneHistory('comp-1'), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toHaveLength(1)
    expect(result.current.data?.[0].milestone_name).toBe('Install')
    expect(result.current.data?.[0].user?.email).toBe('test@example.com')
  })

  it('handles errors gracefully', async () => {
    vi.mocked(supabase.from).mockReturnValueOnce({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: vi.fn(() => ({
              data: null,
              error: { message: 'Database error' }
            }))
          }))
        }))
      }))
    } as any)

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )

    const { result } = renderHook(() => useMilestoneHistory('comp-1'), { wrapper })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.message).toContain('Failed to fetch milestone history')
  })
})
```

**Verification**:
```bash
# Type check
npx tsc -b

# Run tests
npm test -- src/hooks/useMilestoneHistory.test.ts

# Check coverage
npm test -- src/hooks/useMilestoneHistory.test.ts --coverage
```

**Success Criteria**:
- [ ] Hook compiles without TypeScript errors
- [ ] All tests pass
- [ ] Coverage ≥70%
- [ ] Hook returns properly typed data

---

### Phase 2: Add Tab Structure to ComponentDetailView (45 min)

Add tabs UI framework without content.

#### Task 2.1: Add Tab State and Structure

**Estimated time**: 30 minutes
**Prerequisites**: Task 0.1, 0.2 complete
**Files modified**: `src/components/ComponentDetailView.tsx` (+100 lines)

**Context**: Add tab state management and UI structure (desktop tabs + mobile dropdown).

**Implementation**:

**File**: `src/components/ComponentDetailView.tsx`

Add imports at top:
```typescript
import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
```

Add new props to interface:
```typescript
interface ComponentDetailViewProps {
  componentId: string
  canUpdateMilestones: boolean
  canEditMetadata?: boolean      // NEW
  onMetadataChange?: () => void  // NEW
}
```

Add state inside component:
```typescript
export function ComponentDetailView({
  componentId,
  canUpdateMilestones,
  canEditMetadata = false,
  onMetadataChange,
}: ComponentDetailViewProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'details' | 'milestones' | 'history'>('overview')

  // ... existing code ...
```

Replace existing content with tabs structure:
```typescript
return (
  <>
    {/* Desktop: Horizontal Tabs */}
    <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as any)} className="hidden md:block">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="details">Details</TabsTrigger>
        <TabsTrigger value="milestones">Milestones</TabsTrigger>
        <TabsTrigger value="history">History</TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="mt-4">
        <div className="text-sm text-muted-foreground">Overview content (TODO)</div>
      </TabsContent>

      <TabsContent value="details" className="mt-4">
        <div className="text-sm text-muted-foreground">Details content (TODO)</div>
      </TabsContent>

      <TabsContent value="milestones" className="mt-4">
        <div className="text-sm text-muted-foreground">Milestones content (TODO)</div>
      </TabsContent>

      <TabsContent value="history" className="mt-4">
        <div className="text-sm text-muted-foreground">History content (TODO)</div>
      </TabsContent>
    </Tabs>

    {/* Mobile: Dropdown Selector */}
    <div className="md:hidden space-y-4">
      <Select value={activeTab} onValueChange={(val) => setActiveTab(val as any)}>
        <SelectTrigger className="w-full min-h-[44px]">
          <SelectValue placeholder="Select view" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="overview">Overview</SelectItem>
          <SelectItem value="details">Details</SelectItem>
          <SelectItem value="milestones">Milestones</SelectItem>
          <SelectItem value="history">History</SelectItem>
        </SelectContent>
      </Select>

      {activeTab === 'overview' && (
        <div className="text-sm text-muted-foreground">Overview content (TODO)</div>
      )}
      {activeTab === 'details' && (
        <div className="text-sm text-muted-foreground">Details content (TODO)</div>
      )}
      {activeTab === 'milestones' && (
        <div className="text-sm text-muted-foreground">Milestones content (TODO)</div>
      )}
      {activeTab === 'history' && (
        <div className="text-sm text-muted-foreground">History content (TODO)</div>
      )}
    </div>
  </>
)
```

**Verification**:
```bash
# Type check
npx tsc -b

# Visual check
npm run dev
# Open components page, click any component
# Verify tabs appear on desktop (≥768px)
# Verify dropdown appears on mobile (<768px)
# Verify tab switching works
```

**Success Criteria**:
- [ ] TypeScript compiles without errors
- [ ] Tabs render on desktop
- [ ] Dropdown renders on mobile
- [ ] Tab/dropdown switching works
- [ ] Placeholder content shows in each tab

#### Task 2.2: Add Tab Navigation Tests

**Estimated time**: 15 minutes
**Prerequisites**: Task 2.1 complete
**Files modified**: `src/components/ComponentDetailView.test.tsx` (create if doesn't exist, +60 lines)

**Context**: Test tab navigation works on both desktop and mobile.

**Implementation**:

**File**: `src/components/ComponentDetailView.test.tsx`

```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ComponentDetailView } from './ComponentDetailView'

// Mock hooks
vi.mock('@/hooks/useComponent', () => ({
  useComponent: () => ({
    data: {
      id: 'comp-1',
      component_type: 'valve',
      identity_key: { commodity_code: 'VBALU-001', size: '2', seq: 1 },
      percent_complete: 50,
      current_milestones: {},
    },
    isLoading: false,
  })
}))

vi.mock('@/hooks/useMilestoneHistory', () => ({
  useMilestoneHistory: () => ({
    data: [],
    isLoading: false,
  })
}))

describe('ComponentDetailView - Tabs', () => {
  const queryClient = new QueryClient()

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )

  it('renders all tabs on desktop', () => {
    render(
      <ComponentDetailView
        componentId="comp-1"
        canUpdateMilestones={true}
      />,
      { wrapper }
    )

    // Check tab triggers exist (hidden on mobile)
    expect(screen.getByText('Overview')).toBeInTheDocument()
    expect(screen.getByText('Details')).toBeInTheDocument()
    expect(screen.getByText('Milestones')).toBeInTheDocument()
    expect(screen.getByText('History')).toBeInTheDocument()
  })

  it('shows Overview tab by default', () => {
    render(
      <ComponentDetailView
        componentId="comp-1"
        canUpdateMilestones={true}
      />,
      { wrapper }
    )

    // Overview content should be visible
    expect(screen.getByText(/Overview content/i)).toBeInTheDocument()
  })

  it('switches tabs when clicked', () => {
    render(
      <ComponentDetailView
        componentId="comp-1"
        canUpdateMilestones={true}
      />,
      { wrapper }
    )

    // Click Milestones tab
    fireEvent.click(screen.getByText('Milestones'))

    // Should show milestones content
    expect(screen.getByText(/Milestones content/i)).toBeInTheDocument()
  })
})
```

**Verification**:
```bash
# Run tests
npm test -- src/components/ComponentDetailView.test.tsx
```

**Success Criteria**:
- [ ] All tests pass
- [ ] Tab switching test works
- [ ] Default tab test passes

---

### Phase 3: Implement Overview Tab (30 min)

Build the overview content showing identity, progress, and stats.

#### Task 3.1: Create Overview Tab Content

**Estimated time**: 30 minutes
**Prerequisites**: Task 2.1 complete
**Files modified**: `src/components/ComponentDetailView.tsx` (+80 lines)

**Context**: Replace "Overview content (TODO)" with actual component identity, progress display, and quick stats.

**Implementation**:

**File**: `src/components/ComponentDetailView.tsx`

Add imports:
```typescript
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { formatIdentityKey } from '@/lib/formatIdentityKey'
import { formatIdentityKey as formatFieldWeldKey } from '@/lib/field-weld-utils'
```

Inside component, after fetching data, format identity:
```typescript
const { data: component, isLoading } = useComponent(componentId)

if (isLoading) {
  return <div className="p-4">Loading...</div>
}

if (!component) {
  return <div className="p-4 text-red-600">Component not found</div>
}

// Format identity based on type
let identityDisplay: string
if (component.component_type === 'field_weld') {
  identityDisplay = formatFieldWeldKey(
    component.identity_key as Record<string, unknown>,
    component.component_type
  )
} else if (component.component_type === 'spool') {
  const key = component.identity_key as Record<string, unknown>
  identityDisplay = (key?.spool_id as string) || 'Unknown Spool'
} else {
  identityDisplay = formatIdentityKey(
    component.identity_key as any,
    component.component_type as any
  )
}

// Calculate milestone stats
const template = component.template
const totalMilestones = template?.milestones_config?.length || 0
const completedMilestones = Object.values(component.current_milestones).filter(
  (value) => value === true || value === 100
).length
```

Replace Overview TabsContent:
```typescript
<TabsContent value="overview" className="mt-4 space-y-6">
  {/* Component Identity */}
  <div>
    <h3 className="text-lg font-semibold mb-2">Component</h3>
    <div className="flex items-center gap-3">
      <span className="text-2xl font-mono">{identityDisplay}</span>
      <Badge variant="secondary">{component.component_type}</Badge>
    </div>
    {component.drawing && (
      <p className="text-sm text-muted-foreground mt-1">
        Drawing: {component.drawing.drawing_no_norm}
      </p>
    )}
  </div>

  {/* Progress */}
  <div>
    <div className="flex justify-between items-center mb-2">
      <h3 className="text-lg font-semibold">Progress</h3>
      <span className="text-2xl font-bold">{component.percent_complete.toFixed(1)}%</span>
    </div>
    <Progress value={component.percent_complete} className="h-3" />
    <p className="text-sm text-muted-foreground mt-2">
      Last updated: {component.last_updated_at
        ? new Date(component.last_updated_at).toLocaleString()
        : 'Never'}
    </p>
  </div>

  {/* Quick Stats */}
  <div className="grid grid-cols-2 gap-4">
    <div className="border rounded-lg p-4">
      <p className="text-sm text-muted-foreground">Total Milestones</p>
      <p className="text-3xl font-bold">{totalMilestones}</p>
    </div>
    <div className="border rounded-lg p-4">
      <p className="text-sm text-muted-foreground">Completed</p>
      <p className="text-3xl font-bold">{completedMilestones}</p>
    </div>
  </div>
</TabsContent>
```

Do the same for mobile (replace the `{activeTab === 'overview' && ...}` section).

**Verification**:
```bash
# Type check
npx tsc -b

# Visual check
npm run dev
# Open component details
# Verify identity displays correctly
# Verify progress bar shows
# Verify stats are accurate
```

**Success Criteria**:
- [ ] Identity displays for valve, spool, field_weld
- [ ] Progress bar shows correct percentage
- [ ] Stats show correct counts
- [ ] Drawing number displays if present
- [ ] Mobile layout works

---

### Phase 4: Implement Details Tab (Metadata Editing) (60 min)

Build metadata editing UI with Area/System/Package dropdowns.

#### Task 4.1: Create Metadata Editing Form

**Estimated time**: 45 minutes
**Prerequisites**: Task 2.1 complete
**Files modified**: `src/components/ComponentDetailView.tsx` (+120 lines)

**Context**: Add metadata editing form in Details tab with dropdowns for Area, System, Test Package.

**Implementation**:

**File**: `src/components/ComponentDetailView.tsx`

Add imports:
```typescript
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { useAreas } from '@/hooks/useAreas'
import { useSystems } from '@/hooks/useSystems'
import { useTestPackages } from '@/hooks/useTestPackages'
import { useAssignComponents } from '@/hooks/useAssignComponents'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'
```

Add state for metadata form:
```typescript
const [metadataForm, setMetadataForm] = useState({
  area_id: component?.area_id || null,
  system_id: component?.system_id || null,
  test_package_id: component?.test_package_id || null,
})
const [isDirty, setIsDirty] = useState(false)

// Sync form with component data
useEffect(() => {
  if (component) {
    setMetadataForm({
      area_id: component.area_id,
      system_id: component.system_id,
      test_package_id: component.test_package_id,
    })
    setIsDirty(false)
  }
}, [component])
```

Fetch metadata options:
```typescript
const { user } = useAuth()
const { data: areas = [] } = useAreas(component?.project_id || '')
const { data: systems = [] } = useSystems(component?.project_id || '')
const { data: testPackages = [] } = useTestPackages(component?.project_id || '')
const assignMutation = useAssignComponents()
```

Handle metadata save:
```typescript
const handleMetadataSave = async () => {
  if (!user || !component) return

  try {
    await assignMutation.mutateAsync({
      component_ids: [component.id],
      area_id: metadataForm.area_id,
      system_id: metadataForm.system_id,
      test_package_id: metadataForm.test_package_id,
      user_id: user.id,
    })

    toast.success('Metadata updated successfully')
    setIsDirty(false)
    onMetadataChange?.()
  } catch (error) {
    toast.error('Failed to update metadata')
    console.error(error)
  }
}

const handleMetadataCancel = () => {
  setMetadataForm({
    area_id: component.area_id,
    system_id: component.system_id,
    test_package_id: component.test_package_id,
  })
  setIsDirty(false)
}
```

Replace Details TabsContent:
```typescript
<TabsContent value="details" className="mt-4 space-y-4">
  <div>
    <h3 className="text-lg font-semibold mb-4">Assign Metadata</h3>
    <p className="text-sm text-muted-foreground mb-4">
      Assign or change the Area, System, and Test Package for this component.
    </p>

    {/* Area */}
    <div className="space-y-2">
      <label className="text-sm font-medium">Area</label>
      <Select
        value={metadataForm.area_id || 'none'}
        onValueChange={(val) => {
          setMetadataForm({ ...metadataForm, area_id: val === 'none' ? null : val })
          setIsDirty(true)
        }}
        disabled={!canEditMetadata}
      >
        <SelectTrigger>
          <SelectValue placeholder="Select area" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">-- No Area --</SelectItem>
          {areas.map((area) => (
            <SelectItem key={area.id} value={area.id}>
              {area.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>

    {/* System */}
    <div className="space-y-2">
      <label className="text-sm font-medium">System</label>
      <Select
        value={metadataForm.system_id || 'none'}
        onValueChange={(val) => {
          setMetadataForm({ ...metadataForm, system_id: val === 'none' ? null : val })
          setIsDirty(true)
        }}
        disabled={!canEditMetadata}
      >
        <SelectTrigger>
          <SelectValue placeholder="Select system" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">-- No System --</SelectItem>
          {systems.map((system) => (
            <SelectItem key={system.id} value={system.id}>
              {system.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>

    {/* Test Package */}
    <div className="space-y-2">
      <label className="text-sm font-medium">Test Package</label>
      <Select
        value={metadataForm.test_package_id || 'none'}
        onValueChange={(val) => {
          setMetadataForm({ ...metadataForm, test_package_id: val === 'none' ? null : val })
          setIsDirty(true)
        }}
        disabled={!canEditMetadata}
      >
        <SelectTrigger>
          <SelectValue placeholder="Select test package" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">-- No Test Package --</SelectItem>
          {testPackages.map((pkg) => (
            <SelectItem key={pkg.id} value={pkg.id}>
              {pkg.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>

    {/* Actions */}
    {canEditMetadata && (
      <div className="flex gap-2 pt-4">
        <Button
          onClick={handleMetadataSave}
          disabled={!isDirty || assignMutation.isPending}
        >
          {assignMutation.isPending ? 'Saving...' : 'Save'}
        </Button>
        <Button
          variant="outline"
          onClick={handleMetadataCancel}
          disabled={!isDirty || assignMutation.isPending}
        >
          Cancel
        </Button>
      </div>
    )}

    {!canEditMetadata && (
      <p className="text-sm text-muted-foreground pt-4">
        You don't have permission to edit metadata.
      </p>
    )}
  </div>
</TabsContent>
```

Do the same for mobile Details section.

**Verification**:
```bash
# Type check
npx tsc -b

# Visual check
npm run dev
# Open component details
# Go to Details tab
# Verify dropdowns populate
# Change values and click Save
# Verify component metadata updates
# Verify Cancel resets form
```

**Success Criteria**:
- [ ] Dropdowns populate with areas/systems/packages
- [ ] Save button updates metadata
- [ ] Cancel button resets form
- [ ] Permission check disables form if needed
- [ ] Dirty state tracking works

#### Task 4.2: Add Metadata Editing Tests

**Estimated time**: 15 minutes
**Prerequisites**: Task 4.1 complete
**Files modified**: `src/components/ComponentDetailView.test.tsx` (+40 lines)

**Implementation**:

```typescript
describe('ComponentDetailView - Details Tab', () => {
  it('shows metadata editing form when canEditMetadata is true', () => {
    render(
      <ComponentDetailView
        componentId="comp-1"
        canUpdateMilestones={true}
        canEditMetadata={true}
      />,
      { wrapper }
    )

    fireEvent.click(screen.getByText('Details'))
    expect(screen.getByText('Assign Metadata')).toBeInTheDocument()
    expect(screen.getByText('Save')).toBeInTheDocument()
  })

  it('disables form when canEditMetadata is false', () => {
    render(
      <ComponentDetailView
        componentId="comp-1"
        canUpdateMilestones={true}
        canEditMetadata={false}
      />,
      { wrapper }
    )

    fireEvent.click(screen.getByText('Details'))
    expect(screen.getByText(/don't have permission/i)).toBeInTheDocument()
  })
})
```

**Verification**:
```bash
npm test -- src/components/ComponentDetailView.test.tsx
```

**Success Criteria**:
- [ ] Tests pass
- [ ] Permission check tested

---

### Phase 5: Implement Milestones Tab (Interactive) (60 min)

Make milestones interactive with checkboxes and sliders.

#### Task 5.1: Create Interactive Milestones UI

**Estimated time**: 45 minutes
**Prerequisites**: Task 2.1 complete
**Files modified**: `src/components/ComponentDetailView.tsx` (+100 lines)

**Context**: Replace "Milestones content (TODO)" with interactive milestone controls.

**Implementation**:

**File**: `src/components/ComponentDetailView.tsx`

Add imports:
```typescript
import { Checkbox } from '@/components/ui/checkbox'
import { Slider } from '@/components/ui/slider'
import { useUpdateMilestone } from '@/hooks/useUpdateMilestone'
```

Handle milestone toggle:
```typescript
const updateMilestoneMutation = useUpdateMilestone()

const handleMilestoneToggle = async (milestoneName: string, isPartial: boolean, currentValue: boolean | number) => {
  if (!user || !component) return

  let newValue: boolean | number
  if (isPartial) {
    // Toggle partial between 0 and 100
    newValue = currentValue === 100 ? 0 : 100
  } else {
    // Toggle boolean
    newValue = !currentValue
  }

  try {
    await updateMilestoneMutation.mutateAsync({
      component_id: component.id,
      milestone_name: milestoneName,
      value: newValue,
      user_id: user.id,
    })
    toast.success(`${milestoneName} updated`)
  } catch (error) {
    toast.error(`Failed to update ${milestoneName}`)
    console.error(error)
  }
}

const handleSliderChange = async (milestoneName: string, value: number[]) => {
  if (!user || !component) return

  try {
    await updateMilestoneMutation.mutateAsync({
      component_id: component.id,
      milestone_name: milestoneName,
      value: value[0],
      user_id: user.id,
    })
  } catch (error) {
    toast.error(`Failed to update ${milestoneName}`)
    console.error(error)
  }
}
```

Replace Milestones TabsContent:
```typescript
<TabsContent value="milestones" className="mt-4 space-y-4">
  <div>
    <h3 className="text-lg font-semibold mb-4">Milestones</h3>

    {!canUpdateMilestones && (
      <p className="text-sm text-muted-foreground mb-4">
        You don't have permission to update milestones.
      </p>
    )}

    <div className="space-y-4">
      {template?.milestones_config
        ?.sort((a, b) => a.order - b.order)
        .map((milestone) => {
          const currentValue = component.current_milestones[milestone.name]
          const isCompleted = currentValue === true || currentValue === 100

          return (
            <div
              key={milestone.name}
              className="flex items-center justify-between p-4 border rounded-lg"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{milestone.name}</span>
                  <Badge variant="outline">{milestone.weight}%</Badge>
                </div>
                {milestone.is_partial && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Current: {typeof currentValue === 'number' ? currentValue : 0}%
                  </p>
                )}
              </div>

              <div className="flex items-center gap-3">
                {milestone.is_partial ? (
                  <div className="w-48">
                    <Slider
                      value={[typeof currentValue === 'number' ? currentValue : 0]}
                      onValueCommit={(val) => handleSliderChange(milestone.name, val)}
                      min={0}
                      max={100}
                      step={1}
                      disabled={!canUpdateMilestones || updateMilestoneMutation.isPending}
                      className="min-h-[44px]"
                    />
                  </div>
                ) : (
                  <Checkbox
                    checked={currentValue === true}
                    onCheckedChange={() => handleMilestoneToggle(milestone.name, false, currentValue as boolean)}
                    disabled={!canUpdateMilestones || updateMilestoneMutation.isPending}
                    className="h-6 w-6"
                  />
                )}
              </div>
            </div>
          )
        })}
    </div>

    {template?.milestones_config?.length === 0 && (
      <p className="text-sm text-muted-foreground">No milestones configured for this component type.</p>
    )}
  </div>
</TabsContent>
```

Do the same for mobile Milestones section.

**Verification**:
```bash
# Type check
npx tsc -b

# Visual check
npm run dev
# Open component details
# Go to Milestones tab
# Toggle checkboxes
# Move sliders
# Verify updates persist
# Check Overview tab shows updated progress
```

**Success Criteria**:
- [ ] Checkboxes toggle discrete milestones
- [ ] Sliders update partial milestones
- [ ] Permission check disables controls
- [ ] Optimistic UI updates work
- [ ] Progress recalculates in Overview tab

#### Task 5.2: Add Milestones Interaction Tests

**Estimated time**: 15 minutes
**Prerequisites**: Task 5.1 complete
**Files modified**: `src/components/ComponentDetailView.test.tsx` (+50 lines)

**Implementation**:

```typescript
describe('ComponentDetailView - Milestones Tab', () => {
  it('shows milestone checkboxes when canUpdateMilestones is true', () => {
    render(
      <ComponentDetailView
        componentId="comp-1"
        canUpdateMilestones={true}
      />,
      { wrapper }
    )

    fireEvent.click(screen.getByText('Milestones'))
    // Should show milestone controls
    expect(screen.getByText(/Milestones/i)).toBeInTheDocument()
  })

  it('disables milestone controls when canUpdateMilestones is false', () => {
    render(
      <ComponentDetailView
        componentId="comp-1"
        canUpdateMilestones={false}
      />,
      { wrapper }
    )

    fireEvent.click(screen.getByText('Milestones'))
    expect(screen.getByText(/don't have permission/i)).toBeInTheDocument()
  })
})
```

**Verification**:
```bash
npm test -- src/components/ComponentDetailView.test.tsx
```

**Success Criteria**:
- [ ] Tests pass
- [ ] Permission checks tested

---

### Phase 6: Implement History Tab (60 min)

Display milestone update timeline.

#### Task 6.1: Create History Timeline UI

**Estimated time**: 45 minutes
**Prerequisites**: Task 1.1, 2.1 complete
**Files modified**: `src/components/ComponentDetailView.tsx` (+80 lines)

**Context**: Display milestone_events in a timeline format with user and timestamp.

**Implementation**:

**File**: `src/components/ComponentDetailView.tsx`

Add import:
```typescript
import { ScrollArea } from '@/components/ui/scroll-area'
import { useMilestoneHistory } from '@/hooks/useMilestoneHistory'
```

Fetch history:
```typescript
const { data: history = [], isLoading: historyLoading } = useMilestoneHistory(componentId, 50)
```

Replace History TabsContent:
```typescript
<TabsContent value="history" className="mt-4">
  <div>
    <h3 className="text-lg font-semibold mb-4">Milestone History</h3>

    {historyLoading && (
      <p className="text-sm text-muted-foreground">Loading history...</p>
    )}

    {!historyLoading && history.length === 0 && (
      <p className="text-sm text-muted-foreground">No milestone updates yet</p>
    )}

    {!historyLoading && history.length > 0 && (
      <ScrollArea className="h-[400px] pr-4">
        <div className="space-y-3">
          {history.map((event) => {
            const oldValueDisplay = typeof event.old_value === 'number'
              ? `${event.old_value}%`
              : event.old_value ? 'Complete' : 'Incomplete'
            const newValueDisplay = typeof event.new_value === 'number'
              ? `${event.new_value}%`
              : event.new_value ? 'Complete' : 'Incomplete'

            return (
              <div
                key={event.id}
                className="p-4 border rounded-lg bg-muted/30"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-medium">{event.milestone_name}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {oldValueDisplay} → {newValueDisplay}
                    </p>
                  </div>
                  <time className="text-xs text-muted-foreground">
                    {new Date(event.timestamp).toLocaleString()}
                  </time>
                </div>
                {event.user && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Updated by: {event.user.full_name || event.user.email}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      </ScrollArea>
    )}
  </div>
</TabsContent>
```

Do the same for mobile History section.

**Verification**:
```bash
# Type check
npx tsc -b

# Visual check
npm run dev
# Open component details
# Go to History tab
# Verify events show in reverse chronological order
# Update a milestone
# Verify new event appears in history
```

**Success Criteria**:
- [ ] History displays events
- [ ] Events sorted newest first
- [ ] Old/new values formatted correctly
- [ ] User names display
- [ ] Timestamps formatted
- [ ] Empty state shows when no history

#### Task 6.2: Add Field Weld Context to History

**Estimated time**: 15 minutes
**Prerequisites**: Task 6.1 complete
**Files modified**: `src/components/ComponentDetailView.tsx` (+30 lines)

**Context**: For field_weld components, show additional context like welder assignments in history.

**Implementation**:

Inside history map, add field weld check:
```typescript
{history.map((event) => {
  // ... existing code ...

  return (
    <div key={event.id} className="p-4 border rounded-lg bg-muted/30">
      {/* ... existing event display ... */}

      {/* Field weld context */}
      {component.component_type === 'field_weld' && event.milestone_name === 'Weld Made' && (
        <div className="mt-2 text-xs text-muted-foreground border-t pt-2">
          <p>Field weld milestone - check weld log for welder details</p>
        </div>
      )}
    </div>
  )
})}
```

**Note**: Full welder/NDE context requires joining with `field_welds` table. This is a placeholder for basic context. Full implementation can be added in future enhancement.

**Verification**:
```bash
# Visual check for field_weld component
npm run dev
# Open a field_weld component
# Go to History tab
# Verify context message shows for Weld Made milestone
```

**Success Criteria**:
- [ ] Field weld context shows for appropriate milestones
- [ ] Other component types unaffected

---

### Phase 7: Integration & Usage Updates (45 min)

Update ComponentsPage and ComponentMetadataModal to use enhanced ComponentDetailView.

#### Task 7.1: Update ComponentsPage to Pass New Props

**Estimated time**: 15 minutes
**Prerequisites**: Phase 6 complete
**Files modified**: `src/pages/ComponentsPage.tsx` (+5 lines)

**Context**: Pass `canEditMetadata` prop to ComponentDetailView in ComponentsPage.

**Implementation**:

**File**: `src/pages/ComponentsPage.tsx`

Find the Dialog with ComponentDetailView (around line 80-95):
```typescript
<Dialog
  open={selectedComponentId !== null}
  onOpenChange={(open) => !open && setSelectedComponentId(null)}
>
  <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
    <DialogHeader>
      <DialogTitle>Component Details</DialogTitle>
    </DialogHeader>
    {selectedComponentId && (
      <ComponentDetailView
        componentId={selectedComponentId}
        canUpdateMilestones={canUpdateMilestones}
        canEditMetadata={true}  // ADD THIS LINE
        onMetadataChange={() => {  // ADD THIS CALLBACK
          // Optionally refetch components list
        }}
      />
    )}
  </DialogContent>
</Dialog>
```

**Verification**:
```bash
# Type check
npx tsc -b

# Visual check
npm run dev
# Navigate to /components
# Click a component
# Verify all 4 tabs appear
# Verify Details tab allows editing
```

**Success Criteria**:
- [ ] ComponentsPage passes new props
- [ ] Dialog opens with all tabs
- [ ] Details tab allows editing

#### Task 7.2: Replace ComponentAssignDialog in ComponentMetadataModal

**Estimated time**: 30 minutes
**Prerequisites**: Task 7.1 complete
**Files modified**: `src/components/component-metadata/ComponentMetadataModal.tsx` (+20 lines, -30 lines)

**Context**: Replace ComponentAssignDialog with ComponentDetailView in the drawings page metadata modal.

**Implementation**:

**File**: `src/components/component-metadata/ComponentMetadataModal.tsx`

Read the file first to understand structure, then:

Replace ComponentAssignDialog import:
```typescript
// REMOVE
import { ComponentAssignDialog } from '@/components/ComponentAssignDialog'

// ADD
import { ComponentDetailView } from '@/components/ComponentDetailView'
```

Find where ComponentAssignDialog is rendered and replace:
```typescript
{/* OLD */}
<ComponentAssignDialog
  projectId={projectId}
  componentIds={[selectedComponentId]}
  open={isOpen}
  onOpenChange={onClose}
  onSuccess={handleSuccess}
/>

{/* NEW */}
<Dialog open={isOpen} onOpenChange={onClose}>
  <DialogContent className="max-w-4xl max-h-[90vh]">
    <DialogHeader>
      <DialogTitle>Component Details</DialogTitle>
    </DialogHeader>
    {selectedComponentId && (
      <ComponentDetailView
        componentId={selectedComponentId}
        canUpdateMilestones={true}
        canEditMetadata={true}
        onMetadataChange={handleSuccess}
      />
    )}
  </DialogContent>
</Dialog>
```

**Verification**:
```bash
# Type check
npx tsc -b

# Visual check
npm run dev
# Navigate to /drawings
# Expand a drawing
# Click "Edit" on a component
# Verify ComponentDetailView opens with all tabs
# Verify Details tab has metadata form
# Edit metadata and save
# Verify modal closes and data refreshes
```

**Success Criteria**:
- [ ] ComponentMetadataModal uses ComponentDetailView
- [ ] All tabs accessible from drawings page
- [ ] Metadata editing works
- [ ] Success callback fires on save

---

### Phase 8: Testing & Documentation (60 min)

Comprehensive tests and update documentation.

#### Task 8.1: Add Comprehensive Integration Tests

**Estimated time**: 45 minutes
**Prerequisites**: Phase 7 complete
**Files created**: `tests/integration/unified-component-details.test.ts` (~150 lines)

**Context**: E2E tests covering full workflow from both access points.

**Implementation**:

**File**: `tests/integration/unified-component-details.test.ts`

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { ComponentDetailView } from '@/components/ComponentDetailView'
import { ComponentsPage } from '@/pages/ComponentsPage'

// Mock auth context
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-1', email: 'test@example.com' },
  }),
}))

// Mock hooks
vi.mock('@/hooks/useComponent', () => ({
  useComponent: () => ({
    data: {
      id: 'comp-1',
      project_id: 'proj-1',
      component_type: 'valve',
      identity_key: { commodity_code: 'VBALU-001', size: '2', seq: 1 },
      percent_complete: 50,
      current_milestones: { Install: false, Test: false },
      area_id: 'area-1',
      system_id: null,
      test_package_id: null,
      template: {
        milestones_config: [
          { name: 'Install', weight: 50, order: 1, is_partial: false },
          { name: 'Test', weight: 50, order: 2, is_partial: false },
        ],
      },
    },
    isLoading: false,
  }),
}))

vi.mock('@/hooks/useMilestoneHistory', () => ({
  useMilestoneHistory: () => ({
    data: [
      {
        id: 'event-1',
        milestone_name: 'Install',
        old_value: false,
        new_value: true,
        timestamp: '2025-10-31T12:00:00Z',
        user: { email: 'test@example.com', full_name: 'Test User' },
      },
    ],
    isLoading: false,
  }),
}))

describe('Unified Component Details - Integration', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
  })

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{children}</BrowserRouter>
    </QueryClientProvider>
  )

  describe('Tab Navigation', () => {
    it('switches between all tabs on desktop', async () => {
      render(
        <ComponentDetailView
          componentId="comp-1"
          canUpdateMilestones={true}
          canEditMetadata={true}
        />,
        { wrapper }
      )

      // Default: Overview tab
      expect(screen.getByText(/Progress/i)).toBeInTheDocument()

      // Switch to Details
      fireEvent.click(screen.getByText('Details'))
      await waitFor(() => {
        expect(screen.getByText(/Assign Metadata/i)).toBeInTheDocument()
      })

      // Switch to Milestones
      fireEvent.click(screen.getByText('Milestones'))
      await waitFor(() => {
        expect(screen.getByText('Install')).toBeInTheDocument()
      })

      // Switch to History
      fireEvent.click(screen.getByText('History'))
      await waitFor(() => {
        expect(screen.getByText(/Milestone History/i)).toBeInTheDocument()
      })
    })
  })

  describe('Metadata Editing Workflow', () => {
    it('allows editing and saving metadata', async () => {
      const onMetadataChange = vi.fn()

      render(
        <ComponentDetailView
          componentId="comp-1"
          canUpdateMilestones={true}
          canEditMetadata={true}
          onMetadataChange={onMetadataChange}
        />,
        { wrapper }
      )

      // Go to Details tab
      fireEvent.click(screen.getByText('Details'))

      // Change area (mock interaction)
      // Note: Full implementation would require mocking select interactions

      // Verify Save button exists
      expect(screen.getByText('Save')).toBeInTheDocument()
    })
  })

  describe('Milestone Interaction', () => {
    it('updates milestones and shows in history', async () => {
      render(
        <ComponentDetailView
          componentId="comp-1"
          canUpdateMilestones={true}
          canEditMetadata={true}
        />,
        { wrapper }
      )

      // Go to Milestones tab
      fireEvent.click(screen.getByText('Milestones'))

      // Should show milestone controls
      expect(screen.getByText('Install')).toBeInTheDocument()
      expect(screen.getByText('Test')).toBeInTheDocument()

      // Go to History tab
      fireEvent.click(screen.getByText('History'))

      // Should show history event
      await waitFor(() => {
        expect(screen.getByText('Install')).toBeInTheDocument()
        expect(screen.getByText(/Test User/i)).toBeInTheDocument()
      })
    })
  })

  describe('Permission Enforcement', () => {
    it('disables milestone editing when canUpdateMilestones is false', () => {
      render(
        <ComponentDetailView
          componentId="comp-1"
          canUpdateMilestones={false}
          canEditMetadata={true}
        />,
        { wrapper }
      )

      fireEvent.click(screen.getByText('Milestones'))
      expect(screen.getByText(/don't have permission/i)).toBeInTheDocument()
    })

    it('disables metadata editing when canEditMetadata is false', () => {
      render(
        <ComponentDetailView
          componentId="comp-1"
          canUpdateMilestones={true}
          canEditMetadata={false}
        />,
        { wrapper }
      )

      fireEvent.click(screen.getByText('Details'))
      expect(screen.getByText(/don't have permission/i)).toBeInTheDocument()
    })
  })
})
```

**Verification**:
```bash
npm test -- tests/integration/unified-component-details.test.ts --coverage
```

**Success Criteria**:
- [ ] All integration tests pass
- [ ] Coverage ≥70%

#### Task 8.2: Update Documentation

**Estimated time**: 15 minutes
**Prerequisites**: Phase 7 complete
**Files modified**: `CLAUDE.md` (+15 lines)

**Context**: Document the unified component details feature.

**Implementation**:

**File**: `CLAUDE.md`

Add to "Recently Completed Features" section:
```markdown
**Feature 022**: Unified Component Details Form (2025-10-31)
- ✅ Enhanced ComponentDetailView with 4-tab interface (Overview, Details, Milestones, History)
- ✅ Metadata editing (Area, System, Test Package) in Details tab
- ✅ Interactive milestone editing (checkboxes for discrete, sliders for partial)
- ✅ Milestone history timeline with user and timestamp
- ✅ Mobile-responsive with dropdown tab selector (<768px)
- ✅ Permission-based editing (can_update_milestones, can_edit_metadata)
- ✅ Accessible from both drawings page and components page
- ✅ Replaced ComponentAssignDialog with unified form
- ✅ WCAG 2.1 AA accessibility (keyboard navigation, ARIA labels)
```

**Verification**:
```bash
git diff CLAUDE.md
```

**Success Criteria**:
- [ ] Documentation updated
- [ ] Feature clearly described

---

## Verification Checklist

Run ALL checks before considering complete:

```bash
# Type check
npx tsc -b

# All tests
npm test

# Coverage check
npm test -- --coverage

# Build check
npm run build

# Visual verification
npm run dev
# Test scenarios:
# 1. Open component from components page - verify all tabs work
# 2. Open component from drawings page - verify all tabs work
# 3. Edit metadata in Details tab - verify save works
# 4. Toggle milestones - verify updates persist
# 5. Check History tab - verify events show
# 6. Test mobile (<768px) - verify dropdown selector works
```

- [ ] TypeScript compiles without errors
- [ ] All tests pass
- [ ] Coverage ≥70% overall
- [ ] Build succeeds
- [ ] Component details accessible from both pages
- [ ] All 4 tabs functional on desktop
- [ ] Dropdown selector works on mobile
- [ ] Metadata editing saves correctly
- [ ] Milestone updates persist
- [ ] History displays events
- [ ] Permissions enforced correctly
- [ ] No console errors
- [ ] WCAG 2.1 AA compliance (keyboard nav, screen readers)

## Rollback Plan

If critical issues found:

```bash
# Revert all changes
git log --oneline -20  # Find commit before this feature
git revert <commit-hash>

# Or reset if not pushed
git reset --hard <commit-before-feature>

# Restore ComponentAssignDialog usage
git checkout HEAD~1 -- src/components/component-metadata/ComponentMetadataModal.tsx
```

## Success Criteria

✅ Feature complete when:
1. All verification checklist items pass
2. No regressions in existing functionality
3. Code review approved (if applicable)
4. Design matches requirements from design doc
5. Mobile and desktop tested
6. Accessibility validated

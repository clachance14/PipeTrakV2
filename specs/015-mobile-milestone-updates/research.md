# Technical Research: Mobile Milestone Updates

**Feature**: 015-mobile-milestone-updates
**Phase**: Phase 0 - Feasibility & Technical Research
**Date**: 2025-10-24

## Executive Summary

**Feasibility**: ✅ HIGH - Feature is a responsive adaptation of existing desktop UI (Feature 010) with offline queue support. No backend changes required.

**Key Findings**:
1. **Responsive Design**: Tailwind CSS v4 breakpoints + viewport detection sufficient for ≤1024px mobile UI
2. **Offline Queue**: localStorage API provides 5-10MB storage (well above 50-update limit of ~25KB)
3. **Network Detection**: Browser `navigator.onLine` + `online`/`offline` events adequate for connectivity detection
4. **Existing Hooks**: `useUpdateMilestone()` hook from Feature 010 can be wrapped for offline queueing
5. **Touch Targets**: Radix UI primitives support 44px minimum touch targets with CSS padding adjustments

**Risks**:
- **Low Risk**: localStorage quota exceeded on legacy browsers (mitigation: error toast + clear guidance)
- **Low Risk**: Race conditions in sync queue (mitigation: sequential processing with retry tracking)
- **Medium Risk**: Optimistic UI desync if user navigates away mid-sync (mitigation: persist queue across sessions)

## Existing Codebase Analysis

### Feature 010 Dependencies

**Files to Adapt** (from Feature 010: Drawing-Centered Component Progress Table):

1. **`src/pages/DrawingComponentTablePage.tsx`**
   - Current: Desktop-optimized layout with sidebar filters
   - Adaptation: Wrap with viewport detection, conditionally render mobile layout
   - Mobile changes: Vertical filter stack, hamburger menu, full-screen modals

2. **`src/components/drawing-table/DrawingTable.tsx`**
   - Current: Virtualized table with hover states
   - Adaptation: Touch-friendly tap targets, remove hover-dependent features
   - Mobile changes: Increase row height (60px → 64px), larger tap zones

3. **`src/components/drawing-table/DrawingRow.tsx`**
   - Current: Expandable row with progress bar
   - Adaptation: Larger touch targets for expansion, simplified progress display
   - Mobile changes: Remove verbose labels ("47% Complete" → "47%")

4. **`src/components/drawing-table/ComponentRow.tsx`**
   - Current: Inline milestone checkboxes/sliders
   - Adaptation: Checkboxes remain inline, sliders open full-screen modal on mobile
   - Mobile changes: 44px checkbox hit area, tap → modal for partial milestones

**Hooks to Reuse**:

1. **`src/hooks/useUpdateMilestone.ts`**
   - Current: TanStack Query mutation calling `update_component_milestone` RPC
   - Reuse: Wrap with offline queue check before mutation
   - Changes: None to hook itself, wrapped by new `useSyncQueue()` hook

2. **`src/hooks/useDrawingsWithProgress.ts`**
   - Current: Fetches drawings + aggregated progress
   - Reuse: Works as-is for mobile, already uses TanStack Query with 2min stale time
   - Changes: None needed

3. **`src/hooks/useComponentsByDrawing.ts`**
   - Current: Lazy-loads components for expanded drawing
   - Reuse: Adequate for mobile lazy loading
   - Changes: None needed

### Tailwind CSS v4 Responsive Patterns

**Breakpoint Strategy**:
```typescript
// Mobile-first approach (Tailwind default)
// xs: 0-640px (phones)
// sm: 640-768px (large phones / small tablets)
// md: 768-1024px (tablets)
// lg: 1024px+ (desktop)

// Mobile UI applies to: xs + sm + md (0-1024px)
// Desktop UI applies to: lg+ (1024px+)
```

**Implementation Pattern**:
```tsx
<div className="flex flex-col lg:flex-row">  {/* Vertical mobile, horizontal desktop */}
  <button className="h-12 lg:h-10">         {/* 48px mobile (touch), 40px desktop */}
</div>
```

**Viewport Detection Hook**:
```typescript
// src/hooks/useMobileDetection.ts
export function useMobileDetection() {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 1024)

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth <= 1024)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  return isMobile
}
```

## Offline Queue Design

### localStorage API Feasibility

**Quota**: 5-10 MB typical (varies by browser)
**Usage**: 50 updates × ~500 bytes/update = ~25 KB (well under quota)

**Data Structure**:
```typescript
interface QueuedUpdate {
  id: string                    // UUID for deduplication
  component_id: string
  milestone_name: string
  value: boolean | number       // Discrete (boolean) or partial (0-100)
  timestamp: number             // Unix epoch ms
  retry_count: number           // 0-3 (max 3 retries)
}

interface OfflineQueue {
  updates: QueuedUpdate[]       // Max 50 entries
  last_sync_attempt: number | null
  sync_status: 'idle' | 'syncing' | 'error'
}

// localStorage key: 'pipetrak:offline-queue'
```

**Storage Operations**:
```typescript
// Add to queue (checks 50-entry limit)
function enqueueUpdate(update: QueuedUpdate): boolean {
  const queue = getQueue()
  if (queue.updates.length >= 50) {
    throw new Error('Update queue full (50/50)')
  }
  queue.updates.push(update)
  saveQueue(queue)
  return true
}

// Remove from queue (after successful sync)
function dequeueUpdate(id: string): void {
  const queue = getQueue()
  queue.updates = queue.updates.filter(u => u.id !== id)
  saveQueue(queue)
}
```

### Network Detection API

**Browser Support**: `navigator.onLine` supported in all modern browsers (IE9+)

**Implementation**:
```typescript
// src/hooks/useNetworkStatus.ts
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return isOnline
}
```

**Limitations**:
- `navigator.onLine` can report false positives (connected to network but no internet)
- Mitigation: Actual sync attempt will fail → retry logic handles gracefully

### Sync Strategy with Exponential Backoff

**Retry Timing**: 0s, 3s, 9s (true exponential: 3^0, 3^1, 3^2)

**Conflict Resolution**: Server-wins (silent discard)
- When sync fails with 409 Conflict status, assume server has newer version
- Remove queued update from localStorage without user notification
- Continue syncing remaining updates

**State Machine**:
```
States: idle | syncing | error
Transitions:
  idle → syncing: on network online event OR manual retry tap
  syncing → idle: all updates synced successfully
  syncing → error: all retries exhausted (3 attempts)
  error → syncing: user taps "Tap to retry" badge
```

**Implementation Pattern**:
```typescript
async function syncQueue(retryCount = 0): Promise<void> {
  const queue = getQueue()
  if (queue.updates.length === 0) return

  queue.sync_status = 'syncing'
  saveQueue(queue)

  for (const update of queue.updates) {
    try {
      await updateMilestone(update)  // Existing mutation
      dequeueUpdate(update.id)        // Remove on success
    } catch (error) {
      if (error.status === 409) {
        // Server-wins: silently discard
        dequeueUpdate(update.id)
        continue
      }

      // Other errors: retry with backoff
      if (retryCount < 3) {
        const delay = Math.pow(3, retryCount) * 1000  // 0s, 3s, 9s
        await sleep(delay)
        return syncQueue(retryCount + 1)
      }

      // Max retries exhausted
      queue.sync_status = 'error'
      saveQueue(queue)
      throw error
    }
  }

  queue.sync_status = 'idle'
  saveQueue(queue)
}
```

## Responsive UI Patterns

### Touch Target Sizing

**WCAG 2.1 AA Requirement**: Minimum 44×44px touch targets (Level AAA: 48×48px)

**Implementation**:
```tsx
// Discrete milestone checkbox (mobile)
<button
  className="h-11 w-11 lg:h-8 lg:w-8"  // 44px mobile, 32px desktop
  onClick={handleToggle}
>
  <Checkbox checked={complete} />
</button>

// Partial milestone slider trigger (mobile)
<button
  className="min-h-[44px] w-full lg:min-h-[32px]"
  onClick={openFullScreenModal}
>
  {value}%
</button>
```

### Full-Screen Modal for Sliders

**Desktop**: Radix Popover (hover/click, inline positioning)
**Mobile**: Radix Dialog (full-screen modal, large slider)

**Component**: `MobilePartialMilestoneEditor.tsx`
```tsx
export function MobilePartialMilestoneEditor({
  milestone,
  value,
  onSave,
  onCancel
}: Props) {
  const isMobile = useMobileDetection()

  if (!isMobile) {
    return <PartialMilestonePopover {...props} />  // Desktop popover
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="h-screen w-screen max-w-none">
        <DialogTitle>{milestone}</DialogTitle>
        <div className="flex flex-col items-center justify-center h-full">
          <Slider
            value={[localValue]}
            onValueChange={([v]) => setLocalValue(v)}
            max={100}
            step={1}
            className="w-4/5 h-12"  // Large, draggable slider
          />
          <div className="text-4xl font-bold mt-8">{localValue}%</div>
        </div>
        <DialogFooter className="flex gap-4">
          <Button size="lg" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button size="lg" onClick={() => onSave(localValue)}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

### Vertical Filter Stacking

**Desktop**: Horizontal filters (flex-row)
**Mobile**: Vertical stack (flex-col)

```tsx
<div className="flex flex-col gap-4 lg:flex-row lg:gap-2">
  <DrawingSearchInput />
  <StatusFilterDropdown />
  <CollapseAllButton />
</div>
```

## Performance Considerations

### Page Load Optimization

**Target**: <3s on 4G (100 drawings visible)

**Strategies**:
1. **TanStack Query caching**: 2-minute stale time reduces refetches
2. **Virtualization**: Only render visible rows (5-row overscan on mobile vs 10 on desktop)
3. **Lazy loading**: Components loaded on drawing expansion, not upfront
4. **Image optimization**: Progress bars use CSS gradients (no images)

**Measurement**:
```typescript
// Add performance mark in DrawingComponentTablePage
useEffect(() => {
  performance.mark('mobile-page-loaded')
  const measure = performance.measure('page-load', 'navigationStart', 'mobile-page-loaded')
  if (measure.duration > 3000) {
    console.warn(`Page load exceeded target: ${measure.duration}ms`)
  }
}, [])
```

### Optimistic UI Updates

**Target**: <50ms perceived latency

**Strategy**: Update UI immediately, rollback on error
```typescript
const mutation = useUpdateMilestone({
  onMutate: async (newValue) => {
    // Cancel outbound refetches
    await queryClient.cancelQueries(['components', componentId])

    // Snapshot previous value
    const previous = queryClient.getQueryData(['components', componentId])

    // Optimistically update (instant UI change)
    queryClient.setQueryData(['components', componentId], (old) => ({
      ...old,
      milestones: { ...old.milestones, [milestoneName]: newValue }
    }))

    return { previous }
  },
  onError: (err, newValue, context) => {
    // Rollback on error
    queryClient.setQueryData(['components', componentId], context.previous)
  }
})
```

## Technology Stack Validation

### Dependencies (No New Packages Required)

**Already Installed**:
- ✅ React 18.3.1
- ✅ TanStack Query v5
- ✅ Radix UI primitives (Dialog, Slider, Checkbox)
- ✅ Tailwind CSS v4
- ✅ Vitest + Testing Library

**No New Dependencies** - Feature uses existing stack.

### Browser Compatibility

**Target**: Latest 2 versions of major mobile browsers

**APIs Used**:
- ✅ localStorage (IE8+, all mobile browsers)
- ✅ navigator.onLine (IE9+, all mobile browsers)
- ✅ window.matchMedia (IE10+, all mobile browsers)
- ✅ CSS Grid/Flexbox (IE11+ with prefixes, all modern mobile)
- ✅ Touch Events (all mobile browsers)

**No polyfills needed** for target browsers.

## Risks & Mitigations

### Risk 1: localStorage Quota Exceeded
**Probability**: Low
**Impact**: Medium (blocks new offline updates)
**Mitigation**:
- Enforce 50-update hard limit (prevents unbounded growth)
- Show error toast with clear guidance: "Update queue full (50/50) - please reconnect to sync"
- Provide manual "Clear Queue" escape hatch in settings (future enhancement)

### Risk 2: Race Conditions in Sync Queue
**Probability**: Low
**Impact**: Medium (duplicate updates or data loss)
**Mitigation**:
- Sequential processing (process one update at a time, not parallel)
- UUID-based deduplication (prevent duplicate queue entries)
- Atomic localStorage operations (read → modify → write in single sync function)

### Risk 3: Optimistic UI Desync on Navigation
**Probability**: Medium
**Impact**: Low (user sees stale data briefly)
**Mitigation**:
- Persist queue across sessions (updates survive page navigation)
- Show persistent "X updates pending" badge (user awareness)
- Sync attempt on every page load if queue non-empty

### Risk 4: Server-Wins Conflict Silent Discard Confusion
**Probability**: Low
**Impact**: Low (user unaware their update was discarded)
**Mitigation**:
- Acceptable per clarification (silent discard by design)
- Low probability: requires two users updating same milestone while offline simultaneously
- If problematic in practice: future enhancement to show passive toast ("1 update outdated")

## Recommended Next Steps

1. **Phase 1**: Generate data-model.md with offline queue schema and sync state machine
2. **Phase 1**: Create contract tests for:
   - Offline queue operations (add, remove, 50-entry limit)
   - Responsive UI breakpoints (viewport detection, touch targets)
   - Sync behavior (retry, exponential backoff, server-wins)
3. **Phase 1**: Write quickstart.md for developers (testing offline mode, mobile viewport testing)
4. **Phase 2**: Generate tasks.md with TDD-ordered implementation

**Status**: ✅ Research complete, no blockers identified. Proceed to Phase 1.

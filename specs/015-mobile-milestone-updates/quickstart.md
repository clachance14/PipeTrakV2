# Quickstart Guide: Mobile Milestone Updates

**Feature**: 015-mobile-milestone-updates
**Audience**: Developers implementing or testing this feature
**Prerequisites**: Feature 010 (Drawing-Centered Component Progress Table) already implemented

## 🚀 Getting Started

### 1. Development Environment Setup

**Install Dependencies** (no new packages needed):
```bash
# All required dependencies already installed
npm install  # Verify existing packages

# Key packages used:
# - React 18.3.1
# - TanStack Query v5
# - Radix UI (Dialog, Slider, Checkbox)
# - Tailwind CSS v4
# - Vitest + Testing Library
```

**No New Dependencies Required** - This feature uses the existing stack.

### 2. Mobile Testing Setup

**Browser DevTools (Recommended for Quick Testing)**:
```
1. Open Chrome/Edge DevTools (F12)
2. Click "Toggle device toolbar" (Ctrl+Shift+M)
3. Select preset device:
   - iPhone SE (375×667) - Mobile small
   - iPhone 12 Pro (390×844) - Mobile medium
   - iPad (768×1024) - Tablet
4. Or custom dimensions: 375×667 for mobile testing
```

**Testing on Real Devices**:
```bash
# Find your local IP address
ipconfig  # Windows
ifconfig  # Mac/Linux

# Start dev server bound to network
npm run dev -- --host

# Access from mobile device:
# http://192.168.1.x:5173 (replace with your IP)
```

**Mobile-Specific Browser Extensions** (Optional):
- Responsive Viewer (Chrome) - Test multiple viewports simultaneously
- BrowserStack (paid) - Test on real mobile devices remotely

### 3. Testing Offline Mode

**Method 1: Browser DevTools (Easiest)**:
```
1. Open DevTools → Network tab
2. Check "Offline" checkbox (throttling dropdown)
3. Try updating milestones → should queue to localStorage
4. Uncheck "Offline" → updates auto-sync
```

**Method 2: Airplane Mode (Real Device)**:
```
1. Connect phone to dev server (http://192.168.1.x:5173)
2. Enable airplane mode
3. Update milestones → verify "Updates pending" badge
4. Disable airplane mode → verify auto-sync
```

**Method 3: Service Worker (Advanced)**:
```javascript
// For integration tests with mock SW
navigator.serviceWorker.ready.then(reg => {
  reg.active.postMessage({ type: 'GO_OFFLINE' })
})
```

### 4. localStorage Inspection

**View Offline Queue**:
```
1. Open DevTools → Application tab (Chrome) or Storage tab (Firefox)
2. Expand Local Storage → http://localhost:5173
3. Find key: pipetrak:offline-queue
4. Click to view JSON value
```

**Manual Queue Manipulation** (for testing):
```javascript
// In browser console:

// View current queue
JSON.parse(localStorage.getItem('pipetrak:offline-queue'))

// Clear queue (reset)
localStorage.removeItem('pipetrak:offline-queue')

// Add fake updates (for testing sync)
const fakeQueue = {
  updates: [
    {
      id: crypto.randomUUID(),
      component_id: 'your-component-id-here',
      milestone_name: 'Receive',
      value: true,
      timestamp: Date.now(),
      retry_count: 0,
      user_id: 'your-user-id-here'
    }
  ],
  last_sync_attempt: null,
  sync_status: 'idle',
  failed_updates: []
}
localStorage.setItem('pipetrak:offline-queue', JSON.stringify(fakeQueue))

// Trigger online event to start sync
window.dispatchEvent(new Event('online'))
```

## 📝 Implementation Workflow

### Phase 1: TDD Setup (Write Tests First)

**1. Create Contract Tests** (before any implementation):
```bash
# Create test files
touch tests/contract/offline-queue.contract.test.ts
touch tests/contract/responsive-ui.contract.test.ts
touch tests/contract/sync-behavior.contract.test.ts

# Run tests (will fail - Red phase)
npm test tests/contract/offline-queue.contract.test.ts
```

**2. Create Integration Tests**:
```bash
# Create test files
touch tests/integration/mobile-milestone-update.test.tsx
touch tests/integration/mobile-search-filter.test.tsx
touch tests/integration/offline-sync.test.tsx
touch tests/integration/mobile-progress-view.test.tsx

# Run tests (will fail - Red phase)
npm test tests/integration/
```

### Phase 2: Implementation (Make Tests Pass)

**1. Implement Core Libraries** (src/lib):
```bash
# Create utility modules
touch src/lib/offline-queue.ts        # Queue operations (enqueue, dequeue)
touch src/lib/sync-manager.ts         # Sync orchestration with retry
touch src/lib/responsive-utils.ts     # Viewport helpers

# Implement functions to pass contract tests
npm test tests/contract/offline-queue.contract.test.ts -- --watch
```

**2. Implement Custom Hooks** (src/hooks):
```bash
# Create new hooks
touch src/hooks/useOfflineQueue.ts    # Queue state management
touch src/hooks/useNetworkStatus.ts   # navigator.onLine wrapper
touch src/hooks/useSyncQueue.ts       # Sync orchestration hook
touch src/hooks/useMobileDetection.ts # Viewport detection

# Test hooks in isolation
npm test src/hooks/useOfflineQueue.test.ts
```

**3. Adapt Existing Components** (src/components):
```bash
# Modify existing files (from Feature 010)
# - src/pages/DrawingComponentTablePage.tsx (wrap with viewport detection)
# - src/components/drawing-table/DrawingTable.tsx (add mobile layout)
# - src/components/drawing-table/DrawingRow.tsx (increase touch targets)
# - src/components/drawing-table/ComponentRow.tsx (conditional modal)

# Create new mobile-specific component
touch src/components/drawing-table/MobilePartialMilestoneEditor.tsx

# Run integration tests
npm test tests/integration/mobile-milestone-update.test.tsx -- --watch
```

### Phase 3: Verification (Green Phase)

```bash
# Run all tests
npm test

# Check coverage
npm test -- --coverage

# Type check
tsc -b

# Lint
npm run lint
```

## 🧪 Testing Checklist

### Manual Testing Scenarios

**Scenario 1: Mobile Milestone Update (User Story 1)**
- [ ] Open drawings page on mobile viewport (375px)
- [ ] Tap drawing row → expands to show components
- [ ] Tap discrete milestone checkbox → toggles instantly
- [ ] Tap partial milestone → full-screen modal opens
- [ ] Drag slider to 75% → Save → modal closes, value updated
- [ ] Verify drawing progress recalculates
- [ ] Verify toast confirmation appears

**Scenario 2: Mobile Search & Filter (User Story 2)**
- [ ] Tap search input → type "P-001"
- [ ] Verify results filter (500ms debounce)
- [ ] Tap status filter → select "In Progress"
- [ ] Verify only 1-99% drawings shown
- [ ] Tap hamburger menu → sidebar slides in
- [ ] Navigate to /packages → sidebar closes

**Scenario 3: Offline Sync (User Story 3)**
- [ ] Go offline (DevTools → Network → Offline)
- [ ] Update 3 milestones
- [ ] Verify "3 updates pending" badge appears
- [ ] Verify localStorage contains 3 updates
- [ ] Go online → verify auto-sync starts
- [ ] Verify badge shows "Syncing..."
- [ ] Verify badge shows green checkmark briefly
- [ ] Verify badge disappears after sync

**Scenario 4: Retry Logic**
- [ ] Mock 500 error from server (see below)
- [ ] Update milestone → verify first retry immediate
- [ ] Verify second retry after 3s
- [ ] Verify third retry after 9s
- [ ] Verify error badge after 3 failures
- [ ] Tap "Tap to retry" → verify retry cycle restarts

**Scenario 5: Server-Wins Conflict**
- [ ] Mock 409 Conflict from server
- [ ] Update milestone → verify silent discard
- [ ] Verify NO error toast shown
- [ ] Verify update removed from queue
- [ ] Verify other updates continue syncing

### Automated Test Coverage

**Contract Tests** (60 tests total):
```bash
# Offline Queue (C001-C015): 15 tests
npm test offline-queue.contract.test.ts

# Responsive UI (C016-C035): 20 tests
npm test responsive-ui.contract.test.ts

# Sync Behavior (C036-C060): 25 tests
npm test sync-behavior.contract.test.ts
```

**Integration Tests** (4 suites):
```bash
# User Story 1: Mobile Milestone Update
npm test mobile-milestone-update.test.tsx

# User Story 2: Mobile Search & Filter
npm test mobile-search-filter.test.tsx

# User Story 3: Offline Sync
npm test offline-sync.test.tsx

# User Story 4: Mobile Progress View
npm test mobile-progress-view.test.tsx
```

## 🛠️ Development Tips

### Mocking Server Errors (for Testing Retry Logic)

**Method 1: Vitest Mock**:
```typescript
// In your test file
vi.spyOn(supabase, 'rpc').mockRejectedValueOnce({
  status: 500,
  message: 'Server error'
})

// Or 409 Conflict
vi.spyOn(supabase, 'rpc').mockRejectedValueOnce({
  status: 409,
  message: 'Conflict'
})
```

**Method 2: MSW (Mock Service Worker)**:
```typescript
// In tests/mocks/handlers.ts
export const handlers = [
  http.post('/rest/v1/rpc/update_component_milestone', () => {
    return HttpResponse.json({ error: 'Server error' }, { status: 500 })
  })
]
```

**Method 3: Dev Server Proxy Override** (for manual testing):
```typescript
// vite.config.ts
export default defineConfig({
  server: {
    proxy: {
      '/rest/v1/rpc/update_component_milestone': {
        target: 'http://localhost:54321',  // Supabase local
        configure: (proxy, options) => {
          proxy.on('proxyReq', (proxyReq, req, res) => {
            // Simulate 500 error for testing
            res.writeHead(500, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ error: 'Simulated server error' }))
          })
        }
      }
    }
  }
})
```

### Debugging Sync Issues

**Enable Verbose Logging**:
```typescript
// src/lib/sync-manager.ts
const DEBUG = import.meta.env.DEV  // Only in development

export async function syncQueue() {
  const queue = initQueue()
  if (DEBUG) console.log('[Sync] Starting sync, queue length:', queue.updates.length)

  for (const update of queue.updates) {
    if (DEBUG) console.log('[Sync] Processing update:', update.id, update.milestone_name)
    try {
      await updateMilestone(update)
      if (DEBUG) console.log('[Sync] Success:', update.id)
    } catch (error) {
      if (DEBUG) console.error('[Sync] Error:', update.id, error)
      // ... error handling
    }
  }
}
```

**React Query DevTools** (already installed):
```tsx
// Add to App.tsx during development
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'

function App() {
  return (
    <>
      {/* Your app */}
      <ReactQueryDevtools initialIsOpen={false} />
    </>
  )
}
```

### Touch Target Verification

**Visual Debug Helper** (add to Tailwind config):
```css
/* Add to your dev-only styles */
.touch-target-debug * {
  outline: 2px solid red !important;
}

.touch-target-debug [role="button"],
.touch-target-debug button {
  outline: 2px solid green !important;
}
```

**Automated Verification in Tests**:
```typescript
function assertTouchTarget(element: HTMLElement, minSize = 44) {
  const rect = element.getBoundingClientRect()
  expect(rect.width, `Width ${rect.width}px < ${minSize}px`).toBeGreaterThanOrEqual(minSize)
  expect(rect.height, `Height ${rect.height}px < ${minSize}px`).toBeGreaterThanOrEqual(minSize)
}
```

## 🐛 Common Issues & Solutions

### Issue 1: localStorage Not Mocked in Tests
**Error**: `ReferenceError: localStorage is not defined`

**Solution**:
```typescript
// tests/setup.ts (add to Vitest config)
const storage = new Map<string, string>()

global.localStorage = {
  getItem: (key) => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, value),
  removeItem: (key) => storage.delete(key),
  clear: () => storage.clear(),
  length: storage.size,
  key: (index) => Array.from(storage.keys())[index] ?? null
}

beforeEach(() => {
  storage.clear()
})
```

### Issue 2: Viewport Resize Not Triggering Re-render
**Symptom**: useMobileDetection() not updating after window.innerWidth change

**Solution**:
```typescript
// Ensure resize event is dispatched
Object.defineProperty(window, 'innerWidth', { value: 375, writable: true })
window.dispatchEvent(new Event('resize'))

// Wait for React to re-render
await waitFor(() => {
  expect(screen.getByTestId('mobile-layout')).toBeInTheDocument()
})
```

### Issue 3: Sync Not Triggered on Online Event
**Symptom**: Going online doesn't auto-sync queue

**Debug**:
```typescript
// Check if event listener registered
console.log('Online event listeners:', window.eventListeners?.('online'))

// Manually trigger for testing
window.dispatchEvent(new Event('online'))

// Verify navigator.onLine value
console.log('navigator.onLine:', navigator.onLine)
```

### Issue 4: Race Condition in Sync Queue
**Symptom**: Duplicate RPC calls or queue corruption

**Solution**: Ensure syncQueue() debounced:
```typescript
let isSyncing = false

export async function syncQueue() {
  if (isSyncing) {
    console.warn('[Sync] Already syncing, skipping')
    return
  }
  isSyncing = true
  try {
    // ... sync logic
  } finally {
    isSyncing = false
  }
}
```

## 📚 Key Files Reference

### Implementation Files
- `src/lib/offline-queue.ts` - Queue CRUD operations
- `src/lib/sync-manager.ts` - Sync orchestration, retry logic
- `src/lib/responsive-utils.ts` - Viewport helpers
- `src/hooks/useOfflineQueue.ts` - Queue state hook
- `src/hooks/useNetworkStatus.ts` - Network detection hook
- `src/hooks/useSyncQueue.ts` - Sync orchestration hook
- `src/hooks/useMobileDetection.ts` - Viewport detection hook
- `src/components/drawing-table/MobilePartialMilestoneEditor.tsx` - Full-screen modal

### Test Files
- `tests/contract/offline-queue.contract.test.ts` - 15 queue tests
- `tests/contract/responsive-ui.contract.test.ts` - 20 responsive tests
- `tests/contract/sync-behavior.contract.test.ts` - 25 sync tests
- `tests/integration/mobile-milestone-update.test.tsx` - User Story 1
- `tests/integration/mobile-search-filter.test.tsx` - User Story 2
- `tests/integration/offline-sync.test.tsx` - User Story 3
- `tests/integration/mobile-progress-view.test.tsx` - User Story 4

### Documentation
- `specs/015-mobile-milestone-updates/spec.md` - Feature specification
- `specs/015-mobile-milestone-updates/research.md` - Technical research
- `specs/015-mobile-milestone-updates/data-model.md` - Data structures
- `specs/015-mobile-milestone-updates/contracts/` - Contract test specs

## 🎯 Next Steps

1. **Start TDD Cycle**: Write first contract test (C001), watch it fail
2. **Implement Incrementally**: Make one test pass at a time (Green phase)
3. **Refactor**: Clean up code while keeping tests green
4. **Manual Test**: Verify on real mobile device
5. **Code Review**: Use `/review` command before merging

**Ready to begin?** Start with contract test C001 (Enqueue Update Under Limit).

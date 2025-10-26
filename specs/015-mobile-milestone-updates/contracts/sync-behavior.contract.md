# Contract Test: Sync Behavior & Retry Logic

**Feature**: 015-mobile-milestone-updates
**Component**: Sync Manager (network detection, retry, conflict resolution)
**Purpose**: Verify sync orchestration follows specified behavior

## Test Suite: sync-behavior.contract.test.ts

### C036: Network Status - Online Detection
**Given**: navigator.onLine = true
**When**: useNetworkStatus() hook called
**Then**:
- Returns isOnline = true
- No sync triggered automatically (waits for offline→online transition)

### C037: Network Status - Offline Detection
**Given**: navigator.onLine = false
**When**: useNetworkStatus() hook called
**Then**:
- Returns isOnline = false
- Milestone updates queued to localStorage (not sent to server)

### C038: Network Status - Offline to Online Transition
**Given**: isOnline = false, queue has 3 updates
**When**: 'online' event fired (navigator.onLine becomes true)
**Then**:
- syncQueue() automatically triggered
- Queue processing starts (sync_status = 'syncing')
- No user action required

### C039: Network Status - Online to Offline Transition
**Given**: isOnline = true
**When**: 'offline' event fired (navigator.onLine becomes false)
**Then**:
- isOnline updates to false
- Future milestone updates enqueued to localStorage
- Pending badge appears in header

### C040: Sync Success - Single Update
**Given**: Queue has 1 update, network online
**When**: syncQueue() called
**Then**:
- RPC `update_component_milestone` called with update data
- On 200 OK response: update dequeued
- sync_status = 'idle'
- Success toast shown
- Pending badge removed

### C041: Sync Success - Multiple Updates
**Given**: Queue has 5 updates, network online
**When**: syncQueue() called
**Then**:
- 5 RPC calls made sequentially (not parallel)
- Each successful call dequeues corresponding update
- sync_status = 'idle' after all complete
- Toast shows "5 updates synced"

### C042: Sync Failure - First Retry (0s)
**Given**: Queue has 1 update, network online, server returns 500
**When**: syncQueue() called
**Then**:
- RPC fails with 500 error
- retry_count incremented to 1
- Immediate retry (0s delay) triggered
- Update remains in queue
- sync_status remains 'syncing'

### C043: Sync Failure - Second Retry (3s)
**Given**: retry_count = 1, RPC fails again with 500
**When**: Second retry triggered
**Then**:
- 3-second delay before retry (setTimeout(3000))
- retry_count incremented to 2
- RPC called again after 3s
- Update remains in queue

### C044: Sync Failure - Third Retry (9s)
**Given**: retry_count = 2, RPC fails again with 500
**When**: Third retry triggered
**Then**:
- 9-second delay before retry (setTimeout(9000))
- retry_count incremented to 3
- RPC called again after 9s
- This is the FINAL retry

### C045: Sync Failure - Max Retries Exhausted
**Given**: retry_count = 3, RPC fails again with 500
**When**: syncQueue() processes failed update
**Then**:
- Update moved to failed_updates array
- Update removed from active queue
- sync_status = 'error'
- Error toast shown: "X updates failed - tap to retry"
- Red warning badge persists

### C046: Exponential Backoff Timing Verification
**Given**: Update fails sync 3 times
**When**: Retry delays measured
**Then**:
- Retry 1: 0ms delay (immediate)
- Retry 2: 3000ms delay (3 seconds)
- Retry 3: 9000ms delay (9 seconds)
- Formula: delay = 3^retryCount * 1000ms

### C047: Manual Retry After Error
**Given**: sync_status = 'error', 2 failed updates in queue
**When**: User taps "Tap to retry" badge
**Then**:
- sync_status = 'syncing'
- syncQueue() called again
- Failed updates moved back to active queue with retry_count reset to 0
- New retry cycle begins

### C048: Server-Wins Conflict (409) - Silent Discard
**Given**: Queue has 1 update, network online
**When**: RPC returns 409 Conflict status
**Then**:
- Update dequeued immediately (no retry)
- No user notification (silent discard per clarification)
- Continue syncing next update in queue
- No error toast shown
- Server-wins count incremented (for debugging only)

### C049: Server-Wins Conflict (409) - Multiple Updates
**Given**: Queue has 5 updates, 2 return 409 Conflict
**When**: syncQueue() called
**Then**:
- 2 updates with 409 silently discarded
- 3 updates successfully synced
- Toast shows "3 updates synced" (no mention of discarded)
- sync_status = 'idle'

### C050: Auth Error (401) - Clear Queue
**Given**: Queue has 3 updates, user session expired
**When**: RPC returns 401 Unauthorized
**Then**:
- Queue cleared (all updates removed)
- sync_status = 'idle'
- Toast: "Session expired - please log in again"
- Redirect to login page
- No retry attempted (auth issue, not network)

### C051: Sync During Page Navigation
**Given**: sync_status = 'syncing', queue has 3 updates (1 synced, 2 pending)
**When**: User navigates to different page (e.g., /packages)
**Then**:
- Queue persists in localStorage
- sync_status remains 'syncing'
- Sync continues on new page
- Pending badge visible on new page

### C052: Sync State Machine - Idle to Syncing
**Given**: sync_status = 'idle', queue empty
**When**: User goes offline and enqueues 2 updates, then goes online
**Then**:
- State transitions: idle → syncing
- syncQueue() triggered automatically
- Pending badge shows during sync

### C053: Sync State Machine - Syncing to Idle
**Given**: sync_status = 'syncing', queue has 2 updates
**When**: Both updates sync successfully
**Then**:
- State transitions: syncing → idle
- Queue empty
- Pending badge removed
- Green checkmark indicator shown briefly (1s)

### C054: Sync State Machine - Syncing to Error
**Given**: sync_status = 'syncing', 1 update fails after 3 retries
**When**: Max retries exhausted
**Then**:
- State transitions: syncing → error
- Red warning badge shown
- Failed update in failed_updates array
- "Tap to retry" action available

### C055: Sync State Machine - Error to Syncing
**Given**: sync_status = 'error', user taps "Tap to retry"
**When**: Manual retry initiated
**Then**:
- State transitions: error → syncing
- Failed updates moved back to active queue
- retry_count reset to 0 for all failed updates
- Sync attempt begins

### C056: Concurrent Sync Prevention
**Given**: sync_status = 'syncing'
**When**: User taps "Retry" again OR another online event fires
**Then**:
- No second sync initiated (debounced)
- sync_status remains 'syncing'
- Existing sync continues undisturbed

### C057: Sync Progress Indicator
**Given**: sync_status = 'syncing', queue has 10 updates
**When**: Sync in progress
**Then**:
- Badge shows "X/10 syncing..." (updates as each completes)
- Progress visible to user
- Badge updates after each successful dequeue

### C058: Sync With Empty Queue
**Given**: Queue empty
**When**: syncQueue() called (e.g., manual retry when no updates)
**Then**:
- No RPC calls made
- sync_status = 'idle'
- No error thrown
- No toast shown

### C059: Optimistic UI During Offline
**Given**: User offline, milestone checkbox unchecked
**When**: User taps checkbox
**Then**:
- UI updates instantly (checkbox checked)
- Update queued to localStorage
- No server call made yet
- Pending badge shows "1 update pending"

### C060: Optimistic UI Rollback on Auth Error
**Given**: User online, taps milestone, 401 Unauthorized returned
**When**: Sync fails with auth error
**Then**:
- UI reverts to previous state (optimistic rollback)
- Toast: "Session expired - please log in again"
- Update removed from queue

## Test Data

### Sample Sync Payloads
```typescript
const sampleRpcPayload = {
  p_component_id: '660e8400-e29b-41d4-a716-446655440000',
  p_milestone_name: 'Receive',
  p_new_value: true,
  p_user_id: '770e8400-e29b-41d4-a716-446655440000'
}

const sampleRpcResponse200 = {
  component: { id: '660e8400...', percent_complete: 50 },
  previous_value: false,
  audit_event_id: '880e8400-e29b-41d4-a716-446655440000'
}

const sampleRpcResponse409 = {
  error: 'Conflict: milestone already updated by another user',
  status: 409
}

const sampleRpcResponse500 = {
  error: 'Internal server error',
  status: 500
}
```

## Mocking Strategy

### navigator.onLine Mock
```typescript
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true
})

function goOffline() {
  Object.defineProperty(navigator, 'onLine', { value: false })
  window.dispatchEvent(new Event('offline'))
}

function goOnline() {
  Object.defineProperty(navigator, 'onLine', { value: true })
  window.dispatchEvent(new Event('online'))
}
```

### Supabase RPC Mock
```typescript
const mockUpdateMilestone = vi.fn()

vi.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: vi.fn(() => ({
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: sampleRpcResponse200, error: null })
    }))
  }
}))

// Simulate failure
mockUpdateMilestone.mockRejectedValueOnce({ status: 500, message: 'Server error' })

// Simulate 409 Conflict
mockUpdateMilestone.mockRejectedValueOnce({ status: 409, message: 'Conflict' })
```

### setTimeout Mock (for retry delays)
```typescript
vi.useFakeTimers()

// Fast-forward time in tests
await vi.advanceTimersByTimeAsync(3000)  // Skip 3s delay
```

## Coverage Requirements

- **Lines**: ≥80% (src/lib/sync-manager.ts)
- **Branches**: ≥80% (error paths, state transitions)
- **Functions**: 100% (all sync functions tested)

## Success Criteria

✅ All 25 contract tests pass (C036-C060)
✅ Coverage requirements met
✅ Retry timing verified (0s, 3s, 9s)
✅ State machine transitions validated
✅ Server-wins silent discard confirmed
✅ No sync race conditions

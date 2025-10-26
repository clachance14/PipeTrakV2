# Data Model: Mobile Milestone Updates

**Feature**: 015-mobile-milestone-updates
**Phase**: Phase 1 - Data Structures & Storage Patterns
**Date**: 2025-10-24

## Overview

This feature introduces **no new database tables**. All data structures are client-side (localStorage) for offline queue management. Existing Supabase tables (`components`, `milestones`, `progress_templates`) are reused without modification.

## Client-Side Data Structures

### 1. QueuedUpdate

**Purpose**: Represents a single milestone update queued while offline

**Storage**: localStorage key `pipetrak:offline-queue`

**Schema**:
```typescript
interface QueuedUpdate {
  id: string                    // UUID v4 for deduplication
  component_id: string          // Foreign key to components.id (Supabase)
  milestone_name: string        // Milestone identifier (e.g., "Receive", "Install")
  value: boolean | number       // boolean for discrete, 0-100 for partial
  timestamp: number             // Unix epoch milliseconds (Date.now())
  retry_count: number           // 0-3 (increments on sync failure)
  user_id: string               // User who created the update (auth.uid())
}
```

**Validation Rules**:
- `id`: Must be unique UUID v4
- `component_id`: Must be valid UUID matching existing component
- `milestone_name`: Non-empty string, max 50 chars
- `value`:
  - If boolean: true or false only
  - If number: Integer 0-100 inclusive
- `timestamp`: Positive integer (ms since epoch)
- `retry_count`: Integer 0-3 inclusive
- `user_id`: Must be valid UUID matching authenticated user

**Lifecycle**:
1. **Created**: When user updates milestone while `navigator.onLine === false`
2. **Queued**: Persisted to localStorage, max 50 entries enforced
3. **Synced**: On network reconnect, attempts RPC call `update_component_milestone`
4. **Deleted**: After successful sync OR after 3 failed retries OR on 409 Conflict (server-wins)

**Constraints**:
- **Max 50 entries**: Enforced by `enqueueUpdate()` function
- **No duplicates**: Checked by `component_id + milestone_name` composite key before enqueue
- **Atomic operations**: Read-modify-write localStorage in single function scope

### 2. OfflineQueue

**Purpose**: Container for all queued updates + sync metadata

**Storage**: localStorage key `pipetrak:offline-queue`

**Schema**:
```typescript
interface OfflineQueue {
  updates: QueuedUpdate[]               // Array of queued updates (max 50)
  last_sync_attempt: number | null      // Unix epoch ms of last sync (null if never synced)
  sync_status: SyncStatus               // Current sync state machine status
  failed_updates: FailedUpdate[]        // Updates that exhausted retries (max 10, FIFO)
}

type SyncStatus = 'idle' | 'syncing' | 'error'

interface FailedUpdate {
  update: QueuedUpdate
  error_message: string
  failed_at: number                     // Unix epoch ms
}
```

**State Machine** (sync_status):
```
idle:
  - Queue is empty OR all updates synced
  - Transitions: → syncing (on network online event OR manual retry)

syncing:
  - Actively processing queue, sending updates to server
  - Transitions: → idle (all synced), → error (max retries exhausted)

error:
  - At least one update failed after 3 retries
  - Transitions: → syncing (user taps "Tap to retry" badge)
```

**Operations**:

```typescript
// Initialize queue (on app load)
function initQueue(): OfflineQueue {
  const stored = localStorage.getItem('pipetrak:offline-queue')
  if (!stored) {
    return {
      updates: [],
      last_sync_attempt: null,
      sync_status: 'idle',
      failed_updates: []
    }
  }
  return JSON.parse(stored)
}

// Save queue (after any mutation)
function saveQueue(queue: OfflineQueue): void {
  localStorage.setItem('pipetrak:offline-queue', JSON.stringify(queue))
}

// Enqueue update (add to queue)
function enqueueUpdate(update: Omit<QueuedUpdate, 'id' | 'timestamp' | 'retry_count'>): QueuedUpdate {
  const queue = initQueue()

  // Enforce 50-entry limit
  if (queue.updates.length >= 50) {
    throw new Error('Update queue full (50/50) - please reconnect to sync pending updates')
  }

  // Check for duplicate (component_id + milestone_name)
  const duplicate = queue.updates.find(
    u => u.component_id === update.component_id && u.milestone_name === update.milestone_name
  )
  if (duplicate) {
    // Update existing entry instead of adding duplicate
    duplicate.value = update.value
    duplicate.timestamp = Date.now()
    saveQueue(queue)
    return duplicate
  }

  // Create new entry
  const queuedUpdate: QueuedUpdate = {
    ...update,
    id: crypto.randomUUID(),
    timestamp: Date.now(),
    retry_count: 0
  }

  queue.updates.push(queuedUpdate)
  saveQueue(queue)
  return queuedUpdate
}

// Dequeue update (remove after successful sync)
function dequeueUpdate(id: string): void {
  const queue = initQueue()
  queue.updates = queue.updates.filter(u => u.id !== id)
  saveQueue(queue)
}

// Increment retry count (on sync failure)
function incrementRetry(id: string): number {
  const queue = initQueue()
  const update = queue.updates.find(u => u.id === id)
  if (!update) throw new Error(`Update ${id} not found in queue`)

  update.retry_count += 1

  // Move to failed_updates if max retries exhausted
  if (update.retry_count > 3) {
    queue.failed_updates.push({
      update,
      error_message: 'Max retries exhausted',
      failed_at: Date.now()
    })
    queue.updates = queue.updates.filter(u => u.id !== id)

    // Keep only last 10 failed updates (FIFO)
    if (queue.failed_updates.length > 10) {
      queue.failed_updates.shift()
    }
  }

  saveQueue(queue)
  return update.retry_count
}
```

### 3. SyncResult

**Purpose**: Return value from sync operation, used for UI feedback

**Schema**:
```typescript
interface SyncResult {
  success: boolean
  synced_count: number          // Number of successfully synced updates
  failed_count: number          // Number of updates that failed after retries
  server_wins_count: number     // Number of updates discarded due to 409 Conflict
  errors: SyncError[]           // Details of non-409 errors
}

interface SyncError {
  update_id: string
  component_id: string
  milestone_name: string
  error_message: string
  http_status: number | null
}
```

**Usage**:
```typescript
const result = await syncQueue()

if (result.success) {
  toast.success(`${result.synced_count} updates synced`)
} else {
  toast.error(`${result.failed_count} updates failed - tap to retry`)
}

// Server-wins conflicts are silent (no toast)
// result.server_wins_count tracked for debugging only
```

## Integration with Existing Data Model

### Existing Tables (No Changes)

**components** (from Feature 010):
```sql
CREATE TABLE components (
  id UUID PRIMARY KEY,
  drawing_id UUID REFERENCES drawings(id),
  component_type VARCHAR(50),
  percent_complete NUMERIC(5,2),
  -- ... other fields
);
```

**milestones** (from Feature 010):
```sql
CREATE TABLE milestones (
  id UUID PRIMARY KEY,
  component_id UUID REFERENCES components(id),
  milestone_name VARCHAR(50),
  value BOOLEAN OR NUMERIC(5,2),  -- Depends on progress_template.workflow_type
  -- ... other fields
);
```

**Existing RPC** (from Feature 010):
```sql
CREATE OR REPLACE FUNCTION update_component_milestone(
  p_component_id UUID,
  p_milestone_name VARCHAR,
  p_new_value NUMERIC,
  p_user_id UUID
) RETURNS JSONB;
```

### Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ User Action (Mobile)                                            │
│ Tap checkbox OR slide percentage                                │
└──────────────────┬──────────────────────────────────────────────┘
                   │
                   ▼
          ┌────────────────────┐
          │ useNetworkStatus() │
          │ Check online?      │
          └─────────┬──────────┘
                    │
        ┌───────────┴───────────┐
        │                       │
        ▼                       ▼
┌───────────────┐       ┌──────────────────┐
│ Online        │       │ Offline          │
│ Execute       │       │ Enqueue to       │
│ mutation      │       │ localStorage     │
│ directly      │       │ (max 50)         │
└───────┬───────┘       └────────┬─────────┘
        │                        │
        │                        ▼
        │               ┌────────────────────┐
        │               │ Optimistic UI      │
        │               │ Show pending badge │
        │               └────────┬───────────┘
        │                        │
        │                        ▼
        │               ┌────────────────────┐
        │               │ Network online     │
        │               │ event triggers     │
        │               │ syncQueue()        │
        │               └────────┬───────────┘
        │                        │
        └────────────────────────┘
                   │
                   ▼
          ┌────────────────────┐
          │ RPC:               │
          │ update_component_  │
          │ milestone()        │
          └─────────┬──────────┘
                    │
        ┌───────────┴────────────┐
        │                        │
        ▼                        ▼
┌───────────────┐       ┌────────────────────┐
│ 200 OK        │       │ 409 Conflict       │
│ Dequeue       │       │ (server-wins)      │
│ Show success  │       │ Dequeue silently   │
└───────────────┘       └────────────────────┘
```

## Performance Characteristics

### Storage Size Estimates

**Single QueuedUpdate**: ~500 bytes
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",           // 36 chars
  "component_id": "550e8400-e29b-41d4-a716-446655440000", // 36 chars
  "milestone_name": "Install",                            // ~10 chars avg
  "value": 75,                                            // 1-3 digits
  "timestamp": 1729785600000,                             // 13 digits
  "retry_count": 0,                                       // 1 digit
  "user_id": "550e8400-e29b-41d4-a716-446655440000"      // 36 chars
}
```

**Total**: ~132 chars × 2 bytes/char (Unicode) + JSON overhead ≈ 500 bytes

**Max Queue Size**: 50 updates × 500 bytes = **25 KB**

**localStorage Quota**: Typically 5-10 MB (200-400× larger than max queue)

### Operation Complexity

| Operation | Time Complexity | Notes |
|-----------|----------------|-------|
| initQueue() | O(1) | Parse JSON from localStorage |
| saveQueue() | O(n) | Serialize n updates to JSON |
| enqueueUpdate() | O(n) | Linear scan for duplicate check |
| dequeueUpdate() | O(n) | Filter array (creates new array) |
| incrementRetry() | O(n) | Find update + update in place |
| syncQueue() | O(n × m) | n updates × m retries (sequential) |

**Optimization Opportunities**:
- Use Map<string, QueuedUpdate> instead of array for O(1) duplicate checks
- Trade-off: More complex serialization/deserialization
- Decision: Array is sufficient for n ≤ 50

## Error Handling

### Enqueue Errors

**Error 1: Queue Full**
```typescript
// Thrown when: queue.updates.length >= 50
throw new Error('Update queue full (50/50) - please reconnect to sync pending updates')

// UI Response: Show error toast, block further updates
```

**Error 2: localStorage Quota Exceeded**
```typescript
// Thrown by: localStorage.setItem() when quota exceeded
catch (e) {
  if (e.name === 'QuotaExceededError') {
    throw new Error('Browser storage full - please clear browser data or sync updates')
  }
}

// UI Response: Show error toast with link to browser settings
```

### Sync Errors

**Error 1: Network Timeout**
```typescript
// Thrown when: Fetch timeout (>30s)
// Retry: Yes (increment retry_count, exponential backoff)
// Max Retries: 3 (0s, 3s, 9s)
```

**Error 2: 409 Conflict (Server-Wins)**
```typescript
// Thrown when: Server has newer version of milestone
// Retry: No (discard update silently)
// Action: dequeueUpdate(id), continue to next update
```

**Error 3: 401 Unauthorized**
```typescript
// Thrown when: User session expired
// Retry: No (auth issue, not network)
// Action: Clear queue, redirect to login, show toast
```

**Error 4: 500 Server Error**
```typescript
// Thrown when: Server RPC failure
// Retry: Yes (increment retry_count, exponential backoff)
// Max Retries: 3
```

## Testing Considerations

### localStorage Mocking (Vitest)

```typescript
// tests/setup/localStorage.mock.ts
const storage: Map<string, string> = new Map()

global.localStorage = {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => storage.set(key, value),
  removeItem: (key: string) => storage.delete(key),
  clear: () => storage.clear(),
  length: storage.size,
  key: (index: number) => Array.from(storage.keys())[index] ?? null
}

beforeEach(() => {
  storage.clear()
})
```

### Contract Test Scenarios

1. **Enqueue under limit**: Add 50 updates, verify all stored
2. **Enqueue over limit**: Add 51st update, expect error
3. **Duplicate handling**: Enqueue same component+milestone twice, expect update not duplicate
4. **Retry increment**: Fail sync 3 times, verify retry_count = 3
5. **Max retries**: Fail 4th time, verify moved to failed_updates
6. **Dequeue**: Sync successfully, verify update removed from queue
7. **Server-wins**: Return 409, verify silent discard (no error)
8. **State transitions**: idle → syncing → idle, syncing → error

## Migration Notes

**No database migrations required** - Feature is client-side only.

**localStorage Schema Versioning**:
If future changes require incompatible localStorage schema changes, use versioning:

```typescript
interface OfflineQueueV2 {
  version: 2                    // Schema version
  updates: QueuedUpdate[]
  // ... new fields
}

function migrateQueue(raw: string): OfflineQueue {
  const parsed = JSON.parse(raw)
  if (!parsed.version || parsed.version === 1) {
    // Migrate v1 → v2
    return { ...parsed, version: 2, new_field: default_value }
  }
  return parsed
}
```

## Summary

**Key Design Decisions**:
1. **Client-side only**: No database changes, all state in localStorage
2. **50-entry limit**: Prevents unbounded growth, well under localStorage quota
3. **Sequential sync**: Processes queue one update at a time (no parallelism)
4. **Server-wins**: 409 Conflicts discarded silently (per clarification)
5. **Exponential backoff**: True exponential (3^n) for retries

**Next Steps**:
- Generate contract tests (Phase 1)
- Write quickstart guide for developers (Phase 1)
- Break down into tasks with TDD ordering (Phase 2)

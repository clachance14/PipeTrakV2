# Contract Test: Offline Queue Management

**Feature**: 015-mobile-milestone-updates
**Component**: Offline Queue (localStorage)
**Purpose**: Verify offline queue operations follow specified behavior

## Test Suite: offline-queue.contract.test.ts

### C001: Enqueue Update Under Limit
**Given**: Queue has 49 updates
**When**: User enqueues 1 more update
**Then**:
- Update added successfully
- Queue length = 50
- localStorage contains serialized update
- New update has unique UUID id
- retry_count = 0
- timestamp within 100ms of Date.now()

### C002: Enqueue Update At Limit
**Given**: Queue has 50 updates
**When**: User attempts to enqueue 51st update
**Then**:
- Error thrown: "Update queue full (50/50) - please reconnect to sync pending updates"
- Queue length remains 50
- localStorage unchanged
- No new update created

### C003: Enqueue Duplicate Update
**Given**: Queue contains update for component A, milestone "Receive"
**When**: User enqueues another update for component A, milestone "Receive"
**Then**:
- No duplicate created
- Existing update's value replaced with new value
- Existing update's timestamp updated to Date.now()
- Queue length unchanged
- Only 1 update exists for component A + "Receive"

### C004: Dequeue Update After Sync
**Given**: Queue contains 3 updates with IDs [id1, id2, id3]
**When**: dequeueUpdate(id2) called
**Then**:
- Update id2 removed from queue
- Queue contains only [id1, id3]
- Queue length = 2
- localStorage updated with new queue

### C005: Increment Retry Count (Under Max)
**Given**: Queue contains update with retry_count = 1
**When**: incrementRetry(id) called
**Then**:
- retry_count = 2
- Update remains in queue.updates
- localStorage updated

### C006: Increment Retry Count (At Max)
**Given**: Queue contains update with retry_count = 3
**When**: incrementRetry(id) called
**Then**:
- Update removed from queue.updates
- Update moved to queue.failed_updates
- failed_updates entry contains:
  - Original update data
  - error_message = "Max retries exhausted"
  - failed_at timestamp within 100ms
- localStorage updated

### C007: Failed Updates FIFO Limit
**Given**: Queue has 10 failed updates
**When**: 11th update fails (retry_count exceeds 3)
**Then**:
- Oldest failed update removed (FIFO)
- New failed update added
- failed_updates.length = 10
- localStorage updated

### C008: Initialize Empty Queue
**Given**: localStorage has no 'pipetrak:offline-queue' key
**When**: initQueue() called
**Then**:
- Returns default OfflineQueue:
  ```typescript
  {
    updates: [],
    last_sync_attempt: null,
    sync_status: 'idle',
    failed_updates: []
  }
  ```

### C009: Initialize Existing Queue
**Given**: localStorage contains valid queue JSON
**When**: initQueue() called
**Then**:
- Returns parsed OfflineQueue
- All updates deserialized correctly
- Timestamps preserved as numbers
- UUIDs preserved as strings

### C010: Save Queue to localStorage
**Given**: Queue with 3 updates
**When**: saveQueue(queue) called
**Then**:
- localStorage.setItem called with key 'pipetrak:offline-queue'
- Value is valid JSON string
- JSON round-trips correctly (parse then stringify equals original)

### C011: localStorage Quota Exceeded
**Given**: localStorage is at quota limit
**When**: saveQueue(queue) called
**Then**:
- QuotaExceededError thrown
- Error message: "Browser storage full - please clear browser data or sync updates"
- Queue state not corrupted (previous state preserved)

### C012: Enqueue With Missing user_id
**Given**: User is authenticated
**When**: enqueueUpdate({ component_id, milestone_name, value }) without user_id
**Then**:
- user_id automatically populated from auth.uid()
- Update created successfully

### C013: Enqueue Discrete Milestone (Boolean)
**Given**: Milestone is discrete type
**When**: enqueueUpdate({ value: true })
**Then**:
- value stored as boolean true (not string "true")
- Type preserved after localStorage round-trip

### C014: Enqueue Partial Milestone (Number)
**Given**: Milestone is partial type
**When**: enqueueUpdate({ value: 75 })
**Then**:
- value stored as number 75 (not string "75")
- Type preserved after localStorage round-trip
- Value within range 0-100

### C015: Enqueue Invalid Partial Value
**Given**: Milestone is partial type
**When**: enqueueUpdate({ value: 150 })
**Then**:
- Error thrown: "Invalid milestone value: must be 0-100"
- Queue unchanged

## Test Data

### Sample QueuedUpdate
```typescript
const sampleUpdate: QueuedUpdate = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  component_id: '660e8400-e29b-41d4-a716-446655440000',
  milestone_name: 'Receive',
  value: true,
  timestamp: 1729785600000,
  retry_count: 0,
  user_id: '770e8400-e29b-41d4-a716-446655440000'
}
```

### Sample OfflineQueue
```typescript
const sampleQueue: OfflineQueue = {
  updates: [sampleUpdate],
  last_sync_attempt: null,
  sync_status: 'idle',
  failed_updates: []
}
```

## Mocking Strategy

### localStorage Mock
```typescript
const storage = new Map<string, string>()

global.localStorage = {
  getItem: vi.fn((key) => storage.get(key) ?? null),
  setItem: vi.fn((key, value) => storage.set(key, value)),
  removeItem: vi.fn((key) => storage.delete(key)),
  clear: vi.fn(() => storage.clear()),
  length: storage.size,
  key: vi.fn((index) => Array.from(storage.keys())[index] ?? null)
}

beforeEach(() => {
  storage.clear()
  vi.clearAllMocks()
})
```

### crypto.randomUUID Mock
```typescript
let uuidCounter = 0
vi.spyOn(crypto, 'randomUUID').mockImplementation(() => {
  return `mock-uuid-${uuidCounter++}`
})
```

### Date.now Mock
```typescript
const mockNow = 1729785600000
vi.spyOn(Date, 'now').mockReturnValue(mockNow)
```

## Coverage Requirements

- **Lines**: ≥80% (utility functions in src/lib/offline-queue.ts)
- **Branches**: ≥80% (error paths, edge cases)
- **Functions**: 100% (all public functions tested)

## Success Criteria

✅ All 15 contract tests pass
✅ Coverage requirements met
✅ No localStorage leaks between tests
✅ All edge cases covered (quota, duplicates, limits)

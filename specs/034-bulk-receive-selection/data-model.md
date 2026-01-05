# Data Model: Bulk Receive Selection Mode

**Feature**: 034-bulk-receive-selection
**Date**: 2025-12-12

## Overview

This feature is primarily UI-focused and does not introduce new database entities. It leverages existing data structures.

## Existing Entities Used

### Component

**Table**: `components`

**Relevant Fields**:
| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key, used for selection tracking |
| `current_milestones` | JSONB | Object containing milestone values (e.g., `{"Receive": 100}`) |
| `percent_complete` | NUMERIC | Calculated from milestone weights |

**Milestone Values**:
- `0` = Not started
- `100` = Complete (for discrete milestones like "Receive")
- `1-99` = Partial progress (for partial milestones)

### Milestone Event (Audit Trail)

**Table**: `milestone_events`

**Relevant Fields**:
| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key |
| `component_id` | UUID | Foreign key to components |
| `milestone_name` | TEXT | "Receive" for this feature |
| `action` | TEXT | "complete" when bulk receiving |
| `value` | NUMERIC | New value (100 for receive) |
| `previous_value` | NUMERIC | Old value (0 if not received) |
| `user_id` | UUID | User who performed the action |
| `created_at` | TIMESTAMPTZ | When the action occurred |

---

## Client-Side State

### Selection State (ComponentsPage)

```typescript
interface SelectionState {
  // Existing
  selectedComponentIds: Set<string>

  // New
  selectionMode: boolean  // false = browse, true = selection
}
```

### Bulk Receive Result

```typescript
interface BulkReceiveResult {
  attempted: number   // Total components processed
  updated: number     // Successfully marked as received
  skipped: number     // Already received (no action needed)
  failed: number      // Errors during update
}
```

---

## API Contracts

### Existing RPC (No Changes)

**Function**: `update_component_milestone`

**Parameters**:
```typescript
{
  p_component_id: string    // UUID
  p_milestone_name: string  // "Receive"
  p_new_value: number       // 100 (received)
  p_user_id: string         // UUID
  p_metadata?: object       // Optional context
}
```

**Returns**:
```typescript
{
  component: ComponentRow
  previous_value: number | null
  audit_event_id: string
  new_percent_complete: number
}
```

---

## State Transitions

### Selection Mode State Machine

```
┌──────────────────────────────────────────────────────────┐
│                    Browse Mode (Default)                  │
│  - Checkboxes hidden                                      │
│  - Row click → opens detail modal                         │
│  - No bulk actions visible                                │
└──────────────────────┬───────────────────────────────────┘
                       │ Toggle ON
                       ▼
┌──────────────────────────────────────────────────────────┐
│                     Selection Mode                        │
│  - Checkboxes visible                                     │
│  - Row click → toggles selection                          │
│  - Shift+click → range selection                          │
│  - Bulk actions visible when count > 0                    │
└──────────────────────┬───────────────────────────────────┘
                       │ Toggle OFF
                       │ (clears all selections)
                       ▼
                 Back to Browse Mode
```

### Component Receive State Transition

```
┌─────────────────────┐      Bulk Receive     ┌─────────────────────┐
│  current_milestones │ ───────────────────▶  │  current_milestones │
│  { Receive: 0 }     │      (or null)        │  { Receive: 100 }   │
│  Not Received       │                       │  Received           │
└─────────────────────┘                       └─────────────────────┘
```

---

## No Schema Migrations Required

This feature:
- Uses existing `components` table without modification
- Uses existing `update_component_milestone` RPC
- Uses existing `milestone_events` audit trail
- Adds no new tables, columns, or RPCs

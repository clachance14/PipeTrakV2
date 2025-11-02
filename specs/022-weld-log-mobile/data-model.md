# Data Model: Mobile Weld Log Optimization

**Feature**: 022-weld-log-mobile
**Date**: 2025-11-02
**Phase**: 1 (Design)

## Overview

This feature requires **NO new database entities or schema changes**. It reuses existing data structures from the weld log implementation. This document describes the existing entities used by the feature and the new UI state structures.

## Existing Database Entities (Reused)

### Field Weld

**Description**: Represents a welded joint in the piping system, tracked through quality control process.

**Source Table**: `field_welds` (Supabase PostgreSQL)

**Key Attributes**:
- `id` (uuid, PK): Unique weld identifier
- `component_id` (uuid, FK): Reference to parent component
- `project_id` (uuid, FK): Reference to project (for RLS)
- `weld_type` (enum): Type of weld - 'BW' (Butt Weld), 'SW' (Socket Weld), 'FW' (Fillet Weld), 'TW' (Threaded Weld)
- `weld_size` (text, nullable): Weld size specification
- `schedule` (text, nullable): Pipe schedule
- `base_metal` (text, nullable): Base metal specification
- `spec` (text, nullable): Welding specification reference
- `welder_id` (uuid, FK, nullable): Assigned welder
- `date_welded` (date, nullable): Date weld was completed
- `nde_required` (boolean): Whether NDE (Non-Destructive Examination) is required
- `nde_type` (text, nullable): Type of NDE (e.g., "RT", "UT", "PT")
- `nde_result` (enum, nullable): NDE result - 'PASS', 'FAIL', 'PENDING'
- `nde_date` (date, nullable): Date NDE was performed
- `nde_notes` (text, nullable): NDE inspection notes
- `status` (enum): Weld status - 'active', 'accepted', 'rejected'
- `original_weld_id` (uuid, FK, nullable): Reference to original weld if this is a repair
- `is_repair` (boolean): Whether this weld is a repair weld
- `created_at` (timestamp): Record creation timestamp
- `updated_at` (timestamp): Last update timestamp

**Relationships**:
- Belongs to `Component` (via `component_id`)
- Belongs to `Drawing` (via component relationship)
- Belongs to `Welder` (via `welder_id`, optional)
- Belongs to `Area`, `System`, `Test Package` (via component metadata)
- References self for repairs (via `original_weld_id`)

**Validation Rules**:
- `weld_type` must be one of: 'BW', 'SW', 'FW', 'TW'
- `nde_result` must be one of: 'PASS', 'FAIL', 'PENDING' (if present)
- `status` must be one of: 'active', 'accepted', 'rejected'
- If `nde_required` is false, `nde_type`, `nde_result`, `nde_date` should be null
- If `is_repair` is true, `original_weld_id` must be present
- `welder_id` can only be set if user has permission to assign welders

**State Transitions**:
- Status: `active` → `accepted` (after successful NDE) or `active` → `rejected` (after failed NDE)
- NDE Result: `null` → `PENDING` (NDE scheduled) → `PASS` (NDE passed) or `FAIL` (NDE failed)
- Repair flow: `FAIL` → creates new repair weld (is_repair=true, original_weld_id set)

### EnrichedFieldWeld (TypeScript Interface)

**Description**: Extended field weld data with joined relationships, used by frontend components.

**Source**: TanStack Query hook `useFieldWelds()` with Supabase joins

**Key Attributes** (extends Field Weld):
- `identityDisplay` (string): Formatted weld ID (e.g., "W-001", "W-002.1" for repairs)
- `component` (ComponentData): Joined component data
  - `id`, `type`, `identity_key`, `percent_complete`, `current_milestones`
- `drawing` (DrawingData): Joined drawing data
  - `id`, `drawing_no_norm`, `project_id`
- `welder` (WelderData | null): Joined welder data
  - `id`, `stencil`, `name`, `status`
- `area` (Metadata | null): Joined area metadata
- `system` (Metadata | null): Joined system metadata
- `test_package` (Metadata | null): Joined test package metadata

**Usage**: This interface is used throughout the weld log components. No changes needed - `WeldDetailModal` will consume this existing interface.

## New UI State Structures

### WeldDetailModalState

**Description**: Local React state for managing the weld detail modal UI.

**Location**: `WeldLogPage.tsx` component state

**Attributes**:
- `selectedWeld` (EnrichedFieldWeld | null): Currently selected weld for detail view, null when no weld selected
- `isDetailModalOpen` (boolean): Whether the detail modal is currently open
- `ndeDialogOpen` (boolean): Whether the NDE Result Dialog is open (managed within WeldDetailModal)
- `welderDialogOpen` (boolean): Whether the Welder Assign Dialog is open (managed within WeldDetailModal)

**State Transitions**:
```
Initial: { selectedWeld: null, isDetailModalOpen: false }

User taps weld row (mobile):
  → { selectedWeld: weldData, isDetailModalOpen: true }

User closes modal (backdrop/Escape/close button):
  → { selectedWeld: null, isDetailModalOpen: false }

User opens NDE dialog (within modal):
  → { ..., ndeDialogOpen: true }

User saves/closes NDE dialog:
  → { ..., ndeDialogOpen: false }
  → TanStack Query invalidates field_welds query
  → Component re-renders with updated weld data
```

**Validation Rules**:
- `selectedWeld` must be non-null when `isDetailModalOpen` is true
- Modal can only open on mobile (screen width ≤1024px)
- `ndeDialogOpen` and `welderDialogOpen` cannot both be true simultaneously

## Data Flow

### Read Operations (No changes from existing)

```
User navigates to Weld Log Page
  ↓
WeldLogPage mounts
  ↓
useFieldWelds() hook queries Supabase
  ↓
Supabase executes query with RLS policies
  ↓
Returns EnrichedFieldWeld[] with joins
  ↓
TanStack Query caches results
  ↓
WeldLogTable renders rows
```

### Mobile Row Click → Modal Open (NEW)

```
User taps weld row (mobile, ≤1024px)
  ↓
WeldLogTable fires onRowClick(weld)
  ↓
WeldLogPage updates state:
  - setSelectedWeld(weld)
  - setIsDetailModalOpen(true)
  ↓
WeldDetailModal renders with weld data
  ↓
Modal displays all weld attributes from EnrichedFieldWeld
```

### NDE Recording from Modal (Uses existing mutation)

```
User opens modal, taps "Record NDE"
  ↓
WeldDetailModal sets ndeDialogOpen=true
  ↓
NDEResultDialog renders (existing component)
  ↓
User enters NDE data, saves
  ↓
Existing mutation hook (useUpdateNDE) executes
  ↓
Supabase updates field_welds table
  ↓
Mutation invalidates 'field_welds' query
  ↓
TanStack Query refetches data
  ↓
WeldDetailModal re-renders with updated data
  ↓
WeldLogTable re-renders with updated NDE result
```

### Welder Assignment from Modal (Uses existing mutation)

```
User opens modal, taps "Assign Welder"
  ↓
WeldDetailModal sets welderDialogOpen=true
  ↓
WelderAssignDialog renders (existing component)
  ↓
User selects welder, saves
  ↓
Existing mutation hook (useAssignWelder) executes
  ↓
Supabase updates field_welds table
  ↓
Mutation invalidates 'field_welds' query
  ↓
TanStack Query refetches data
  ↓
WeldDetailModal re-renders with updated welder
  ↓
WeldLogTable re-renders with welder name
```

## Permissions & RLS

**No changes to existing RLS policies**. All database access uses existing Row Level Security:

- `field_welds` table has RLS enabled
- Policies filter by `organization_id` (via project → organization relationship)
- Read permission: User must be member of weld's organization
- Update permission (NDE, welder assignment): User must have `can_update_milestones` or `can_edit_metadata` role permission
- Existing TanStack Query mutations already enforce permissions via Supabase RLS

## Performance Considerations

### Query Optimization

**No new queries needed**. Feature reuses existing `useFieldWelds()` query:
- Single query fetches all enriched weld data with joins
- TanStack Query caches results in memory
- Filters applied client-side (existing pattern)
- No N+1 query issues (all joins in single query)

### Rendering Optimization

**Mobile table rendering**:
- Renders only 3 columns (vs 10 on desktop) → faster initial render
- No virtualization needed for spec's 1,000-weld constraint
- Conditional rendering prevents desktop table from mounting on mobile

**Modal rendering**:
- Modal content only rendered when `isDetailModalOpen` is true (lazy rendering)
- Shadcn Dialog uses React Portal (renders outside main DOM tree, avoids reflow)
- Static JSX layout (no heavy computation)

### Cache Invalidation

**Granular invalidation**:
- Mutations invalidate only `field_welds` query (existing pattern)
- No global state invalidation
- Background refetch prevents blocking UI during updates

## Migration Strategy

**No database migrations required** - this is a pure frontend feature.

**Deployment**:
1. Deploy new frontend code (WeldDetailModal component + WeldLogTable changes)
2. No backend changes needed
3. No data migration needed
4. Feature works immediately on mobile devices

## Summary

**Data Model Changes**: NONE

**Reused Entities**:
- ✅ `field_welds` table (existing)
- ✅ `EnrichedFieldWeld` interface (existing)
- ✅ `useFieldWelds()` query hook (existing)
- ✅ NDE and welder assignment mutations (existing)
- ✅ RLS policies (existing)

**New UI State**:
- ✅ `selectedWeld` + `isDetailModalOpen` state (local to WeldLogPage)
- ✅ `ndeDialogOpen` + `welderDialogOpen` state (local to WeldDetailModal)

**Performance**: No impact on existing queries. Mobile table renders faster (3 columns vs 10). Modal lazy-loaded only when opened.

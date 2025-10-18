# Data Model: Authenticated Pages with Real Data

**Feature**: 008-we-just-planned
**Date**: 2025-10-17
**Status**: Complete

## Overview

This feature uses **existing database entities** from Sprint 1 (Feature 005). No new tables, migrations, or database changes required. All data models already exist with RLS policies in place.

---

## Existing Database Entities

### Project
**Source**: Sprint 0 (Feature 001)
**Table**: `projects`

```typescript
interface Project {
  id: string;                    // UUID primary key
  org_id: string;                // Organization FK
  name: string;                  // Project name
  description?: string;          // Optional description
  created_at: string;            // Timestamp
  is_archived: boolean;          // Soft delete flag
}
```

**Usage in Feature 008**:
- ProjectContext provides `selectedProjectId` to all pages
- All queries filter by `project_id` for multi-tenant isolation
- Project selector dropdown in Layout shows all user's projects

---

### Component
**Source**: Sprint 1 (Feature 005)
**Table**: `components`

```typescript
interface Component {
  id: string;                    // UUID primary key
  project_id: string;            // Project FK
  drawing_id?: string;           // Drawing FK (optional)
  component_type: string;        // spool, field_weld, valve, etc.
  progress_template_id: string;  // Progress template FK
  identity_key: JSONB;           // Unique identifier (varies by type)
  area_id?: string;              // Area FK (optional)
  system_id?: string;            // System FK (optional)
  test_package_id?: string;      // Test Package FK (optional)
  attributes: JSONB;             // Type-specific attributes
  current_milestones: JSONB;     // Milestone completion state
  percent_complete: number;      // Cached ROC calculation (0-100)
  created_at: string;            // Timestamp
  created_by?: string;           // User FK
  last_updated_at: string;       // Timestamp
  last_updated_by?: string;      // User FK
  is_retired: boolean;           // Soft delete flag
  retire_reason?: string;        // Why component retired
}
```

**Usage in Feature 008**:
- Dashboard: Aggregate `percent_complete` for overall progress
- Dashboard: COUNT for total component count
- Components already queried by existing `useComponents` hook

---

### Test Package
**Source**: Sprint 1 (Feature 005)
**Table**: `test_packages`

```typescript
interface TestPackage {
  id: string;                    // UUID primary key
  project_id: string;            // Project FK
  name: string;                  // Package name (e.g., "TP-001")
  description?: string;          // Optional description
  target_date?: string;          // Target turnover date (YYYY-MM-DD)
  created_at: string;            // Timestamp
}
```

**Usage in Feature 008**:
- PackagesPage: Display all packages with filtering/searching/sorting
- Already queried by existing `useTestPackages` hook

---

### Needs Review Item
**Source**: Sprint 1 (Feature 005)
**Table**: `needs_review`

```typescript
type ReviewType =
  | 'out_of_sequence'
  | 'rollback'
  | 'delta_quantity'
  | 'drawing_change'
  | 'similar_drawing'
  | 'verify_welder';

type ReviewStatus = 'pending' | 'resolved' | 'ignored';

interface NeedsReviewItem {
  id: string;                    // UUID primary key
  project_id: string;            // Project FK
  component_id?: string;         // Component FK (optional)
  type: ReviewType;              // Type of issue
  status: ReviewStatus;          // Current status
  payload: JSONB;                // Type-specific details
  created_at: string;            // Timestamp
  created_by?: string;           // User FK
  resolved_at?: string;          // When resolved/ignored
  resolved_by?: string;          // User FK
  resolution_note?: string;      // Optional note from resolver
}
```

**Usage in Feature 008**:
- NeedsReviewPage: Display pending items with resolve workflow
- Dashboard: COUNT pending items for badge
- Already queried by existing `useNeedsReview` hook

---

### Welder
**Source**: Sprint 1 (Feature 005)
**Table**: `welders`

```typescript
type WelderStatus = 'unverified' | 'verified';

interface Welder {
  id: string;                    // UUID primary key
  project_id: string;            // Project FK
  name: string;                  // Welder full name
  stencil: string;               // Original stencil input
  stencil_norm: string;          // Normalized (UPPER, trimmed)
  status: WelderStatus;          // Verification status
  created_at: string;            // Timestamp
  created_by?: string;           // User FK
  verified_at?: string;          // When verified
  verified_by?: string;          // User FK
}
```

**Usage in Feature 008**:
- WeldersPage: Display all welders with add/verify workflows
- Already queried by existing `useWelders` hook

---

### Milestone Event
**Source**: Sprint 1 (Feature 005)
**Table**: `milestone_events`

```typescript
type EventAction = 'complete' | 'rollback' | 'update';

interface MilestoneEvent {
  id: string;                    // UUID primary key
  component_id: string;          // Component FK
  milestone_name: string;        // Milestone name (e.g., "Weld Made")
  action: EventAction;           // What happened
  value?: number;                // For partial milestones (0-100)
  previous_value?: number;       // Before update
  user_id: string;               // User FK (who performed action)
  created_at: string;            // Timestamp
  metadata?: JSONB;              // Event-specific data (e.g., welder_id)
}
```

**Usage in Feature 008**:
- Dashboard: Query recent events for activity feed
- WelderUsage: Count events WHERE milestone_name='Weld Made' + metadata->>'welder_id'

---

### Audit Log
**Source**: Sprint 1 (Feature 005)
**Table**: `audit_log`

```typescript
interface AuditLogEntry {
  id: string;                    // UUID primary key
  project_id: string;            // Project FK
  user_id: string;               // User FK
  action_type: string;           // e.g., 'import', 'milestone_update', 'resolve_review'
  entity_type: string;           // e.g., 'component', 'welder', 'needs_review'
  entity_id?: string;            // Entity FK (optional)
  old_value?: JSONB;             // Before state
  new_value?: JSONB;             // After state
  reason?: string;               // Optional justification
  created_at: string;            // Timestamp
}
```

**Usage in Feature 008**:
- Dashboard: Query recent entries for activity feed (alternative to milestone_events)
- ImportsPage: Query WHERE action_type='import' for recent import history

---

### Materialized View: Package Readiness
**Source**: Sprint 1 (Feature 005)
**View**: `mv_package_readiness`

```typescript
interface PackageReadiness {
  package_id: string;            // Test Package ID
  project_id: string;            // Project ID
  package_name: string;          // Test Package name
  target_date?: string;          // Target date (if set)
  total_components: number;      // COUNT(components)
  completed_components: number;  // COUNT WHERE percent_complete=100
  avg_percent_complete: number;  // AVG(percent_complete)
  blocker_count: number;         // COUNT(needs_review WHERE status='pending')
  last_activity_at?: string;     // MAX(component.last_updated_at)
}
```

**Refresh Strategy**: Auto-refresh every 60 seconds OR manual via `useRefreshDashboards()` mutation

**Usage in Feature 008**:
- PackagesPage: Query this view directly for package cards
- Dashboard: COUNT WHERE avg_percent_complete=100 for "Packages Ready" metric

---

## New Client-Side State

### Sidebar State
**Storage**: localStorage key `'sidebar-collapsed'`
**Hook**: `useSidebarState()`

```typescript
interface SidebarState {
  isCollapsed: boolean;          // true = icon-only, false = full labels
}

// Hook signature
function useSidebarState(): [boolean, (value: boolean) => void];
```

**Persistence**:
- Reads from localStorage on mount (default: `false` = expanded)
- Writes to localStorage on every toggle
- Survives browser refresh

**No database storage** - purely client-side preference

---

## Computed Metrics (Dashboard)

### DashboardMetrics
**Computed by**: `useDashboardMetrics(projectId)` hook

```typescript
interface DashboardMetrics {
  overallProgress: number;       // AVG(components.percent_complete) 0-100
  componentCount: number;        // COUNT(components)
  readyPackages: number;         // COUNT(mv_package_readiness WHERE avg=100)
  needsReviewCount: number;      // COUNT(needs_review WHERE status='pending')
  recentActivity: ActivityItem[]; // Last 10 milestone_events OR audit_log
}

interface ActivityItem {
  id: string;                    // Event/log ID
  user_initials: string;         // User first/last initials (e.g., "JS")
  description: string;           // Human-readable action (e.g., "marked Weld Made on W-1234")
  timestamp: string;             // created_at
}
```

**Calculation**:
- Client-side aggregation from existing hooks
- TanStack Query caching (stale time: 1 minute)
- Recalculates on project switch

---

## View Models (UI)

### PackageCard
**Used by**: PackagesPage component

```typescript
interface PackageCard {
  id: string;                    // package_id
  name: string;                  // package_name
  progress: number;              // avg_percent_complete (0-100)
  componentCount: number;        // total_components
  blockerCount: number;          // blocker_count
  targetDate?: string;           // target_date (formatted "MM/DD/YYYY")
  statusColor: 'green' | 'blue' | 'amber'; // green=100%, blue=<100 & no blockers, amber=blockers>0
}
```

**Data Source**: `mv_package_readiness` materialized view

---

### ReviewItem
**Used by**: NeedsReviewPage component

```typescript
interface ReviewItem {
  id: string;                    // needs_review.id
  type: ReviewType;              // Type badge (e.g., "Out of Sequence")
  description: string;           // Human-readable from payload
  ageInDays: number;             // (now - created_at) in days
  ageColorClass: string;         // 'text-gray-600' | 'text-amber-600' | 'text-red-600'
  payload: JSONB;                // Original payload for details
  createdAt: string;             // created_at timestamp
}
```

**Age Color Mapping**:
- <1 day: `text-gray-600` (recent)
- 1-3 days: `text-amber-600` (moderate)
- >3 days: `text-red-600` (old)

**Data Source**: `needs_review` table

---

### WelderRow
**Used by**: WeldersPage component

```typescript
interface WelderRow {
  id: string;                    // welder.id
  name: string;                  // welder.name
  stencil: string;               // welder.stencil_norm (uppercase)
  status: WelderStatus;          // 'verified' | 'unverified'
  statusBadge: string;           // 'bg-green-100 text-green-800' | 'bg-amber-100 text-amber-800'
  weldCount: number;             // COUNT(milestone_events WHERE metadata->>'welder_id' = id)
  verifiedAt?: string;           // verified_at (formatted "MM/DD/YYYY")
  verifiedBy?: string;           // User name (join with users table)
}
```

**Data Sources**:
- `welders` table (base data)
- `milestone_events` table (weld count via `useWelderUsage` hook)

---

## Data Flow Diagrams

### Dashboard Page Data Flow
```
ProjectContext (selectedProjectId)
  ↓
useDashboardMetrics(projectId)
  ├→ useComponents(projectId) → AVG(percent_complete), COUNT(*)
  ├→ useQuery(mv_package_readiness) → COUNT WHERE avg=100
  ├→ useNeedsReview(projectId) → COUNT WHERE status='pending'
  └→ useAuditLog(projectId, limit:10) → Recent activity
  ↓
DashboardMetrics { overallProgress, componentCount, readyPackages, needsReviewCount, recentActivity }
  ↓
Dashboard UI (MetricCard components)
```

### Packages Page Data Flow
```
ProjectContext (selectedProjectId)
  ↓
usePackageReadiness(projectId, filters)
  ↓
Query mv_package_readiness (materialized view)
  ├→ Filter by status (All/Ready/In Progress/Blocked)
  ├→ Search by name
  └→ Sort by (Name/Progress/Target Date)
  ↓
PackageCard[] view models
  ↓
Package Grid UI (PackageCard components)
```

### Needs Review Page Data Flow
```
ProjectContext (selectedProjectId)
  ↓
useNeedsReview(projectId, filters)
  ↓
Query needs_review table
  ├→ Filter by type
  └→ Filter by status (default: pending)
  ↓
ReviewItem[] view models
  ├→ Calculate ageInDays
  └→ Map to ageColorClass
  ↓
Review List UI (ReviewItemCard components)
```

### Welders Page Data Flow
```
ProjectContext (selectedProjectId)
  ↓
useWelders(projectId, filters)
  ├→ Query welders table
  └→ Filter by status
  ↓
useWelderUsage(projectId)
  ├→ Query milestone_events WHERE milestone_name='Weld Made'
  └→ Group by metadata->>'welder_id', COUNT(*)
  ↓
WelderRow[] view models (join welder + usage count)
  ↓
Welder Table UI (WelderTable component)
```

---

## Validation Rules

### Sidebar State
- `isCollapsed`: Must be boolean (coerce localStorage string to boolean)
- Default: `false` (expanded)
- No server validation (client-side only)

### Welder Creation
- `name`: Required, 1-100 characters
- `stencil`: Required, 2-12 characters, alphanumeric + hyphens only
- `stencil_norm`: Auto-normalized to UPPER(TRIM(stencil))
- Uniqueness: `stencil_norm` must be unique per project (database constraint)

### Needs Review Resolution
- `status`: Must be 'resolved' or 'ignored' (not 'pending')
- `resolution_note`: Optional, max 500 characters
- `resolved_by`: Auto-populated from auth.uid()
- `resolved_at`: Auto-populated to now()

---

## Database Constraints (Existing)

**No new constraints added** - All constraints from Sprint 1:

1. **RLS Policies**: All tables have multi-tenant isolation via `organization_id` or `project_id`
2. **Foreign Keys**: All FKs use ON DELETE CASCADE or ON DELETE SET NULL
3. **Unique Constraints**:
   - `welders.stencil_norm` unique per project
   - `test_packages.name` unique per project (optional, not enforced yet)
4. **Check Constraints**:
   - `needs_review.type` must be valid ReviewType
   - `needs_review.status` must be valid ReviewStatus
   - `welders.status` must be valid WelderStatus
5. **NOT NULL Constraints**:
   - All primary keys, foreign keys (project_id, etc.)
   - Critical fields (name, status, created_at)

---

## State Transitions

### Needs Review Item Lifecycle
```
[created] → status='pending'
  ↓ (user clicks "Resolve")
[resolving] → show ResolveReviewModal
  ↓ (user submits with note)
[resolved] → status='resolved', resolved_at=now(), resolved_by=user
  ↓ (user clicks "Ignore")
[ignored] → status='ignored', resolved_at=now(), resolved_by=user

Terminal states: 'resolved', 'ignored' (cannot transition back to 'pending')
```

### Welder Verification Lifecycle
```
[created] → status='unverified'
  ↓ (admin clicks "Verify")
[verifying] → show VerifyWelderDialog
  ↓ (admin confirms)
[verified] → status='verified', verified_at=now(), verified_by=admin

Terminal state: 'verified' (cannot unverify, must delete and recreate)
```

### Sidebar Collapse/Expand
```
[expanded] → isCollapsed=false, width=280px, show labels
  ↓ (user clicks toggle button)
[collapsed] → isCollapsed=true, width=64px, hide labels (icons only)
  ↓ (user clicks toggle button)
[expanded] → isCollapsed=false, width=280px, show labels

localStorage synced on every transition
```

---

## Summary

**Total Entities**: 9 existing (0 new)
- 6 database tables (projects, components, test_packages, needs_review, welders, milestone_events, audit_log)
- 2 materialized views (mv_package_readiness, mv_drawing_progress)
- 1 client-side state (sidebar collapsed)

**Total View Models**: 4 computed (dashboard metrics, package card, review item, welder row)

**No database migrations required** ✅
**All RLS policies already in place** ✅
**All hooks already implemented** ✅ (except 4 new custom hooks)

**Ready for contract test generation** ✅

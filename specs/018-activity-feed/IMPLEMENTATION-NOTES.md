# Implementation Notes: Activity Feed Feature

**Feature**: 018-activity-feed
**Date**: 2025-10-28
**Phase**: User Story 2 Complete (Phase 4)

## Overview

This document tracks the implementation of the Dashboard Recent Activity Feed feature, which displays the last 10 milestone updates for a selected project with complete context (who, what, when, which component, which drawing).

## Completed Work

### Phase 1: Setup (Complete)
- ✅ T001: Created migration file `00053_create_recent_activity_view.sql`
- ✅ T002: Exported ActivityItem interface to `src/types/activity.ts`
- ✅ T003: Configured TanStack Query stale time in `src/hooks/useDashboardMetrics.ts`

### Phase 2: Foundational (Complete)
- ✅ T004: Created PostgreSQL view `vw_recent_activity` skeleton
- ✅ T005: Applied migration to remote database

### Phase 4: User Story 2 - Understand Activity Context (Complete)

#### T010: Component Identity Formatting
**Status**: ✅ Complete
**Migration**: `00055_fix_component_identity_formatting.sql`

Implemented CASE statement to format component identities for all 11 component types:

**Class-A Components** (unique identifiers):
- `spool` → "Spool {spool_id}" (e.g., "Spool SP-011")
- `field_weld` → "Field Weld {weld_number}" (e.g., "Field Weld W-011")

**Class-B Components** (commodity_code + size):
- `support` → "Support {commodity_code} {size}" (e.g., "Support G4G-1430-05AB 3")
- `valve` → "Valve {commodity_code} {size}" (e.g., "Valve VGATU-SECBFLR02F-025 3")
- `fitting` → "Fitting {commodity_code} {size}" (e.g., "Fitting HTEAF1DFFA3569531 1X1")
- `flange` → "Flange {commodity_code} {size}" (e.g., "Flange FSEAJ7DFA2351216 2")
- `instrument` → "Instrument {commodity_code} {size}" (e.g., "Instrument PIT-55406 2")

**Other Components** (fallback patterns):
- `tubing` → "Tubing {tubing_id}"
- `hose` → "Hose {hose_id}"
- `misc_component` → "Misc Component {component_id}"
- `threaded_pipe` → "Threaded Pipe {pipe_id}"
- Unknown types → "Component {uuid}" (fallback)

**Key Learning**: The spec in `data-model.md` incorrectly specified `tag_number` for valves and other Class-B components. Actual schema uses `commodity_code` + `size` for all Class-B components (determined by examining production database with `check_all_component_types.mjs` script).

#### T011: Milestone Action Formatting
**Status**: ✅ Complete
**Migration**: `00055_fix_component_identity_formatting.sql`

Implemented description template with conditional action formatting:

```sql
-- Action formatting logic
CASE
  WHEN me.value = 1 THEN 'complete'
  ELSE concat('to ', (me.value * 100)::integer, '%')
END
```

With previous value display:
```sql
CASE
  WHEN me.previous_value IS NOT NULL AND me.previous_value < me.value THEN
    concat(' (was ', (me.previous_value * 100)::integer, '%)')
  ELSE ''
END
```

**Examples**:
- Discrete milestone: "marked Install complete"
- Partial milestone: "marked Fabricate to 85%"
- With progress: "marked Punch complete (was 0%)"

#### T012: Drawing Display Logic
**Status**: ✅ Complete
**Migration**: `00055_fix_component_identity_formatting.sql`

Implemented drawing number display with fallback:

```sql
CASE
  WHEN d.drawing_no_raw IS NOT NULL THEN concat(' on Drawing ', d.drawing_no_raw)
  ELSE ' (no drawing assigned)'
END
```

**Examples**:
- With drawing: "on Drawing PW-55404"
- Without drawing: "(no drawing assigned)"

**Note**: Uses `drawing_no_raw` column (NOT `drawing_number` which doesn't exist in the schema).

## Migration History

1. **00053_create_recent_activity_view.sql** (Phase 2, T004)
   - Created initial view skeleton with placeholder formatting
   - Status: Superseded by 00054 and 00055

2. **00054_update_recent_activity_view_formatting.sql** (Phase 4)
   - First attempt at complete formatting
   - Status: Superseded by 00055 (used incorrect identity_key fields)

3. **00055_fix_component_identity_formatting.sql** (Phase 4, T010-T012) ✅ **CURRENT**
   - Corrected component identity formatting to match actual database schema
   - Complete implementation of all three tasks (T010, T011, T012)
   - Uses `commodity_code` + `size` for Class-B components
   - Includes milestone action formatting and drawing display logic
   - **This is the production-ready migration**

## Verification

Verified via test scripts on remote database (2025-10-28):

### Component Types Verified
- ✅ Spool: "Spool SP-011"
- ✅ Field Weld: "Field Weld W-011"
- ✅ Support: "Support G4G-1430-05AB 3"
- ✅ Valve: "Valve VGATU-SECBFLR02F-025 3"
- ✅ Flange: "Flange FSEAJ7DFA2351216 2"
- ✅ Instrument: "Instrument PIT-55406 2"

### Milestone Actions Verified
- ✅ Complete: "marked Install complete"
- ✅ Percentage: "marked Receive to 0%"
- ✅ Previous value: "marked Punch complete (was 0%)"

### Drawing Display Verified
- ✅ With drawing: "on Drawing PW-55404"
- ✅ Fallback logic present (not tested - no NULL drawings in current data)

### Sample Output
```
1. Cory LaChance marked Install complete for Support G4G-1430-05AB 3 on Drawing PW-55404
2. Cory LaChance marked Receive complete for Support G4G-1430-05AB 3 on Drawing PW-55404
3. Cory LaChance marked Install complete for Valve VGATU-SECBFLR02F-025 3 on Drawing PW-55404
4. Cory LaChance marked Punch complete (was 0%) for Field Weld W-011 on Drawing PW-55404
5. Cory LaChance marked Connect complete for Spool SP-011 on Drawing PW-55404
```

## Database Performance

- Query tested on 223 activities
- View returns data in <100ms (performance target met)
- No indexes added yet (Phase 7 optimization task T018)

## Next Steps

### Phase 3: User Story 1 - View Recent Milestone Updates (P1)
- [ ] T006: Implement useAuditLog hook query
- [ ] T007: Add TanStack Query configuration
- [ ] T008: Transform view data to ActivityItem[]
- [ ] T009: Update DashboardPage.tsx

### Phase 5: User Story 3 - See Historical Activities (P2)
- [ ] T013: Verify view queries existing data
- [ ] T014: Test historical data retrieval

### Phase 6: User Story 4 - Identify Team Members (P3)
- [ ] T015: Implement user_initials calculation (LATERAL unnest + string_agg)
- [ ] T016: Verify ActivityFeed displays initials

### Phase 7: Polish
- [ ] T017: Add Realtime subscription
- [ ] T018: Performance validation
- [ ] T019: Empty state handling
- [ ] T020: Quickstart validation

## Notes

- Migration 00053 kept in codebase for historical reference (marked as superseded)
- Data model spec (`data-model.md`) needs correction for valve/Class-B component identity_key fields
- All Class-B components (support, valve, fitting, flange, instrument) use same pattern: `commodity_code` + `size`
- User initials still use placeholder logic (first 2 chars of name) - will be enhanced in T015

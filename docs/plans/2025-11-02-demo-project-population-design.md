# Demo Project Population Design

**Date:** 2025-11-02
**Feature:** 021-public-homepage (enhancement)
**Status:** Design Complete

## Overview

This design defines the data structure and population strategy for demo projects created via the "Try Demo Project" flow. Demo projects showcase all PipeTrak features with realistic industrial construction data (200 components, 20 drawings, 10 test packages) while avoiding Edge Function timeout constraints through progressive loading.

## Requirements Summary

**Dataset Scale:**
- 200 components across 5 component types
- 20 drawings with realistic variety (5-20 components per drawing)
- 10 test packages (TP-01 through TP-10)
- 5 areas: Pipe Rack, ISBL, Containment Area, Water Process, Cooling Tower
- 5 systems: Air, Nitrogen, Steam, Process, Condensate
- 4 welders with realistic stamps
- ~120 field welds (butt & socket, carbon steel only)
- Activity history for milestone changes

**Demo Purpose:**
- Showcase all features (welds, milestones, progress tracking, reports)
- Active construction project (no completed testing/restoration)
- Realistic industrial component mix and commodity codes

**Constraints:**
- Edge Function timeout limit: 10 seconds
- Must avoid horizontal scroll and performance issues
- Deterministic data structure (versionable seed files)

## Architecture

### Progressive Loading Strategy

**Phase 1: Skeleton Creation (Synchronous - during signup)**
- Executes in `demo-signup` Edge Function
- Creates user, organization, and project
- Populates foundation structure:
  - 5 areas
  - 5 systems
  - 10 test packages
  - 4 welders
- Execution time: < 2 seconds
- User gets immediate dashboard access with empty project

**Phase 2: Bulk Population (Asynchronous - background)**
- Executes in new `populate-demo-data` Edge Function
- Invoked asynchronously after signup completes
- Populates full dataset:
  - 20 drawings
  - 200 components
  - ~120 field welds
  - Milestone states
  - Welder assignments
  - Activity history
- Execution time: 30-45 seconds
- User sees data populate in real-time

### Data Flow

```
User submits demo signup
  ↓
demo-signup Edge Function (synchronous)
  → Create user/org/project
  → Populate skeleton (areas/systems/packages/welders)
  → Invoke populate-demo-data async
  → Return success, grant access
  ↓
User redirected to dashboard
  → Sees project structure immediately
  → Components/drawings load in background
  ↓
populate-demo-data Edge Function (background)
  → Bulk insert drawings (20 rows)
  → Bulk insert components (200 rows)
  → Bulk insert field welds (120 rows)
  → Update milestone states (320 updates)
  → Assign welders to completed welds (~78 assignments)
  → Generate activity history
  → Complete (30-45s)
```

## Data Structure

### Component Distribution

**Total: 200 components**

| Component Type | Count | Milestones | Identity Key Pattern |
|---|---|---|---|
| Spool | 40 | Receive, Erect, Connect, Punch, Test, Restore | `{"spool_id": "SP-001"}` |
| Support | 80 | Receive, Install, Punch, Test, Restore | `{"drawing_norm": "ISO-PR-001", "commodity_code": "G4G-...", "size": "2IN", "seq": 1}` |
| Valve | 50 | Receive, Install, Punch, Test, Restore | `{"drawing_norm": "ISO-PR-001", "commodity_code": "VBALU-...", "size": "2", "seq": 1}` |
| Flange | 20 | Receive, Install, Punch, Test, Restore | `{"drawing_norm": "ISO-PR-001", "commodity_code": "FBLABLDRA...", "size": "2", "seq": 1}` |
| Instrument | 10 | Receive, Install, Punch, Test, Restore | `{"drawing_norm": "ISO-PR-001", "commodity_code": "FE-55403", "size": "2", "seq": 1}` |

**Rationale:**
- 2 supports per spool (realistic industrial ratio)
- Balanced mix showing all milestone templates
- Excludes 'pipe', 'fitting', 'threaded_pipe' (incomplete milestone templates or excluded by requirement)

### Field Welds

**Total: ~120 welds**
- 3 welds per spool (40 spools × 3 = 120 welds)
- Mix of butt welds and socket welds
- All carbon steel material
- **Linked to drawings** (via `drawing_id`), NOT to spool components
- Identity: weld number (e.g., "W-001", "W-002")

**Welder Assignment:**
- Welders ONLY assigned when milestone "Weld Made" = true
- ~65% of welds have "Weld Made" complete → ~78 welds get welder assignments
- Assignments distributed evenly across 4 welders
- Weld dates range over past 30 days

### Commodity Codes

Sourced from existing production projects:

**Valves:**
- VBALP-DICBFLR01M-024 (Ball valve)
- VBALU-PFCBFLF00M-001 (Ball valve)
- VBALU-SECBFLR00M-006 (Ball valve)
- VCHKU-SECBFEQ00Q-008 (Check valve)
- VGATU-SECBFLR02F-025 (Gate valve)

**Supports:**
- G4G-1412-05AA-001-1-1
- G4G-1412-05AA-001-6-6
- G4G-1430-05AB

**Flanges:**
- FBLABLDRA3399531 (Blind flange)
- FBLABLDRAWF0261 (Blind flange)
- FBLAG2DFA2351215 (Blind flange)

**Instruments:**
- FE-55403 (Flow element)
- ME-55403 (Misc element)
- PIT-55402 (Pressure indicating transmitter)
- PIT-55406 (Pressure indicating transmitter)

### Drawings

**Total: 20 drawings**
- Realistic variety: some with 5 components, some with 15-20
- Distributed across 5 areas and 5 systems
- Naming pattern: `ISO-{AREA}-{SEQ}` (e.g., ISO-PR-001, ISO-ISBL-002)
- Each drawing with spools includes associated field welds

### Milestone Progression

**Active Construction Project State:**
- NO components at Test or Restore milestones (project not ready for testing)
- Realistic front-loaded progression (more early milestones complete)

**Spools (40 components):**
- Receive: 95% (~38 spools)
- Erect: 70% (~28 spools, requires Receive)
- Connect: 50% (~20 spools, requires Erect)
- Punch: 25% (~10 spools, requires Connect)
- Test: 0%
- Restore: 0%

**Valves/Supports/Flanges/Instruments (160 components):**
- Receive: 90% (~144 components)
- Install: 65% (~104 components, requires Receive)
- Punch: 30% (~48 components, requires Install)
- Test: 0%
- Restore: 0%

**Field Welds (~120 welds):**
- Fit-Up: 90% (~108 welds)
- Weld Made: 65% (~78 welds, requires Fit-Up) → **These get welder assignments**
- Punch: 25% (~30 welds, requires Weld Made)
- Test: 0%
- Restore: 0%

## Seed File Organization

### File Location
`supabase/functions/populate-demo-data/seed-data.ts`

### Structure (Single Monolithic File)

**Rationale:**
- Deterministic and versionable
- Easy to inspect and validate
- ~2,500-3,000 lines (manageable size)
- Follows declarative seed file approach

**Organization:**

```typescript
export const DEMO_SEED_DATA = {
  // 1. Foundation (created in Phase 1 - skeleton)
  areas: [...],
  systems: [...],
  packages: [...],
  welders: [...],

  // 2. Drawings (20 drawings)
  drawings: [
    { drawing_number: 'ISO-PR-001', area: 'Pipe Rack', system: 'Steam' },
    // ...
  ],

  // 3. Components (200 total)
  components: [
    // Spools (40)
    { tag: 'PR-SP-001', type: 'spool', identity: {...}, drawing: 'ISO-PR-001', ... },
    // Valves (50)
    { tag: 'PR-V-001', type: 'valve', identity: {...}, drawing: 'ISO-PR-001', ... },
    // Supports (80)
    // Flanges (20)
    // Instruments (10)
  ],

  // 4. Field welds (~120 welds)
  welds: [
    { weld_number: 'W-001', drawing: 'ISO-PR-001', type: 'butt', material: 'CS' },
    // ...
  ],

  // 5. Milestone states (randomized realistic)
  milestones: [
    { component_tag: 'PR-SP-001', receive: true, erect: true, connect: false },
    // ... for all 200 components + 120 welds
  ],

  // 6. Welder assignments (only for "Weld Made" = true)
  weld_assignments: [
    { weld_number: 'W-001', welder_stamp: 'JD-123', date_welded: '2025-10-15' },
    // ... ~78 assignments
  ]
}
```

## Insertion Logic

### Database-Generated IDs with Natural Key Mapping

**Phase 1: Skeleton (SQL Function)**

```sql
CREATE OR REPLACE FUNCTION create_demo_skeleton(
  p_user_id UUID,
  p_org_id UUID,
  p_project_id UUID
) RETURNS void AS $$
BEGIN
  -- Insert areas
  INSERT INTO areas (project_id, name) VALUES
    (p_project_id, 'Pipe Rack'),
    (p_project_id, 'ISBL'),
    (p_project_id, 'Containment Area'),
    (p_project_id, 'Water Process'),
    (p_project_id, 'Cooling Tower');

  -- Insert systems
  INSERT INTO systems (project_id, name) VALUES
    (p_project_id, 'Air'),
    (p_project_id, 'Nitrogen'),
    (p_project_id, 'Steam'),
    (p_project_id, 'Process'),
    (p_project_id, 'Condensate');

  -- Insert test packages
  INSERT INTO test_packages (project_id, name) VALUES
    (p_project_id, 'TP-01'),
    (p_project_id, 'TP-02'),
    -- ... TP-03 through TP-10
    (p_project_id, 'TP-10');

  -- Insert welders
  INSERT INTO welders (organization_id, stamp, name) VALUES
    (p_org_id, 'JD-123', 'John Davis'),
    (p_org_id, 'SM-456', 'Sarah Miller'),
    (p_org_id, 'TR-789', 'Tom Rodriguez'),
    (p_org_id, 'KL-012', 'Kim Lee');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Phase 2: Bulk Population (TypeScript)**

```typescript
// 1. Insert drawings, capture IDs
const { data: drawings } = await supabase
  .from('drawings')
  .insert(DEMO_SEED_DATA.drawings.map(d => ({
    project_id: projectId,
    drawing_no_raw: d.drawing_number,
    // drawing_no_norm auto-generated by trigger
  })))
  .select('id, drawing_no_norm')

// Create lookup map: drawing_number → UUID
const drawingIdMap = new Map(
  drawings.map(d => [d.drawing_no_norm, d.id])
)

// 2. Insert components with resolved drawing_id
const { data: components } = await supabase
  .from('components')
  .insert(DEMO_SEED_DATA.components.map(c => ({
    project_id: projectId,
    component_type: c.type,
    identity_key: c.identity,
    drawing_id: drawingIdMap.get(c.drawing),
    area_id: areaIdMap.get(c.area),
    system_id: systemIdMap.get(c.system),
    test_package_id: packageIdMap.get(c.package),
  })))
  .select('id, identity_key')

// Create lookup map: component tag → UUID
const componentIdMap = new Map(
  components.map(c => [c.identity_key.spool_id || extractTag(c.identity_key), c.id])
)

// 3. Insert field welds (linked to drawings)
const { data: welds } = await supabase
  .from('field_welds')
  .insert(DEMO_SEED_DATA.welds.map(w => ({
    project_id: projectId,
    drawing_id: drawingIdMap.get(w.drawing),
    weld_number: w.weld_number,
    weld_type: w.type,
    material: w.material,
  })))
  .select('id, weld_number')

// 4. Update milestones (bulk update via RPC)
await supabase.rpc('bulk_update_milestones', {
  p_updates: DEMO_SEED_DATA.milestones.map(m => ({
    component_id: componentIdMap.get(m.component_tag),
    milestones: m
  }))
})

// 5. Assign welders to completed welds
await supabase
  .from('field_welds')
  .upsert(DEMO_SEED_DATA.weld_assignments.map(a => ({
    id: weldIdMap.get(a.weld_number),
    welder_id: welderIdMap.get(a.welder_stamp),
    date_welded: a.date_welded
  })))
```

### Transaction Safety

- Each entity type inserted in single batch (minimize round trips)
- Use `.select()` to get generated IDs for relationship mapping
- Background function is idempotent (check for existing data before insert)
- If population fails, user has empty project (can manually import)
- No partial data states (each bulk insert is atomic)

## User Experience

### Timeline

1. **T+0s:** User submits demo signup form
2. **T+2s:** Skeleton created, user sees success message
3. **T+2s:** User redirected to dashboard
4. **T+2s:** Dashboard shows project structure (areas, systems, packages, welders)
5. **T+2s - T+45s:** Background job populates components/drawings/welds
6. **T+45s:** Tables fully populated, optional toast notification

### Progressive Loading Benefits

- No timeout failures (skeleton < 2s, background unconstrained)
- Immediate user access (can explore while data loads)
- Graceful degradation (if background fails, user has empty project)
- Clear progress indication (tables populate incrementally)

## Error Handling

**Skeleton Creation Failures:**
- Show error message to user
- Do not create user account
- Allow retry

**Background Population Failures:**
- User has empty project with structure
- Can manually import data via CSV
- Function is idempotent (can retry safely)
- Log error for debugging

**Data Consistency:**
- All foreign key relationships validated
- RLS policies enforce data isolation
- Milestone updates respect component type templates

## Testing Strategy

**Unit Tests:**
- Validate seed data structure (counts, types, relationships)
- Test natural key mapping logic
- Verify milestone progression rules

**Integration Tests:**
- Test skeleton creation SQL function
- Test bulk population Edge Function
- Verify progressive loading behavior

**End-to-End Tests:**
- Complete demo signup flow
- Verify user can access dashboard immediately
- Verify full dataset appears within 60s
- Test error scenarios (timeout, invalid data)

## Future Enhancements

**Potential Improvements:**
- Add NDE results for some completed welds
- Generate repair weld history
- Add milestone change timestamps for activity feed
- Support multiple demo project sizes (small/medium/large)
- Pre-generate demo datasets (eliminate population time)

## References

- Feature 021: Public Homepage (`specs/021-public-homepage/`)
- Database Schema: `supabase/migrations/00009_foundation_tables.sql`
- Progress Templates: `supabase/migrations/00009_foundation_tables.sql` (lines 291-393)
- Existing Demo Signup: `supabase/functions/demo-signup/index.ts`

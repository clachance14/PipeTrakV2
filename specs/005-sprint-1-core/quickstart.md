# Quickstart Validation: Sprint 1 - Core Foundation

**Feature**: 005-sprint-1-core
**Date**: 2025-10-15
**Purpose**: End-to-end validation of Sprint 1 database schema and basic CRUD operations

## Prerequisites

- ✅ Migration `00009_sprint1_core_tables.sql` applied successfully
- ✅ TypeScript types regenerated: `npx supabase gen types typescript --linked > src/types/database.types.ts`
- ✅ All contract tests passing (tests/contract/)
- ✅ All integration tests passing (tests/integration/)
- ✅ Local Supabase instance running: `supabase start`

---

## Step 1: Verify Database Schema

**Command**: Access Supabase Studio or run SQL queries

**Validation**:
```sql
-- Verify all 14 tables exist
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN (
  'organizations', 'users', 'projects', 'invitations',
  'drawings', 'areas', 'systems', 'test_packages',
  'progress_templates', 'components', 'milestone_events',
  'welders', 'field_weld_inspections', 'needs_review', 'audit_log'
)
ORDER BY table_name;

-- Expected: 14 rows

-- Verify pg_trgm extension enabled
SELECT * FROM pg_extension WHERE extname = 'pg_trgm';
-- Expected: 1 row

-- Verify materialized views exist
SELECT matviewname FROM pg_matviews WHERE schemaname = 'public';
-- Expected: mv_package_readiness, mv_drawing_progress

-- Verify stored procedures exist
SELECT routine_name FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN (
  'calculate_component_percent',
  'detect_similar_drawings',
  'validate_component_identity_key',
  'validate_milestone_weights',
  'get_weld_repair_history'
);
-- Expected: 5 rows
```

✅ **Success Criteria**: All 14 tables, 2 materialized views, 5 stored procedures exist.

---

## Step 2: Verify Progress Template Seed Data

**Command**: Query progress_templates table

**Validation**:
```sql
SELECT component_type, version, workflow_type,
       (SELECT SUM((m->>'weight')::numeric) FROM jsonb_array_elements(milestones_config) m) AS total_weight
FROM progress_templates
ORDER BY component_type;

-- Expected: 11 rows (one per component type)
-- Expected: total_weight = 100.00 for all rows
```

✅ **Success Criteria**: 11 progress templates seeded, all milestone weights total exactly 100%.

---

## Step 3: Verify RLS Policies Enabled

**Command**: Check RLS status for all tables

**Validation**:
```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN (
  'drawings', 'areas', 'systems', 'test_packages', 'progress_templates',
  'components', 'milestone_events', 'welders', 'field_weld_inspections',
  'needs_review', 'audit_log'
);

-- Expected: rowsecurity = true for all 11 new tables
```

✅ **Success Criteria**: RLS enabled on all 11 new tables (FR-027, FR-060).

---

## Step 4: Test Component Creation (Manual via Supabase Studio or API)

**Test Case**: Create a spool component with milestone updates

### 4a. Create Project (if not exists)
```typescript
const { data: project } = await supabase
  .from('projects')
  .insert({
    organization_id: currentUser.organization_id,
    name: 'Test Project - Sprint 1'
  })
  .select()
  .single();
```

### 4b. Create Drawing
```typescript
const { data: drawing } = await supabase
  .from('drawings')
  .insert({
    project_id: project.id,
    drawing_no_raw: 'P-001',
    drawing_no_norm: 'P001',  // Normalized
    title: 'Test Piping Isometric'
  })
  .select()
  .single();
```

### 4c. Get Spool Progress Template
```typescript
const { data: template } = await supabase
  .from('progress_templates')
  .select()
  .eq('component_type', 'spool')
  .eq('version', 1)
  .single();
```

### 4d. Create Spool Component
```typescript
const { data: component } = await supabase
  .from('components')
  .insert({
    project_id: project.id,
    drawing_id: drawing.id,
    component_type: 'spool',
    progress_template_id: template.id,
    identity_key: { spool_id: 'SP-001' },
    attributes: { spec: 'A106-B', material: 'CS', size: '4IN' },
    current_milestones: {},
    percent_complete: 0.00
  })
  .select()
  .single();
```

✅ **Success Criteria**: Component created with percent_complete = 0.00.

### 4e. Update Milestones (Trigger Test)
```typescript
const { data: updatedComponent } = await supabase
  .from('components')
  .update({
    current_milestones: {
      "Receive": true,
      "Erect": true,
      "Connect": false,
      "Punch": false,
      "Test": false,
      "Restore": false
    }
  })
  .eq('id', component.id)
  .select()
  .single();

console.log('Percent Complete:', updatedComponent.percent_complete);
// Expected: 45.00 (5% Receive + 40% Erect)
```

✅ **Success Criteria**: `percent_complete` auto-calculated to 45.00 via trigger (FR-012).

### 4f. Verify Milestone Event Created
```typescript
const { data: events } = await supabase
  .from('milestone_events')
  .select()
  .eq('component_id', component.id);

console.log('Event Count:', events.length);
// Expected: At least 1 event created
```

✅ **Success Criteria**: Milestone event recorded (FR-013).

---

## Step 5: Test Drawing Similarity Detection

**Test Case**: Find similar drawings using stored procedure

### 5a. Create Similar Drawings
```typescript
await supabase.from('drawings').insert([
  { project_id: project.id, drawing_no_raw: 'P-0001', drawing_no_norm: 'P0001' },
  { project_id: project.id, drawing_no_raw: 'P-0002', drawing_no_norm: 'P0002' },
  { project_id: project.id, drawing_no_raw: 'X-9999', drawing_no_norm: 'X9999' }
]);
```

### 5b. Call detect_similar_drawings()
```typescript
const { data: similar } = await supabase.rpc('detect_similar_drawings', {
  p_project_id: project.id,
  p_drawing_no_norm: 'P001',
  p_threshold: 0.85
});

console.log('Similar Drawings:', similar);
// Expected: P0001 and P0002 (high similarity), NOT X9999 (low similarity)
```

✅ **Success Criteria**: Similarity function returns P0001, P0002 with scores > 0.85 (FR-037 to FR-040).

---

## Step 6: Test Multi-Tenant RLS Isolation

**Test Case**: Verify user cannot access other organization's data

### 6a. Create Second Organization + Project (as different user)
```typescript
// Authenticate as different user with different organization_id
const { data: org2Project } = await supabase
  .from('projects')
  .insert({
    organization_id: otherUser.organization_id,
    name: 'Org 2 Project'
  })
  .select()
  .single();
```

### 6b. Attempt to Query Org 2 Project as Org 1 User
```typescript
// Authenticate as original user (Org 1)
const { data: projects } = await supabase
  .from('projects')
  .select()
  .eq('id', org2Project.id);

console.log('Projects:', projects);
// Expected: Empty array (RLS blocks access)
```

✅ **Success Criteria**: RLS denies access to other organization's projects (FR-027 to FR-029).

---

## Step 7: Test Materialized View Refresh

**Test Case**: Verify dashboard queries use materialized views

### 7a. Create Test Package with Components
```typescript
const { data: testPackage } = await supabase
  .from('test_packages')
  .insert({
    project_id: project.id,
    name: 'Test Package 1',
    target_date: '2025-12-31'
  })
  .select()
  .single();

// Assign component to test package
await supabase
  .from('components')
  .update({ test_package_id: testPackage.id })
  .eq('id', component.id);
```

### 7b. Manually Refresh Materialized View
```sql
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_package_readiness;
```

### 7c. Query Readiness View
```typescript
const { data: readiness } = await supabase
  .from('mv_package_readiness')
  .select()
  .eq('package_id', testPackage.id)
  .single();

console.log('Readiness:', readiness);
// Expected: total_components = 1, avg_percent_complete = 45.00
```

✅ **Success Criteria**: Materialized view returns aggregated data (FR-034, FR-035).

---

## Step 8: Test Welder Registry + Verification

**Test Case**: Create welder, verify stencil normalization

### 8a. Create Welder with Lowercase Stencil
```typescript
const { data: welder } = await supabase
  .from('welders')
  .insert({
    project_id: project.id,
    name: 'John Doe',
    stencil: 'jd42',  // Lowercase input
    stencil_norm: 'JD42',  // Must normalize to uppercase
    status: 'unverified'
  })
  .select()
  .single();

console.log('Stencil Norm:', welder.stencil_norm);
// Expected: 'JD42' (normalized to uppercase per FR-043)
```

### 8b. Verify Welder (as user with can_manage_welders permission)
```typescript
const { data: verified } = await supabase
  .from('welders')
  .update({
    status: 'verified',
    verified_at: new Date().toISOString(),
    verified_by: currentUser.id
  })
  .eq('id', welder.id)
  .select()
  .single();

console.log('Status:', verified.status);
// Expected: 'verified'
```

✅ **Success Criteria**: Welder created with normalized stencil, status updated to verified (FR-019 to FR-022).

---

## Step 9: Test Permission Enforcement

**Test Case**: Verify viewer role cannot update milestones

### 9a. Authenticate as Viewer (no can_update_milestones permission)
```typescript
// Authenticate as viewer user
const { error } = await supabase
  .from('components')
  .update({ current_milestones: { "Receive": true } })
  .eq('id', component.id);

console.log('Error:', error);
// Expected: RLS policy blocks update (error.code = 'PGRST116' or similar)
```

✅ **Success Criteria**: RLS enforces permission checks (FR-047).

---

## Step 10: Verify TypeScript Types

**Test Case**: Confirm types include all new tables

**Validation**:
```typescript
// Import generated types
import type { Database } from '@/types/database.types';

// Verify types exist for new tables
type Drawing = Database['public']['Tables']['drawings']['Row'];
type Component = Database['public']['Tables']['components']['Row'];
type ProgressTemplate = Database['public']['Tables']['progress_templates']['Row'];

// Verify component_type enum (if generated)
type ComponentType = Database['public']['Enums']['component_type'];

// Verify JSONB types are flexible (Record<string, any>)
const identityKey: Component['identity_key'] = { spool_id: 'SP-001' };
```

✅ **Success Criteria**: TypeScript compiles with 0 errors, all types available (Constitution Principle I).

---

## Step 11: Verify Test Coverage

**Command**: Run test suite with coverage

**Validation**:
```bash
npm test -- --coverage

# Expected results:
# - Overall coverage ≥70%
# - tests/contract/ coverage ≥80% (stored procedures, schema validation)
# - tests/integration/rls/ coverage ≥80% (RLS policy tests)
# - All 18 acceptance scenarios from spec covered
```

✅ **Success Criteria**: Test coverage meets targets, all tests passing (Constitution Principle III).

---

## Step 12: Test Field Weld Inspection Workflow

**Test Case**: Create field weld inspection with QC tracking and repair workflow

### 12a. Create Field Weld Component
```typescript
const { data: fieldWeldComponent } = await supabase
  .from('components')
  .insert({
    project_id: project.id,
    component_type: 'field_weld',
    progress_template_id: fieldWeldTemplateId,
    identity_key: { weld_number: 'W-042' },
    current_milestones: { "Fit-Up": true, "Weld Made": false },
    percent_complete: 10.00  // 10% for Fit-Up
  })
  .select()
  .single();
```

### 12b. Foreman Marks "Weld Made" and Selects Welder
```typescript
// Foreman workflow: Mark milestone + create inspection record
const { data: inspection } = await supabase
  .from('field_weld_inspections')
  .insert({
    component_id: fieldWeldComponent.id,
    project_id: project.id,
    weld_id_number: 42.0,
    welder_id: welder.id,  // From Step 8
    welder_stencil: 'JD42',
    date_welded: '2025-10-15',
    drawing_iso_number: 'P-001',
    package_number: 'PKG-001',
    spec: 'A106-B',
    weld_type: 'BW',
    test_pressure: 150.00
  })
  .select()
  .single();

// Update component milestone
await supabase
  .from('components')
  .update({ current_milestones: { "Fit-Up": true, "Weld Made": true } })
  .eq('id', fieldWeldComponent.id);

console.log('Weld Inspection ID:', inspection.id);
// Expected: field_weld_inspections row created with weld_id_number = 42.0
```

✅ **Success Criteria**: Foreman workflow creates field_weld_inspections row (FR-054, FR-059).

### 12c. QC Inspector Flags Weld for X-Ray
```typescript
const { data: flaggedWeld } = await supabase
  .from('field_weld_inspections')
  .update({
    flagged_for_xray: true,
    xray_flagged_by: currentUser.id,
    xray_flagged_date: '2025-10-16'
  })
  .eq('id', inspection.id)
  .select()
  .single();

console.log('Flagged for X-Ray:', flaggedWeld.flagged_for_xray);
// Expected: true
```

✅ **Success Criteria**: QC can manually flag welds for x-ray (FR-057).

### 12d. QC Inspector Updates Hydro Test Results
```typescript
const { data: hydroComplete } = await supabase
  .from('field_weld_inspections')
  .update({
    hydro_complete: true,
    hydro_complete_date: '2025-10-20',
    restored_date: '2025-10-21',
    pmi_required: true,
    pmi_complete: true,
    pmi_date: '2025-10-19',
    pmi_result: 'PASS'
  })
  .eq('id', inspection.id)
  .select()
  .single();

console.log('Hydro Complete:', hydroComplete.hydro_complete);
// Expected: true
```

✅ **Success Criteria**: QC can track hydro, PMI, PWHT results.

### 12e. QC Inspector Records Turnover to Client
```typescript
const { data: turnedOver } = await supabase
  .from('field_weld_inspections')
  .update({
    turned_over_to_client: true,
    turnover_date: '2025-10-25'
  })
  .eq('id', inspection.id)
  .select()
  .single();

console.log('Turned Over:', turnedOver.turned_over_to_client);
// Expected: true
```

✅ **Success Criteria**: QC can record client turnover (FR-058).

### 12f. Create Repair Weld (42.1)
```typescript
const { data: repairWeld } = await supabase
  .from('field_weld_inspections')
  .insert({
    component_id: fieldWeldComponent.id,
    project_id: project.id,
    weld_id_number: 42.1,  // Decimal repair ID
    parent_weld_id: inspection.id,
    repair_sequence: 1,
    welder_id: welder.id,
    welder_stencil: 'JD42',
    date_welded: '2025-10-22',
    comments: 'Repair for crack found during inspection'
  })
  .select()
  .single();

console.log('Repair Weld ID Number:', repairWeld.weld_id_number);
// Expected: 42.1
```

✅ **Success Criteria**: Repair tracking with decimal weld IDs (FR-056).

### 12g. Query Repair History
```typescript
const { data: repairHistory } = await supabase.rpc('get_weld_repair_history', {
  p_parent_weld_id: inspection.id
});

console.log('Repair History:', repairHistory);
// Expected: 2 rows (42.0 original + 42.1 repair), ordered by weld_id_number
```

✅ **Success Criteria**: Stored procedure returns complete repair chain (FR-056).

---

## Summary Checklist

- [ ] Step 1: All 14 tables, 2 materialized views, 5 stored procedures exist
- [ ] Step 2: 11 progress templates seeded with validated weights
- [ ] Step 3: RLS enabled on all 11 new tables
- [ ] Step 4: Component creation + milestone update triggers percent_complete recalculation
- [ ] Step 5: Drawing similarity detection finds matches above 85% threshold
- [ ] Step 6: RLS blocks access to other organization's data
- [ ] Step 7: Materialized views provide aggregated dashboard data
- [ ] Step 8: Welder stencil normalization and verification workflow
- [ ] Step 9: Permission checks enforced via RLS (viewer blocked from updates)
- [ ] Step 10: TypeScript types regenerated, compiles with 0 errors
- [ ] Step 11: Test coverage ≥70% overall, ≥80% for database logic
- [ ] Step 12: Field weld inspection workflow (foreman, QC tracking, repairs, turnover)

---

## Expected Execution Time

**Total Time**: 40-55 minutes (manual validation)

- Steps 1-3: 5 minutes (schema verification)
- Steps 4-5: 10 minutes (component + drawing tests)
- Steps 6-9: 15 minutes (RLS + permissions + welder tests)
- Steps 10-11: 10 minutes (TypeScript + test coverage)
- Step 12: 10 minutes (field weld inspection workflow)

---

## Troubleshooting

**Issue**: Milestone weights don't total 100%
- **Solution**: Check seed data in migration, ensure `validate_milestone_weights()` CHECK constraint exists

**Issue**: RLS blocks authorized user
- **Solution**: Verify user's `organization_id` matches project's `organization_id`, check RLS policy logic

**Issue**: Stored procedure not found
- **Solution**: Ensure migration applied successfully, check `SELECT * FROM pg_proc WHERE proname = 'calculate_component_percent'`

**Issue**: Materialized view stale data
- **Solution**: Manually refresh with `REFRESH MATERIALIZED VIEW CONCURRENTLY mv_package_readiness`

---

## Next Steps

After quickstart validation passes:
1. ✅ Phase 0 (Research) complete
2. ✅ Phase 1 (Design & Contracts) complete
3. ⏩ Ready for Phase 2 (/tasks command) - Generate ordered task breakdown
4. ⏩ Phase 3 (/implement command) - Execute tasks following TDD workflow

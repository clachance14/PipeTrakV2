# Quickstart: Testing Demo Project Data Population

**Feature**: 023-demo-data-population
**Date**: 2025-11-02

## Overview

This guide explains how to test the demo project data population feature locally and in production.

## Prerequisites

- Supabase CLI installed and configured
- Project linked to remote Supabase instance (`supabase link`)
- Service role key configured in `.env`
- Database migrations applied (`npx supabase db push --linked`)

## Testing Approach

### 1. Unit Tests (Seed Data Validation)

**Location**: `tests/contract/seed-data-structure.test.ts`

**Purpose**: Validate seed data file structure and counts

**Run**:
```bash
npm test tests/contract/seed-data-structure.test.ts
```

**What it tests**:
- Seed data has exactly 200 components
- Component distribution matches spec (40 spools, 80 supports, etc.)
- All natural key references are valid
- Milestone states respect dependencies
- Welder assignments only for "Weld Made" = true

---

### 2. Integration Tests (SQL Function)

**Location**: `tests/integration/demo-skeleton-creation.test.ts`

**Purpose**: Test `create_demo_skeleton` SQL function

**Run**:
```bash
npm test tests/integration/demo-skeleton-creation.test.ts
```

**What it tests**:
- Function creates exactly 5 areas
- Function creates exactly 5 systems
- Function creates exactly 10 test packages
- Function creates exactly 4 welders
- Function completes in <2 seconds
- Function is idempotent (safe to retry)

**Manual Test** (via Supabase SQL editor or psql):
```sql
-- Create test project
INSERT INTO organizations (id, name) VALUES (gen_random_uuid(), 'Test Org')
RETURNING id;  -- Copy this org_id

INSERT INTO projects (id, organization_id, name)
VALUES (gen_random_uuid(), '<org_id>', 'Test Project')
RETURNING id;  -- Copy this project_id

-- Run skeleton function
SELECT create_demo_skeleton(
  '<user_id>',
  '<org_id>',
  '<project_id>'
);

-- Verify results
SELECT COUNT(*) FROM areas WHERE project_id = '<project_id>';  -- Expect 5
SELECT COUNT(*) FROM systems WHERE project_id = '<project_id>';  -- Expect 5
SELECT COUNT(*) FROM test_packages WHERE project_id = '<project_id>';  -- Expect 10
SELECT COUNT(*) FROM welders WHERE organization_id = '<org_id>';  -- Expect 4
```

---

### 3. Integration Tests (Edge Function)

**Location**: `tests/integration/demo-bulk-population.test.ts`

**Purpose**: Test `populate-demo-data` Edge Function

**Run**:
```bash
npm test tests/integration/demo-bulk-population.test.ts
```

**What it tests**:
- Function creates exactly 20 drawings
- Function creates exactly 200 components
- Function creates ~120 field welds
- Function completes in <45 seconds
- All foreign keys resolved correctly
- Component distribution matches spec
- Welder assignments match "Weld Made" state

**Manual Test** (via Supabase Functions):
```bash
# 1. Run skeleton function first (see above)

# 2. Invoke Edge Function
curl -X POST \
  '<SUPABASE_URL>/functions/v1/populate-demo-data' \
  -H "Authorization: Bearer <ANON_KEY>" \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "<project_id>",
    "organizationId": "<org_id>"
  }'

# 3. Verify results (wait 30-45 seconds)
SELECT COUNT(*) FROM drawings WHERE project_id = '<project_id>';  -- Expect 20
SELECT COUNT(*) FROM components WHERE project_id = '<project_id>';  -- Expect 200
SELECT COUNT(*) FROM field_welds WHERE project_id = '<project_id>';  -- Expect ~120

# 4. Verify component distribution
SELECT component_type, COUNT(*)
FROM components
WHERE project_id = '<project_id>'
GROUP BY component_type;
-- Expect: spool=40, support=80, valve=50, flange=20, instrument=10

# 5. Verify welder assignments
SELECT COUNT(*)
FROM field_welds
WHERE project_id = '<project_id>'
AND welder_id IS NOT NULL;
-- Expect: ~78 (65% of 120)
```

---

### 4. Idempotency Tests

**Location**: `tests/integration/demo-idempotency.test.ts`

**Purpose**: Test retry scenarios (duplicate prevention)

**Run**:
```bash
npm test tests/integration/demo-idempotency.test.ts
```

**What it tests**:
- Calling skeleton function twice creates no duplicates
- Calling population function twice creates no duplicates
- Partial population + retry completes full dataset
- Error recovery scenarios

**Manual Test**:
```bash
# 1. Populate full dataset
curl -X POST '<SUPABASE_URL>/functions/v1/populate-demo-data' ...

# 2. Verify 200 components created
SELECT COUNT(*) FROM components WHERE project_id = '<project_id>';  -- 200

# 3. Retry population
curl -X POST '<SUPABASE_URL>/functions/v1/populate-demo-data' ...

# 4. Verify still 200 components (no duplicates)
SELECT COUNT(*) FROM components WHERE project_id = '<project_id>';  -- 200
```

---

### 5. End-to-End Tests (Full Demo Signup Flow)

**Location**: `tests/e2e/demo-signup-flow.spec.ts`

**Purpose**: Test complete user journey from homepage to populated project

**Run**:
```bash
npm test:e2e tests/e2e/demo-signup-flow.spec.ts
```

**What it tests**:
- User submits demo signup form
- User redirected to dashboard within 2 seconds
- Dashboard shows skeleton structure immediately
- Components/drawings populate within 45 seconds
- User can filter/search populated data

**Manual Test**:
1. Navigate to homepage (`http://localhost:5173`)
2. Click "Try Demo Project"
3. Fill out demo signup form (email + name)
4. Submit form
5. Verify redirect to dashboard <2s
6. Verify skeleton visible (5 areas, 5 systems, 10 packages, 4 welders)
7. Navigate to Components page
8. Wait 30-45 seconds
9. Verify 200 components appear
10. Filter by type (valve) → verify 50 valves
11. Navigate to Weld Log
12. Verify ~120 field welds
13. Verify ~65% have welder assignments

---

## Performance Benchmarks

**Skeleton Creation**:
- Target: <2 seconds
- Measure: Add timing logs to SQL function
- Command: `EXPLAIN ANALYZE SELECT create_demo_skeleton(...)`

**Bulk Population**:
- Target: <45 seconds
- Measure: Edge Function returns `executionTimeMs` in response
- Breakdown:
  - Drawings: <2s
  - Components: <10s
  - Welds: <5s
  - Milestones: <15s
  - Assignments: <3s
  - Overhead: <10s

**Load Test** (multiple concurrent demo signups):
```bash
# Run 10 concurrent signups
for i in {1..10}; do
  curl -X POST '<demo-signup-url>' -d '{"email":"test'$i'@example.com"}' &
done
wait

# Verify all 10 projects created successfully
SELECT COUNT(*) FROM projects WHERE name LIKE 'Demo Project%';  -- Expect 10
```

---

## Troubleshooting

### Issue: Skeleton function fails with "permission denied"

**Solution**: Ensure function is SECURITY DEFINER

```sql
ALTER FUNCTION create_demo_skeleton(UUID, UUID, UUID)
SECURITY DEFINER;
```

---

### Issue: Edge Function times out after 10 seconds

**Solution**: Ensure function is invoked async (fire-and-forget), not awaited in demo-signup

```typescript
// Correct (fire-and-forget)
supabase.functions.invoke('populate-demo-data', { body: {...} })

// Incorrect (awaits response, subject to timeout)
await supabase.functions.invoke('populate-demo-data', { body: {...} })
```

---

### Issue: Foreign key violations during population

**Solution**: Verify skeleton function ran successfully before population

```sql
-- Check if skeleton exists
SELECT COUNT(*) FROM areas WHERE project_id = '<project_id>';  -- Should be 5

-- If 0, run skeleton first
SELECT create_demo_skeleton('<user_id>', '<org_id>', '<project_id>');
```

---

### Issue: Duplicate components created after retry

**Solution**: Verify unique constraints and idempotency checks

```sql
-- Check for duplicates
SELECT identity_key, COUNT(*)
FROM components
WHERE project_id = '<project_id>'
GROUP BY identity_key
HAVING COUNT(*) > 1;

-- If duplicates exist, check unique constraint
\d components  -- Should show UNIQUE (project_id, component_type, identity_key)
```

---

## Verification Checklist

After running full demo signup flow, verify:

- [ ] Skeleton created in <2 seconds
- [ ] 5 areas created (Pipe Rack, ISBL, Containment Area, Water Process, Cooling Tower)
- [ ] 5 systems created (Air, Nitrogen, Steam, Process, Condensate)
- [ ] 10 test packages created (TP-01 through TP-10)
- [ ] 4 welders created (JD-123, SM-456, TR-789, KL-012)
- [ ] 20 drawings created
- [ ] 200 components created (40 spools, 80 supports, 50 valves, 20 flanges, 10 instruments)
- [ ] ~120 field welds created (3 per spool)
- [ ] ~78 welder assignments (65% of welds)
- [ ] All milestone states realistic (90-95% received, 60-70% installed, 0% tested/restored)
- [ ] All foreign keys valid (0 orphaned records)
- [ ] Retry creates no duplicates
- [ ] Full population completes in <45 seconds

---

## Next Steps

After verifying locally:

1. Deploy Edge Function: `supabase functions deploy populate-demo-data`
2. Deploy SQL migration: `npx supabase db push --linked`
3. Test on staging environment
4. Monitor production demo signups for performance/errors
5. Set up alerting for population failures

---

## Useful SQL Queries

**Count all demo entities**:
```sql
SELECT
  (SELECT COUNT(*) FROM areas WHERE project_id = '<project_id>') as areas,
  (SELECT COUNT(*) FROM systems WHERE project_id = '<project_id>') as systems,
  (SELECT COUNT(*) FROM test_packages WHERE project_id = '<project_id>') as packages,
  (SELECT COUNT(*) FROM welders WHERE organization_id = '<org_id>') as welders,
  (SELECT COUNT(*) FROM drawings WHERE project_id = '<project_id>') as drawings,
  (SELECT COUNT(*) FROM components WHERE project_id = '<project_id>') as components,
  (SELECT COUNT(*) FROM field_welds WHERE project_id = '<project_id>') as welds;
```

**Component distribution**:
```sql
SELECT component_type, COUNT(*)
FROM components
WHERE project_id = '<project_id>'
GROUP BY component_type
ORDER BY component_type;
```

**Milestone progression**:
```sql
SELECT
  COUNT(*) FILTER (WHERE current_milestones->>'receive' = 'true') as received,
  COUNT(*) FILTER (WHERE current_milestones->>'install' = 'true' OR current_milestones->>'erect' = 'true') as installed_erected,
  COUNT(*) FILTER (WHERE current_milestones->>'punch' = 'true') as punch,
  COUNT(*) FILTER (WHERE current_milestones->>'test' = 'true') as tested,
  COUNT(*) FILTER (WHERE current_milestones->>'restore' = 'true') as restored
FROM components
WHERE project_id = '<project_id>';
```

**Welder assignment distribution**:
```sql
SELECT w.stamp, COUNT(fw.id) as welds_assigned
FROM welders w
LEFT JOIN field_welds fw ON fw.welder_id = w.id
WHERE w.organization_id = '<org_id>'
GROUP BY w.stamp
ORDER BY w.stamp;
```

# Quickstart: Dashboard Recent Activity Feed

**Feature**: 018-activity-feed | **Branch**: `018-activity-feed` | **Date**: 2025-10-28

## Prerequisites

- **Supabase CLI installed**: `npm install -g supabase`
- **Project linked to remote Supabase**: `supabase link --project-ref <ref>`
- **Environment variables configured**: `.env` file with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- **Node.js 18+**: Required for Vite and TypeScript 5

## Local Development Setup

### 1. Apply Database Migration

The activity feed requires a new PostgreSQL view (`vw_recent_activity`).

```bash
# From project root
npx supabase db push --linked
```

**Expected Output**:
```
Applying migration 000XX_create_recent_activity_view.sql...
CREATE VIEW vw_recent_activity
GRANT SELECT ON vw_recent_activity TO authenticated
✓ Migration applied successfully
```

**Verify view creation**:

Option A - Via Supabase Dashboard SQL Editor:
```sql
SELECT * FROM vw_recent_activity LIMIT 1;
```

Option B - Via Node.js script:
```javascript
// query_view.mjs
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const envContent = readFileSync('.env', 'utf-8')
let supabaseUrl = ''
let supabaseAnonKey = ''

envContent.split('\n').forEach(line => {
  const trimmed = line.trim()
  if (trimmed.startsWith('VITE_SUPABASE_URL=')) {
    supabaseUrl = trimmed.substring('VITE_SUPABASE_URL='.length).trim()
  }
  if (trimmed.startsWith('VITE_SUPABASE_ANON_KEY=')) {
    supabaseAnonKey = trimmed.substring('VITE_SUPABASE_ANON_KEY='.length).trim()
  }
})

const supabase = createClient(supabaseUrl, supabaseAnonKey)

const { data, error, count } = await supabase
  .from('vw_recent_activity')
  .select('*', { count: 'exact' })
  .limit(5)

console.log('Row count:', count)
console.log('Sample data:', data)
console.log('Error:', error)
```

Run with: `node query_view.mjs`

---

### 2. Run Contract Tests

Validate TypeScript interfaces match expected view output:

```bash
npm test -- specs/018-activity-feed/contracts/activity-item.contract.test.tsx
```

**Expected Output**:
```
✓ ActivityItem Contract (15 tests)
  ✓ Interface Shape (4 tests)
  ✓ Type Guard (6 tests)
  ✓ Description Format Examples (3 tests)
  ✓ User Initials Examples (3 tests)
  ✓ Array Contract (3 tests)

Test Files  1 passed (1)
     Tests  15 passed (15)
```

---

### 3. Run Hook Tests

Test the `useAuditLog` hook implementation:

```bash
npm test -- src/hooks/useDashboardMetrics.test.ts
```

**Expected Coverage**:
- Query key structure
- Data transformation
- Real-time subscription setup and cleanup
- Project ID filtering
- Empty state handling

---

### 4. Start Development Server

```bash
npm run dev
```

**Open**: http://localhost:5173

**Navigate to**: Dashboard (`/` route)

**Expected Behavior**:
- If project has milestone updates → See last 10 activities
- If project is new → See "No recent activity" message
- Activities show: user initials, description, relative timestamp

---

### 5. Test Real-time Updates

**Setup**: Open dashboard in 2 browser windows/tabs

**Test Steps**:
1. **Window 1**: Navigate to Components page (`/components`)
2. **Window 2**: Stay on Dashboard page (`/`)
3. **Window 1**: Update a milestone (check Receive, set Weld to 50%, etc.)
4. **Window 2**: Watch activity feed

**Expected Result**:
- Within 3 seconds, new activity appears at top of feed in Window 2
- Description shows: user name, milestone, component, drawing
- User initials displayed in avatar circle

---

## Troubleshooting

### Issue: View not found

**Error**: `relation "vw_recent_activity" does not exist`

**Fix**: Ensure migration applied successfully
```bash
npx supabase db push --linked
```

Check migration status:
```bash
npx supabase migration list --linked
```

---

### Issue: No activities showing

**Possible Causes**:
1. **Project has no milestone updates yet**
   - Solution: Create test data via Components page
2. **Project filter incorrect**
   - Check: `ProjectContext` has valid `selectedProjectId`
3. **RLS blocking query**
   - Verify: User is authenticated and belongs to project's organization

**Debug Query**:
```javascript
// Check raw view data (bypasses frontend filters)
const { data, error } = await supabase
  .from('vw_recent_activity')
  .select('*')
  .limit(10)

console.log('View data:', data)
console.log('Error:', error)
```

---

### Issue: Real-time not working

**Possible Causes**:
1. **Realtime not enabled on milestone_events table**
   - Check: Supabase Dashboard → Database → Replication
   - Fix: Enable replication for `milestone_events`

2. **Subscription not set up**
   - Check: Browser console for "Realtime connected" message
   - Verify: `useAuditLog` hook has `useEffect` with channel subscription

3. **Query not invalidating**
   - Debug: Add `console.log` in Realtime callback
   - Verify: `queryClient.invalidateQueries` is called

---

### Issue: Wrong column name

**Error**: `column "drawing_number" does not exist`

**Cause**: View references incorrect column name

**Fix**: Migration should use `drawing_no_raw` (not `drawing_number`)
```sql
-- Correct:
WHEN d.drawing_no_raw IS NOT NULL THEN
  concat(' on Drawing ', d.drawing_no_raw)

-- Incorrect:
WHEN d.drawing_number IS NOT NULL THEN -- ❌ Column doesn't exist
  concat(' on Drawing ', d.drawing_number)
```

---

## Verification Checklist

- [ ] Migration applied successfully (`supabase db push --linked`)
- [ ] View queryable via Supabase Dashboard SQL Editor
- [ ] Contract tests pass (15/15 tests)
- [ ] Hook tests pass (all `useDashboardMetrics.test.ts` tests)
- [ ] Dev server starts without errors
- [ ] Dashboard shows activities (if milestone data exists)
- [ ] Real-time updates appear within 3 seconds
- [ ] User initials display correctly (2-3 characters)
- [ ] Component identities formatted correctly (all 11 types)
- [ ] Empty state shows "No recent activity" for new projects

---

## Performance Validation

### Query Performance Test

**Test**: Measure view query execution time

```javascript
// performance_test.mjs
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

// Load environment variables (same pattern as query_view.mjs)
const envContent = readFileSync('.env', 'utf-8')
let supabaseUrl = ''
let supabaseAnonKey = ''

envContent.split('\n').forEach(line => {
  const trimmed = line.trim()
  if (trimmed.startsWith('VITE_SUPABASE_URL=')) {
    supabaseUrl = trimmed.substring('VITE_SUPABASE_URL='.length).trim()
  }
  if (trimmed.startsWith('VITE_SUPABASE_ANON_KEY=')) {
    supabaseAnonKey = trimmed.substring('VITE_SUPABASE_ANON_KEY='.length).trim()
  }
})

const supabase = createClient(supabaseUrl, supabaseAnonKey)

const start = Date.now()
const { data, error } = await supabase
  .from('vw_recent_activity')
  .select('*')
  .eq('project_id', 'YOUR_PROJECT_ID_HERE')
  .order('timestamp', { ascending: false })
  .limit(10)
const elapsed = Date.now() - start

console.log('Query time:', elapsed, 'ms')
console.log('Target: <100ms')
console.log('Status:', elapsed < 100 ? '✅ PASS' : '❌ FAIL')
console.log('Rows returned:', data?.length)
```

**Expected Result**: Query time <100ms

---

## Next Steps

After local development setup is complete:

1. **Run full test suite**: `npm test`
2. **Check type safety**: `tsc -b`
3. **Lint code**: `npm run lint`
4. **Build for production**: `npm run build`
5. **Create PR**: Compare against `main` branch

**Ready for**:  `/speckit.tasks` to generate implementation task breakdown

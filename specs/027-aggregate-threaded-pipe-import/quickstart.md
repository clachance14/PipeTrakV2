# Quickstart: Aggregate Threaded Pipe Import

**Feature**: 027-aggregate-threaded-pipe-import
**Audience**: Developers testing or debugging this feature
**Prerequisites**: Local development environment set up, Supabase project linked

---

## Quick Overview

**What Changed**: Threaded pipe components now import as aggregate records (1 component per drawing+commodity+size) instead of discrete instances (1 per unit).

**Key Behavior**:
- CSV with `TYPE=Threaded_Pipe, QTY=100` creates **1 component** (not 100)
- Component has `identity_key.seq = null` (aggregate marker)
- Total linear feet stored in `attributes.total_linear_feet`
- Re-importing same identity **sums quantities** (50 + 50 = 100 LF)

---

## Testing Locally

### Step 1: Prepare Test CSV

Create a test CSV file at `/home/clachance14/projects/PipeTrak_V2/test-aggregate-import.csv`:

```csv
DRAWING,LINE,TYPE,CMDTY CODE,SIZE,QTY,AREA,SYSTEM
P-001,101,Threaded_Pipe,PIPE-SCH40,1",100,Reactor Building,Cooling Water
P-001,102,Valve,GATE-150,1",3,Reactor Building,Cooling Water
P-002,201,Threaded_Pipe,PIPE-SCH80,2",50,Turbine Hall,Steam
```

**Expected Result**:
- Drawing P-001: 1 aggregate threaded pipe (100 LF) + 3 discrete valves
- Drawing P-002: 1 aggregate threaded pipe (50 LF)
- **Total components created**: 5 (not 153)

---

### Step 2: Import via Edge Function

**Option A: Using Supabase CLI** (recommended for development):

```bash
# Navigate to project root
cd /home/clachance14/projects/PipeTrak_V2

# Deploy Edge Function locally (if not already running)
npx supabase functions serve import-takeoff

# In separate terminal, call function with test data
curl -X POST http://localhost:54321/functions/v1/import-takeoff \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "your-project-id-uuid",
    "rows": [
      {
        "type": "Threaded_Pipe",
        "drawing": "P-001",
        "lineNumber": "101",
        "cmdtyCode": "PIPE-SCH40",
        "size": "1\"",
        "qty": 100,
        "area": "Reactor Building",
        "system": "Cooling Water"
      }
    ]
  }'
```

**Option B: Using Frontend Import UI**:

1. Start dev server: `npm run dev`
2. Navigate to: `http://localhost:5173/imports`
3. Upload `test-aggregate-import.csv`
4. Click "Import" and observe results

---

### Step 3: Verify Database State

**Query via Node.js script**:

Create `/home/clachance14/projects/PipeTrak_V2/verify_aggregate_import.mjs`:

```javascript
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

// Load environment variables
const envContent = readFileSync('.env', 'utf-8')
let supabaseUrl = ''
let supabaseServiceKey = ''

envContent.split('\n').forEach(line => {
  const trimmed = line.trim()
  if (trimmed.startsWith('VITE_SUPABASE_URL=')) {
    supabaseUrl = trimmed.substring('VITE_SUPABASE_URL='.length).trim()
  }
  if (trimmed.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) {
    supabaseServiceKey = trimmed.substring('SUPABASE_SERVICE_ROLE_KEY='.length).trim()
  }
})

// Service role bypasses RLS
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false, autoRefreshToken: false }
})

// Query all threaded_pipe components
const { data, error, count } = await supabase
  .from('components')
  .select('id, component_type, identity_key, attributes, current_milestones', { count: 'exact' })
  .eq('component_type', 'threaded_pipe')

console.log('\n=== Threaded Pipe Components ===')
console.log(`Total count: ${count}`)

data?.forEach((component, index) => {
  console.log(`\n[${index + 1}] Component:`)
  console.log(`  ID: ${component.id}`)
  console.log(`  Identity Key:`, component.identity_key)
  console.log(`  Aggregate: ${component.identity_key.seq === null ? 'YES ✅' : 'NO (discrete)'}`)
  console.log(`  Total Linear Feet: ${component.attributes?.total_linear_feet || 'N/A'}`)
  console.log(`  Original Qty: ${component.attributes?.original_qty || 'N/A'}`)
  console.log(`  Milestones:`, component.current_milestones)
})
```

Run: `node verify_aggregate_import.mjs`

**Expected Output**:
```
=== Threaded Pipe Components ===
Total count: 2

[1] Component:
  ID: abc-123
  Identity Key: { drawing_norm: 'P-001', commodity_code: 'PIPE-SCH40', size: '1', seq: null }
  Aggregate: YES ✅
  Total Linear Feet: 100
  Original Qty: 100
  Milestones: { Fabricate: 0, Install: 0, ... }

[2] Component:
  ID: def-456
  Identity Key: { drawing_norm: 'P-002', commodity_code: 'PIPE-SCH80', size: '2', seq: null }
  Aggregate: YES ✅
  Total Linear Feet: 50
  Original Qty: 50
  Milestones: { Fabricate: 0, Install: 0, ... }
```

---

### Step 4: Verify Frontend Display

1. Navigate to Drawings page: `http://localhost:5173/drawings`
2. Find drawing P-001 and expand it
3. **Verify** component row displays: `"101 (100 LF)"` in line number column
4. Click milestone input (e.g., Fabricate)
5. Enter `75` (representing 75%)
6. **Verify** helper text displays: `"75 LF of 100 LF"` below input

**Screenshot Checkpoint**:
```
┌───────────────────────────────────────────────┐
│ Line #  │ Fabricate │ Install │ Erect │ ...   │
├───────────────────────────────────────────────┤
│ 101     │  [  75  ] │  [  0  ]│ [  0 ]│       │
│ (100 LF)│  75 LF of │         │       │       │
│         │  100 LF   │         │       │       │
└───────────────────────────────────────────────┘
```

---

## Testing Quantity Summing

### Scenario: Re-import with same identity

**Step 1**: Import initial 50 LF

```json
{
  "projectId": "your-project-id",
  "rows": [{
    "type": "Threaded_Pipe",
    "drawing": "P-003",
    "lineNumber": "301",
    "cmdtyCode": "PIPE-SCH40",
    "size": "1\"",
    "qty": 50
  }]
}
```

**Verify**:
```bash
node verify_aggregate_import.mjs
# Expected: total_linear_feet = 50
```

**Step 2**: Import additional 50 LF (same identity)

```json
{
  "projectId": "your-project-id",
  "rows": [{
    "type": "Threaded_Pipe",
    "drawing": "P-003",
    "lineNumber": "301",
    "cmdtyCode": "PIPE-SCH40",
    "size": "1\"",
    "qty": 50
  }]
}
```

**Verify**:
```bash
node verify_aggregate_import.mjs
# Expected: total_linear_feet = 100 (50 + 50)
# Component count still 1 (updated, not duplicated)
```

---

## Testing Edge Cases

### Edge Case 1: Invalid Quantity (QTY ≤ 0)

**Test**:
```json
{
  "rows": [{
    "type": "Threaded_Pipe",
    "qty": 0
  }]
}
```

**Expected Response**:
```json
{
  "success": false,
  "error": "VALIDATION_ERROR",
  "message": "Invalid quantity for threaded pipe at row 1: QTY must be > 0",
  "details": {
    "rowIndex": 0,
    "field": "qty",
    "value": 0
  }
}
```

---

### Edge Case 2: Mixed Component Types

**Test**:
```csv
DRAWING,LINE,TYPE,CMDTY CODE,SIZE,QTY
P-004,401,Threaded_Pipe,PIPE-SCH40,1",100
P-004,402,Valve,GATE-150,1",3
P-004,403,Instrument,GAUGE-PT,1",1
```

**Expected**:
- Component count: **5**
  - 1 aggregate threaded pipe (seq: null, 100 LF)
  - 3 discrete valves (seq: 1, 2, 3)
  - 1 discrete instrument (seq: 1)

---

### Edge Case 3: Coexistence with Legacy Discrete

**Setup**: Manually create legacy discrete threaded pipe components (if any exist from before this feature)

**Test**: Import aggregate threaded pipe with same drawing+commodity+size

**Expected**:
- Both aggregate (seq: null) and discrete (seq: 1, 2, 3) coexist without conflict
- Frontend displays both rows separately
- No UNIQUE constraint violation

---

## Debugging Tips

### Problem: Component not displaying in UI

**Check**:
1. Component created in database? (run `verify_aggregate_import.mjs`)
2. TanStack Query cache invalidated? (check Network tab for refetch after import)
3. RLS policies allowing read access? (verify user has project membership)

**Fix**:
```typescript
// Force refetch in browser console
window.queryClient.invalidateQueries({ queryKey: ['components'] });
```

---

### Problem: Helper text not showing

**Check**:
1. Is `identity_key.seq === null`? (aggregate detection logic)
2. Is `attributes.total_linear_feet` present? (data model)
3. Is component type `threaded_pipe`? (case-sensitive in TypeScript)

**Debug**:
```typescript
// Add to PartialMilestoneInput.tsx
console.log('Component:', component);
console.log('Is aggregate:', component.identity_key.seq === null);
console.log('Total LF:', component.attributes?.total_linear_feet);
```

---

### Problem: Quantity not summing on re-import

**Check**:
1. Are identity keys **exactly** matching? (case-sensitive, normalization applied)
2. Is Edge Function using latest code? (redeploy if needed)
3. Transaction rolled back due to error? (check Edge Function logs)

**Verify Identity Match**:
```sql
-- Query components with same drawing+commodity+size
SELECT id, identity_key, attributes->>'total_linear_feet' as total_lf
FROM components
WHERE component_type = 'threaded_pipe'
  AND identity_key->>'drawing_norm' = 'P-001'
  AND identity_key->>'commodity_code' = 'PIPE-SCH40'
  AND identity_key->>'size' = '1';
```

---

## Performance Testing

### Test: Import 1000+ aggregate threaded pipe rows

**Generate test data**:
```bash
# Create large CSV
for i in {1..1000}; do
  echo "P-$(printf "%03d" $i),101,Threaded_Pipe,PIPE-SCH40,1\",100,Area-A,System-X"
done > test-1000-threaded-pipe.csv
```

**Import and measure**:
```bash
time curl -X POST http://localhost:54321/functions/v1/import-takeoff \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d @import-payload.json
```

**Expected**: < 5 seconds for 1000 rows (target from plan.md)

---

## Common Test Scenarios

### Scenario 1: Fresh Project Import

**Steps**:
1. Create new test project
2. Import CSV with 100 LF threaded pipe
3. Verify 1 component created
4. Update Fabricate milestone to 75%
5. Verify helper text shows "75 LF of 100 LF"

---

### Scenario 2: Re-import with Milestone Progress

**Steps**:
1. Import 50 LF threaded pipe
2. Set Fabricate to 100% (50 LF complete)
3. Re-import 50 LF (same identity)
4. **Verify**: total_linear_feet = 100, Fabricate still 100% (preserved)
5. **Verify**: Warning toast shown: "Milestone percentages preserved. Review progress for updated quantities."

---

### Scenario 3: Fallback for Legacy Components

**Steps**:
1. Manually create component missing `total_linear_feet`
2. Navigate to Drawings page
3. **Verify**: Display falls back to `original_qty` (no crash)

---

## Next Steps

After verifying local functionality:

1. **Run unit tests**: `npm test -- transaction-v2.test.ts`
2. **Run component tests**: `npm test -- ComponentRow.test.tsx PartialMilestoneInput.test.tsx`
3. **Run integration tests**: `npm test -- import-aggregate-threaded-pipe.test.ts`
4. **Check coverage**: `npm test -- --coverage` (target: ≥70%)
5. **Deploy to staging**: `npx supabase functions deploy import-takeoff`

---

## Related Documentation

- [Specification](spec.md) - Feature requirements and user stories
- [Implementation Plan](plan.md) - Technical approach and constitution check
- [Research](research.md) - Technical decisions and patterns
- [Data Model](data-model.md) - Component structure and milestone semantics
- [API Contract](contracts/import-takeoff.json) - Edge Function request/response schema

---

**Status**: ✅ Quickstart Complete | Ready for Local Testing

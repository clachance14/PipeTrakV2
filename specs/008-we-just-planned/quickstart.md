# Quickstart: Authenticated Pages with Real Data

**Feature**: 008-we-just-planned
**Date**: 2025-10-17
**Purpose**: Manual validation workflow to verify all functionality works correctly

## Prerequisites

- Feature 005 (Sprint 1 Core Foundation) must be complete
- Database has 14 tables deployed with RLS policies
- At least one test user with access to a project
- Test data: 10+ components, 2+ test packages, 5+ welders, 3+ needs review items

## Setup Test Data (SQL)

Run this SQL in Supabase SQL Editor to create test data:

```sql
-- Create test project
INSERT INTO projects (id, org_id, name, description)
VALUES ('test-project-quickstart', 'test-org-id', 'Quickstart Test Project', 'Test data for Feature 008');

-- Create test components
INSERT INTO components (project_id, component_type, progress_template_id, identity_key, percent_complete, current_milestones)
SELECT
  'test-project-quickstart',
  'spool',
  (SELECT id FROM progress_templates WHERE component_type='spool' LIMIT 1),
  json_build_object('spool_id', 'SP-' || generate_series)::jsonb,
  (random() * 100)::numeric(5,2),
  '{}'::jsonb
FROM generate_series(1, 10);

-- Create test packages
INSERT INTO test_packages (project_id, name, target_date)
VALUES
  ('test-project-quickstart', 'TP-001', '2025-12-01'),
  ('test-project-quickstart', 'TP-002', '2025-12-15');

-- Create test welders
INSERT INTO welders (project_id, name, stencil, stencil_norm, status)
VALUES
  ('test-project-quickstart', 'John Doe', 'JD-123', 'JD-123', 'verified'),
  ('test-project-quickstart', 'Jane Smith', 'JS-456', 'JS-456', 'unverified'),
  ('test-project-quickstart', 'Mike Wilson', 'MW-789', 'MW-789', 'unverified');

-- Create test needs review items
INSERT INTO needs_review (project_id, type, status, payload)
VALUES
  ('test-project-quickstart', 'verify_welder', 'pending', '{"welder_id":"test-id","usage_count":7}'::jsonb),
  ('test-project-quickstart', 'out_of_sequence', 'pending', '{"milestone":"Test","prerequisite":"Install"}'::jsonb),
  ('test-project-quickstart', 'rollback', 'pending', '{"milestone":"Weld Made","component_id":"test-comp-id"}'::jsonb);
```

---

## Validation Steps

### Step 1: Login & Auto-Selection

**Actions**:
1. Clear browser localStorage (DevTools → Application → Local Storage → Clear)
2. Navigate to `/login`
3. Log in with test credentials
4. Observe landing page

**Expected**:
- ✅ Redirects to `/` (dashboard)
- ✅ First project auto-selected in project dropdown (top nav)
- ✅ Dashboard loads with real data (not hard-coded placeholders)
- ✅ Sidebar is visible on left (expanded by default)

**Screenshot Checkpoint**: Dashboard with sidebar expanded

---

### Step 2: Sidebar Navigation

**Actions**:
1. Click sidebar toggle button (icon in top-left of sidebar)
2. Observe sidebar collapse animation
3. Click toggle again
4. Refresh page (F5)

**Expected**:
- ✅ Sidebar collapses to icon-only (64px width)
- ✅ Smooth transition animation (<300ms)
- ✅ Icons remain visible, labels hidden
- ✅ Toggle button remains accessible
- ✅ After refresh: Sidebar state persists (remains collapsed)
- ✅ localStorage has `sidebar-collapsed: "true"`

**Screenshot Checkpoint**: Sidebar collapsed with icons only

---

### Step 3: Dashboard Metrics

**Actions**:
1. Expand sidebar (if collapsed)
2. Navigate to Dashboard (click "Dashboard" in sidebar)
3. Observe 4 metric cards

**Expected**:
- ✅ **Overall Progress**: Shows percentage (not hard-coded "67%")
- ✅ **Component Count**: Shows actual count (e.g., "10 components")
- ✅ **Packages Ready**: Shows count of 100% complete packages
- ✅ **Needs Review**: Shows pending count (not hard-coded "23")
- ✅ Badge on sidebar "Needs Review" nav item shows same count
- ✅ Recent Activity: Shows last 10 events (user initials + descriptions)
- ✅ Quick Access cards: All links work (navigate to correct pages)

**Screenshot Checkpoint**: Dashboard with real metrics

---

### Step 4: Test Packages Page - Filtering

**Actions**:
1. Click "Test Packages" in sidebar
2. Observe package grid
3. Click "Ready" filter button
4. Click "Blocked" filter button
5. Click "All" filter button

**Expected**:
- ✅ Page shows grid of package cards (not hard-coded)
- ✅ Each card shows: name, progress %, component count, blocker count, target date
- ✅ "Ready" filter: Only shows packages at 100%
- ✅ "Blocked" filter: Only shows packages with blockers > 0
- ✅ "All" filter: Shows all packages
- ✅ Progress bars: Green for 100%, blue for <100%, amber badge for blockers

**Screenshot Checkpoint**: Packages page with filters

---

### Step 5: Test Packages Page - Searching & Sorting

**Actions**:
1. Type "TP-001" in search box
2. Wait 300ms (debounce)
3. Clear search
4. Click "Sort by Progress" dropdown
5. Select "Target Date"

**Expected**:
- ✅ Search: Filters packages by name (shows only matching)
- ✅ Debounce: No network requests until 300ms after typing stops
- ✅ Sort by Progress: Packages ordered by progress % (ascending)
- ✅ Sort by Target Date: Packages ordered by target date
- ✅ Sort by Name: Packages ordered alphabetically

**Screenshot Checkpoint**: Packages page with search result

---

### Step 6: Needs Review Page - List Display

**Actions**:
1. Click "Needs Review" in sidebar
2. Observe list of review items
3. Note age color coding

**Expected**:
- ✅ Page shows list of pending items (not hard-coded)
- ✅ Each item shows: type badge, description, age
- ✅ Age colors: <1 day gray, 1-3 days amber, >3 days red
- ✅ Type badges: Different colors per type (out_of_sequence, verify_welder, etc.)
- ✅ Badge count on sidebar matches list count

**Screenshot Checkpoint**: Needs Review list with color-coded ages

---

### Step 7: Needs Review Page - Resolve Workflow

**Actions**:
1. Click "Resolve" button on first item
2. Observe modal open
3. Type resolution note: "Fixed issue by..."
4. Click "Resolve" button in modal
5. Observe item disappear from list

**Expected**:
- ✅ Modal opens with item details
- ✅ Resolution note text area is optional
- ✅ "Resolve" button enabled
- ✅ After submit: Item disappears from pending list
- ✅ Badge count decreases by 1
- ✅ Success toast notification shown
- ✅ Database: `needs_review` row updated (status='resolved', resolved_at, resolved_by)

**Screenshot Checkpoint**: Resolve modal open

---

### Step 8: Welders Page - Table Display

**Actions**:
1. Click "Welders" in sidebar
2. Observe welder table
3. Note weld counts

**Expected**:
- ✅ Table shows all welders (not hard-coded)
- ✅ Columns: Name, Stencil, Status, Weld Count, Verified Date, Actions
- ✅ Status badges: Green "verified", Amber "unverified"
- ✅ Weld Count: Shows count of "Weld Made" events per welder
- ✅ Verified Date: Shows date for verified welders, empty for unverified
- ✅ Actions: "Verify" button only on unverified welders

**Screenshot Checkpoint**: Welders table

---

### Step 9: Welders Page - Add Welder

**Actions**:
1. Click "Add Welder" button
2. Fill in name: "Test Welder"
3. Fill in stencil: "tw-999" (lowercase)
4. Click "Create" button
5. Observe new row in table

**Expected**:
- ✅ Modal opens with form
- ✅ Name and Stencil fields required
- ✅ After submit: Welder appears in table
- ✅ Stencil normalized to uppercase: "TW-999"
- ✅ Status: "unverified"
- ✅ Weld Count: 0

**Error Test**:
1. Try to create welder with same stencil: "TW-999"
2. Expect error message: "Welder stencil already exists"

**Screenshot Checkpoint**: Add Welder modal

---

### Step 10: Welders Page - Verify Welder

**Actions** (requires `can_manage_welders` permission):
1. Click "Verify" button on unverified welder
2. Observe confirmation dialog
3. Click "Confirm" button
4. Observe status change

**Expected**:
- ✅ Confirmation dialog shows welder details
- ✅ After confirm: Status badge changes to green "verified"
- ✅ Verified Date populated with today's date
- ✅ "Verify" button disappears (no unverify action)
- ✅ Database: `welders` row updated (status='verified', verified_at, verified_by)

**Permission Test** (as viewer role):
- ✅ "Verify" button is hidden (not just disabled)
- ✅ "Add Welder" button is hidden

**Screenshot Checkpoint**: Verify confirmation dialog

---

### Step 11: Imports Page - Recent History

**Actions**:
1. Click "Imports" in sidebar
2. Observe recent imports list
3. Click template download links

**Expected**:
- ✅ Page shows recent import history (from audit_log)
- ✅ Each entry shows: filename, component count, timestamp, status
- ✅ If no recent imports: "No recent imports" empty state
- ✅ Template download buttons: Download actual Excel files
- ✅ Upload area: Shows "Coming Soon" message (no upload functionality)

**Screenshot Checkpoint**: Imports page with recent history

---

### Step 12: Project Switching

**Actions**:
1. Navigate to Dashboard
2. Click project selector dropdown (top nav)
3. Select different project
4. Observe all pages refresh

**Expected**:
- ✅ Dashboard metrics change immediately
- ✅ All counts update to new project data
- ✅ Navigate to Packages page: Shows new project's packages
- ✅ Navigate to Welders page: Shows new project's welders
- ✅ Navigate to Needs Review: Shows new project's items
- ✅ Badge counts update
- ✅ Recent activity updates
- ✅ No stale data from previous project

**Screenshot Checkpoint**: Dashboard after project switch

---

### Step 13: Permission-Based UI (Role Testing)

**Actions** (requires multiple test users):
1. Log in as **admin** role
2. Observe all nav items visible
3. Log out
4. Log in as **viewer** role
5. Observe restricted items hidden

**Expected - Admin**:
- ✅ All sidebar nav items visible (Dashboard, Components, Drawings, Packages, Needs Review, Welders, Imports, Team)
- ✅ "Verify" buttons visible on Welders page
- ✅ "Resolve" buttons visible on Needs Review page
- ✅ "Add Welder" button visible

**Expected - Viewer**:
- ✅ "Team" nav item hidden (requires `can_manage_team`)
- ✅ "Verify" buttons hidden (requires `can_manage_welders`)
- ✅ "Resolve" buttons hidden (requires `can_resolve_reviews`)
- ✅ "Add Welder" button hidden
- ✅ Dashboard and list pages still accessible (read-only)

**Screenshot Checkpoint**: Sidebar as viewer (Team hidden)

---

### Step 14: Empty States

**Actions**:
1. Create new empty project (no data)
2. Select empty project from dropdown
3. Navigate to each page

**Expected**:
- ✅ Dashboard: 0% progress, 0 components, 0 packages, 0 reviews
- ✅ Packages page: "No test packages found" with "Create Package" button
- ✅ Needs Review: "No items need review" with green checkmark
- ✅ Welders: Empty table with "Add Welder" button
- ✅ Imports: "No recent imports"
- ✅ All empty states have appropriate icons and messages

**Screenshot Checkpoint**: Empty state on Packages page

---

### Step 15: Error States

**Actions**:
1. Disconnect network (DevTools → Network → Offline)
2. Refresh Dashboard
3. Observe error state
4. Reconnect network
5. Click "Retry" button

**Expected**:
- ✅ Dashboard shows error message: "Failed to load metrics"
- ✅ Error icon (red alert circle)
- ✅ User-friendly message (not technical stack trace)
- ✅ "Retry" button visible
- ✅ After reconnect + retry: Dashboard loads successfully
- ✅ Same pattern on all pages (Packages, Needs Review, Welders)

**Screenshot Checkpoint**: Error state with retry button

---

## Success Criteria

All 15 steps must pass with ✅ checkmarks:

- [ ] Step 1: Login & Auto-Selection
- [ ] Step 2: Sidebar Navigation & Persistence
- [ ] Step 3: Dashboard Metrics (real data)
- [ ] Step 4: Packages Filtering
- [ ] Step 5: Packages Searching & Sorting
- [ ] Step 6: Needs Review List Display
- [ ] Step 7: Needs Review Resolve Workflow
- [ ] Step 8: Welders Table Display
- [ ] Step 9: Add Welder with Validation
- [ ] Step 10: Verify Welder with Permissions
- [ ] Step 11: Imports Recent History
- [ ] Step 12: Project Switching Data Refresh
- [ ] Step 13: Permission-Based UI Hiding
- [ ] Step 14: Empty States Handling
- [ ] Step 15: Error States with Retry

## Performance Validation

Run Chrome DevTools Performance profiler:

- ✅ Dashboard initial load: <500ms p95
- ✅ Page transitions: <200ms p95
- ✅ Sidebar toggle: <50ms p95
- ✅ Search/filter response: <300ms (debounced)
- ✅ Project switch: <1s p95

## Cleanup

Remove test data after validation:

```sql
DELETE FROM components WHERE project_id = 'test-project-quickstart';
DELETE FROM test_packages WHERE project_id = 'test-project-quickstart';
DELETE FROM welders WHERE project_id = 'test-project-quickstart';
DELETE FROM needs_review WHERE project_id = 'test-project-quickstart';
DELETE FROM projects WHERE id = 'test-project-quickstart';
```

---

**Validation Complete**: ✅ All steps passed, feature ready for production

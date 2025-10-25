# Quickstart: Add New Project

**Feature**: 013-the-new-add
**Estimated Time**: 5 minutes
**Prerequisites**: Running dev server, authenticated user with ≥1 existing project

## Purpose
Manual validation script to verify the "Add New Project" feature works end-to-end in a real browser. Run this after implementation is complete but before merging to main.

---

## Setup

### 1. Start Development Server
```bash
npm run dev
```

Wait for: `http://localhost:5173` to be ready

### 2. Open Browser
- Navigate to `http://localhost:5173`
- If not logged in, log in with test credentials
- Verify you see the navbar with project dropdown

---

## Test Scenario 1: Dropdown Includes "Add New Project" Option

**Steps**:
1. Click the project dropdown in the navbar (between "PipeTrak" logo and search bar)
2. Observe the dropdown options

**Expected Result**:
- ✅ Dropdown shows all existing projects
- ✅ Last option is "➕ Add New Project"
- ✅ Option is clickable

**Failure Indicators**:
- ❌ "Add New Project" option missing
- ❌ Option appears in wrong position (not at bottom)

---

## Test Scenario 2: Navigates to Creation Page

**Steps**:
1. Open project dropdown
2. Select "➕ Add New Project"
3. Observe URL and page content

**Expected Result**:
- ✅ URL changes to `/projects/new`
- ✅ Page shows "Create New Project" heading (or similar)
- ✅ Form displays with two input fields (Name and Description)
- ✅ "Create Project" button visible
- ✅ "Cancel" button visible

**Failure Indicators**:
- ❌ URL does not change
- ❌ 404 page shown
- ❌ Form not rendered

---

## Test Scenario 3: Form Validation (Empty Fields)

**Steps**:
1. Navigate to `/projects/new` (via dropdown or directly)
2. Leave both fields empty
3. Click "Create Project" button
4. Observe validation messages

**Expected Result**:
- ✅ Error message appears below Name field: "Project name is required" (or similar)
- ✅ Error message appears below Description field: "Description is required" (or similar)
- ✅ No network request sent (check Network tab in DevTools)
- ✅ User remains on `/projects/new`

**Failure Indicators**:
- ❌ No validation errors shown
- ❌ Network request sent with empty data
- ❌ Page navigates away

---

## Test Scenario 4: Form Validation (Whitespace Only)

**Steps**:
1. Navigate to `/projects/new`
2. Enter "   " (spaces) in Name field
3. Enter "   " (spaces) in Description field
4. Click "Create Project"

**Expected Result**:
- ✅ Same as Test Scenario 3 (whitespace treated as empty)

**Failure Indicators**:
- ❌ Validation passes (whitespace accepted as valid)

---

## Test Scenario 5: Successful Project Creation

**Steps**:
1. Navigate to `/projects/new`
2. Enter Name: "Quickstart Test Project"
3. Enter Description: "Testing the add new project feature"
4. Click "Create Project"
5. Wait for response
6. Observe URL, dropdown, and page content

**Expected Result**:
- ✅ URL changes to `/` (home page)
- ✅ Project dropdown now shows "Quickstart Test Project" as selected
- ✅ No error messages displayed
- ✅ Toast notification (optional): "Project created successfully" or similar

**Verify in Supabase**:
1. Open Supabase Dashboard → Table Editor → `projects`
2. Verify new row exists with name "Quickstart Test Project"
3. Verify `organization_id` matches your user's organization

**Failure Indicators**:
- ❌ Page does not navigate
- ❌ Error toast appears
- ❌ Dropdown does not show new project
- ❌ Project not created in database

---

## Test Scenario 6: Error Handling (Network Failure)

**Note**: This scenario requires simulating a network error. Skip if you cannot mock network responses.

**Steps**:
1. Open DevTools → Network tab
2. Enable "Offline" mode (or use network throttling to simulate slow connection)
3. Navigate to `/projects/new`
4. Enter valid Name: "Offline Test"
5. Enter valid Description: "Testing error handling"
6. Click "Create Project"
7. Observe error handling

**Expected Result**:
- ✅ Error toast appears: "Failed to create project: [error message]"
- ✅ User remains on `/projects/new`
- ✅ Form data preserved (Name and Description still filled)
- ✅ Dropdown does NOT change selection

**Failure Indicators**:
- ❌ No error message shown
- ❌ Page navigates away
- ❌ Form data cleared
- ❌ Application crashes

**Cleanup**:
- Disable "Offline" mode in DevTools

---

## Test Scenario 7: Cancel Button

**Steps**:
1. Navigate to `/projects/new`
2. Enter Name: "Canceled Project"
3. Enter Description: "This should not be created"
4. Click "Cancel" button
5. Observe URL and page content

**Expected Result**:
- ✅ URL changes to `/` (home page)
- ✅ No project created (check Supabase or verify dropdown does not show "Canceled Project")

**Failure Indicators**:
- ❌ Project created despite clicking Cancel
- ❌ Page does not navigate

---

## Test Scenario 8: No Existing Projects

**Note**: This scenario requires a fresh user account with zero projects. Skip if not applicable.

**Steps**:
1. Log in with user who has no projects
2. Observe navbar dropdown

**Expected Result**:
- ✅ Dropdown shows "No projects yet" (or similar)
- ✅ Dropdown still includes "➕ Add New Project" option
- ✅ Selecting "Add New Project" navigates to `/projects/new`

**Failure Indicators**:
- ❌ Dropdown disabled or empty
- ❌ "Add New Project" option missing

---

## Test Scenario 9: Dropdown State After Creation

**Steps**:
1. Note current selected project (e.g., "Project A")
2. Navigate to `/projects/new` via dropdown
3. Observe dropdown value while on creation page
4. Create a new project "Project B"
5. After redirect to home, observe dropdown

**Expected Result**:
- ✅ While on `/projects/new`, dropdown shows previous selection ("Project A") - **NOT** "__new__"
- ✅ After creating "Project B", dropdown shows "Project B" as selected

**Failure Indicators**:
- ❌ Dropdown shows "__new__" or blank while on creation page
- ❌ Dropdown does not update to new project after creation

---

## Test Scenario 10: Direct URL Access

**Steps**:
1. Manually type `/projects/new` in browser address bar
2. Press Enter
3. Observe page

**Expected Result**:
- ✅ Page loads correctly (same as navigating via dropdown)
- ✅ ProtectedRoute enforces authentication (redirects to login if not authenticated)

**Failure Indicators**:
- ❌ 404 error
- ❌ Unauthenticated users can access page

---

## Cleanup

After testing, delete test projects created during this quickstart:

**Option 1: Via Supabase Dashboard**
1. Open Table Editor → `projects`
2. Find rows with name "Quickstart Test Project", "Project B", etc.
3. Delete rows

**Option 2: Via Application (if delete feature exists)**
1. Select project from dropdown
2. Navigate to project settings
3. Delete project

---

## Acceptance Criteria Checklist

- [ ] All 10 test scenarios pass
- [ ] No console errors during testing
- [ ] Form is responsive (test on mobile viewport)
- [ ] Keyboard navigation works (Tab, Enter, Esc)
- [ ] Screen reader announces form labels and errors (optional, test with screen reader)

---

## Troubleshooting

### Dropdown option not appearing
- **Check**: Layout.tsx includes `<option value="__new__">➕ Add New Project</option>`
- **Check**: Dropdown rendering logic not filtering out the option

### Route not found (404)
- **Check**: App.tsx includes `<Route path="/projects/new" element={<ProtectedRoute><CreateProjectPage /></ProtectedRoute>} />`

### Form validation not working
- **Check**: CreateProjectPage validates on submit
- **Check**: Validation logic trims whitespace before checking

### Project not auto-selected after creation
- **Check**: `onSuccess` callback calls `setSelectedProjectId(newProject.id)`
- **Check**: ProjectContext updates localStorage

### Error toast not showing
- **Check**: Sonner `<Toaster />` component rendered in App.tsx
- **Check**: `toast.error()` called in `onError` callback

---

**Status**: ✅ Quickstart ready for manual validation post-implementation

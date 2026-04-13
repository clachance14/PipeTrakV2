# Component Editing in Drawing Views

## Problem

The AI extraction pipeline (Gemini-powered BOM extraction + component-mapper classification) sometimes misclassifies components, creates components that shouldn't be tracked, or misses components entirely. Currently there is no way to correct these errors after extraction. Users must accept whatever the AI produced, which erodes trust and creates inaccurate progress tracking.

## Solution

Extend the existing `ComponentMetadataModal` with an "Edit" tab (Admin/PM only) that enables reclassification, deletion, identity/attribute editing, and manual component creation. Available in both the Drawing Table and Drawing Viewer sidebar.

## Scope

### In Scope

1. **Reclassify** - Change component_type (e.g., misc_component -> valve). Locked when component has any progress recorded (percent_complete > 0).
2. **Delete** - Soft-delete via is_retired flag. Single delete from modal, bulk delete via checkboxes in Drawing Table.
3. **Edit Identity/Attributes** - Change commodity code, size, description, quantity. Always editable regardless of progress.
4. **Add Component Manually** - Type-adaptive form to create components the AI missed. Dropdown for type selection, fields adapt based on type.

### Out of Scope

- Split aggregate components (pipe/threaded_pipe) into individual records
- Merge duplicate components
- Re-run AI extraction on individual components
- Undo/revert edits (audit trail via History tab is sufficient)

## Permissions

Edit access is granted to roles with administrative authority. All other roles are read-only.

- **Edit access** (`owner`, `admin`, `project_manager`): Full access to all edit operations (reclassify, delete, edit identity/attributes, add component)
- **Read-only** (`foreman`, `qc_inspector`, `welder`, `viewer`): No Edit tab, no checkboxes, no Add button. Sees "Details" tab (existing read-only view).

Permission check in RPCs: `role IN ('owner', 'admin', 'project_manager')`

## Design

### Modal Changes

The existing `ComponentMetadataModal` tabs (Overview, Details, Milestones, History) change for Admin/PM users:

- **"Details" tab is replaced by "Edit" tab** - same information but with editable fields
- Field Users continue to see "Details" (read-only)
- Tab order: Overview, Edit (or Details), Milestones, History

### Edit Tab Layout

Three sections within the Edit tab:

**1. Classification Section**
- Component type dropdown (all tracked types: spool, field_weld, support, valve, fitting, flange, instrument, tubing, hose, misc_component, threaded_pipe, pipe)
- Size field
- When `percent_complete > 0` for any sibling: section shows "Locked - has progress" badge, fields are disabled
- When editable: shows "Editable" badge

**2. Identity Section**
- Commodity Code (text input)
- Size (text input)
- Description (text input, optional)
- Always editable regardless of progress

**3. Attributes Section**
- Item Number (text input)
- Quantity (number input) - for exploded types only
- Total Linear Feet (number input) - for pipe/threaded_pipe only
- Fields adapt based on component_type

**4. Actions Footer**
- Delete button (left, red/destructive styling) - opens confirmation dialog
- Cancel + Save Changes buttons (right)

### Sibling Group Editing

When a BOM item has quantity > 1, the system "explodes" it into N component records with sequential `seq` values in the identity_key. All share the same drawing_id + commodity_code + size.

**All edit operations apply to the entire sibling group:**
- Reclassify updates component_type on all siblings
- Edit identity/attributes updates all siblings
- Delete retires all siblings

The modal shows the sibling count (e.g., "3 components") to make group editing visible.

**Exception:** Aggregate types (pipe/threaded_pipe) are always a single record. Spools and field welds have unique identities, so they are always 1:1.

### Reclassification Behavior

When component type changes:
1. All siblings get new component_type
2. Progress template is reassigned (looked up for new type + project)
3. Current milestones are reset to new template defaults (all zeros)

This is safe because reclassification is only allowed when percent_complete = 0 for all siblings, so no progress is lost.

### Add Component

**Entry points:**
- Drawing Table: "+ Add Component" button at the bottom of expanded drawing's component list (Admin/PM only)
- Viewer Sidebar: "+ Add" button in sidebar header next to filter/sort controls (Admin/PM only)

**Flow:**
1. Opens a modal with component type dropdown
2. On type selection, form fields adapt to show only required fields for that type
3. User fills required fields, submits

**Required fields by type (minimum for manhour distribution and rules of credit):**

| Type | Required Fields | Records Created |
|------|----------------|-----------------|
| Valve, Fitting, Flange, Support, Instrument, Tubing, Hose, Misc | Commodity Code, Size, Quantity | N records (qty explosion) |
| Pipe, Threaded Pipe | Commodity Code, Size, Total Linear Feet | 1 aggregate record |
| Spool | Spool ID | 1 record |
| Field Weld | Weld Number | 1 record |

**Auto-populated:**
- drawing_id: from context (which drawing the user clicked Add from)
- project_id: from context
- identity_key: built using same logic as AI pipeline
- current_milestones: defaults from template (all zeros)
- area_id, system_id, test_package_id: inherited from drawing
- progress_template_id: looked up for type + project

### Bulk Delete (Drawing Table Only)

- Checkboxes appear on component rows for Admin/PM users
- When 1+ items are checked, a selection bar appears: "N selected - [Delete Selected]"
- Clicking "Delete Selected" opens confirmation dialog
- Retires all selected components (and their sibling groups)
- Not available in Viewer Sidebar (too compact)

### Delete Confirmation

All delete operations (single and bulk) show a confirmation dialog:
- "Delete N component(s)? This removes them from progress tracking."
- Component names/types listed
- Requires explicit confirm action
- Reason field (optional): "AI misextraction", "duplicate", "not needed", free text

## Backend

### New RPCs

All RPCs use SECURITY DEFINER with explicit permission checks (owner/admin/project_manager). All update last_updated_by, last_updated_at, and bump `version` for optimistic locking (matching existing pattern in ComponentMetadataModal).

Dedup is enforced by the existing unique index: `(project_id, component_type, identity_key) WHERE NOT is_retired`. There is no `identity_lookup_key` column — collision detection relies on this index.

Manhour recalculation: The `percent_complete` trigger fires automatically on milestone/template changes. For reclassification, the manhour weight may change with the new type — existing `calculate_earned_milestone_value` and manhour view triggers handle this when the template changes.

#### 1. `reclassify_component(p_component_id UUID, p_new_type TEXT, p_user_id UUID)`

1. Guard: caller is owner, admin, or project_manager
2. Guard: percent_complete = 0 for target component
3. Find siblings: all components with matching drawing_id + commodity_code + size from identity_key (excluding different seq values)
4. Guard: percent_complete = 0 for ALL siblings
5. Dedup check: verify no existing non-retired component with the new type + same identity_key already exists (unique index: `project_id, component_type, identity_key WHERE NOT is_retired`)
6. Update all siblings: SET component_type = p_new_type
7. Look up new progress template for p_new_type + project
8. Update progress_template_id on all siblings
9. Reset current_milestones to new template defaults
10. Return: `{ components_updated, new_type, new_template_id }`

#### 2. `retire_components(p_component_ids UUID[], p_user_id UUID, p_reason TEXT DEFAULT NULL)`

1. Guard: caller is owner, admin, or project_manager
2. For each component: SET is_retired = true, last_updated_by, last_updated_at
3. Log reason in audit (if provided)
4. Return: `{ components_retired }`

#### 3. `update_component_identity(p_component_id UUID, p_identity_changes JSONB, p_attribute_changes JSONB, p_user_id UUID)`

1. Guard: caller is owner, admin, or project_manager
2. Find siblings: all components with matching drawing_id + old commodity_code + old size
3. Merge p_identity_changes into identity_key JSONB on all siblings
4. Merge p_attribute_changes into attributes JSONB on all siblings
5. Dedup check: verify updated identity_key doesn't collide with existing non-retired components (enforced by unique index: `project_id, component_type, identity_key WHERE NOT is_retired`)
6. Return: `{ components_updated }`

#### 4. `create_manual_component(p_drawing_id UUID, p_project_id UUID, p_component_type TEXT, p_identity JSONB, p_attributes JSONB, p_user_id UUID)`

1. Guard: caller is owner, admin, or project_manager
2. Build identity_key based on component_type rules (same logic as AI pipeline)
3. Dedup check: verify no existing component with same identity on this drawing
4. For exploded types: create N records (seq 1..N) from quantity in p_attributes
5. For aggregate types: create 1 record with linear_feet in attributes
6. For spool/field_weld: create 1 record with unique ID
7. Look up progress_template for type + project
8. Set current_milestones from template defaults (all zeros)
9. Inherit area_id, system_id, test_package_id from drawing
10. Return: `{ components_created, component_ids }`

### Query Invalidation

All four mutations invalidate:
- `['components']`
- `['drawing-progress']`
- `['drawings-with-progress']`
- `['package-readiness']`
- `['manhour-progress']`

### New Hooks

- `useReclassifyComponent()` - calls reclassify_component RPC
- `useRetireComponents()` - calls retire_components RPC
- `useUpdateComponentIdentity()` - calls update_component_identity RPC
- `useCreateManualComponent()` - calls create_manual_component RPC

All follow existing TanStack Query mutation patterns with optimistic UI where appropriate.

## UI Components

### New Components

- `ComponentEditTab` - the Edit tab content (classification, identity, attributes sections)
- `AddComponentModal` - type dropdown + type-adaptive form
- `DeleteConfirmationDialog` - confirmation with component list and optional reason
- `BulkDeleteBar` - selection count + delete button (Drawing Table only)

### Modified Components

- `ComponentDetailView` - add Edit tab (Admin/PM), keep Details tab (Field User)
- `ComponentMetadataModal` - pass role/permission context
- `ComponentRow` - add checkbox column (Admin/PM), expose selection state
- `DrawingComponentSidebar` - add "+ Add" button in header (Admin/PM)
- `DrawingTable` / `DrawingComponentTablePage` - manage bulk selection state, render BulkDeleteBar

## Testing Strategy

- Unit tests for each new hook (mock Supabase RPC calls)
- Unit tests for ComponentEditTab form validation
- Unit tests for type-adaptive form field rendering
- Unit tests for permission gating (Edit tab hidden for Field User)
- Unit tests for reclassify lock when progress > 0
- Integration tests for sibling group detection logic
- Integration tests for RPC permission checks (RLS)
- Integration tests for dedup collision detection

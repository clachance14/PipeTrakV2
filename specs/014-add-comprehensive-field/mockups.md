# UI Mockups: Field Weld QC Module

**Feature**: 014-add-comprehensive-field
**Created**: 2025-10-23
**Purpose**: Detailed visual specifications for all UI components

---

## Weld Log Page

### Full Page Layout

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ PIPETRAK V2                                    [🔔] [👤] John Smith (QC)     │
├─────────────────────────────────────────────────────────────────────────────┤
│ [☰] Drawing Table  |  Packages  |  Welders  |  🔍 Weld Log  |  Imports      │
└─────────────────────────────────────────────────────────────────────────────┘

Home > Weld Log

┌─────────────────────────────────────────────────────────────────────────────┐
│ Weld Log                                                                     │
│ QC tracking for all project field welds                                     │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ FILTERS                                                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│ [🔍 Search welds...]           [Drawing ▼]    [Welder ▼]                   │
│                                                                              │
│ [Status ▼ All]    [Package ▼ All]    [System ▼ All]    [Clear Filters]    │
│                                                                              │
│ Showing 47 of 2,347 welds                                                   │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ Weld ID    │ Drawing ↓ │ Welder          │ Date Welded │ Type │ Size │ NDE Status    │ Status   │ Progress │ Actions    │
├────────────┼───────────┼─────────────────┼─────────────┼──────┼──────┼───────────────┼──────────┼──────────┼────────────┤
│ 1          │ P-26B07   │ K-07            │ Jan 15, 2024│ SW   │ 1"   │ RT PASS       │ Accepted │ ▓▓▓ 100% │            │
│            │           │ John Smith      │             │      │      │ ✓ green       │ 🟢 green │          │            │
├────────────┼───────────┼─────────────────┼─────────────┼──────┼──────┼───────────────┼──────────┼──────────┼────────────┤
│ 2          │ P-93909   │ R-05            │ Jan 16, 2024│ BW   │ 3"   │ UT PASS       │ Accepted │ ▓▓▓ 100% │            │
│            │           │ Mike Rodriguez  │             │      │      │ ✓ green       │ 🟢 green │          │            │
├────────────┼───────────┼─────────────────┼─────────────┼──────┼──────┼───────────────┼──────────┼──────────┼────────────┤
│ 42         │ P-55401   │ K-07            │ Feb 10, 2024│ BW   │ 2"   │ RT FAIL       │ Rejected │ ▓▓▓ 100% │ 🔗 Repairs │
│            │           │ John Smith      │             │      │      │ ✗ red         │ 🔴 red   │          │            │
│            │           │                 │             │      │      │               │ (grayed) │          │            │
├────────────┼───────────┼─────────────────┼─────────────┼──────┼──────┼───────────────┼──────────┼──────────┼────────────┤
│ 42-R1      │ P-55401   │ Not Assigned    │ —           │ BW   │ 2"   │ —             │ Active   │ ▓░░  30% │ 👷 Assign  │
│            │           │                 │             │      │      │               │ 🔵 blue  │          │            │
├────────────┼───────────┼─────────────────┼─────────────┼──────┼──────┼───────────────┼──────────┼──────────┼────────────┤
│ 156        │ DRAIN-1   │ R-05            │ Mar 5, 2024 │ SW   │ 1"   │ UT PENDING    │ Active   │ ▓▓░  95% │ 🔬 NDE     │
│            │           │ Mike Rodriguez  │             │      │      │ ⏳ yellow     │ 🔵 blue  │          │            │
├────────────┼───────────┼─────────────────┼─────────────┼──────┼──────┼───────────────┼──────────┼──────────┼────────────┤
│ 157        │ DRAIN-1   │ Not Assigned    │ —           │ BW   │ 2"   │ —             │ Active   │ ░░░   0% │ (disabled) │
│            │           │                 │             │      │      │               │ 🔵 blue  │          │            │
└────────────┴───────────┴─────────────────┴─────────────┴──────┴──────┴───────────────┴──────────┴──────────┴────────────┘
```

### Component Specifications

#### WeldLogFilters Component

**Layout**: Two-row filter controls above table

**Row 1**:
- Search input (full-width on mobile, 40% on desktop)
  - Placeholder: "🔍 Search welds..."
  - Debounce: 300ms
  - Searches: Weld ID, Drawing Number, Welder Stencil/Name
- Drawing dropdown (20% width desktop)
  - Autocomplete with fuzzy search
  - Shows normalized drawing numbers
- Welder dropdown (20% width desktop)
  - Format: "{stencil} - {name}"
  - Sorted by stencil

**Row 2**:
- Status dropdown
  - Options: All / Active / Accepted / Rejected
  - Default: All
- Package dropdown
  - Options: All + list of project test packages
- System dropdown
  - Options: All + list of project systems
- Clear Filters button
  - Resets all dropdowns to "All"
  - Clears search input
  - Right-aligned

**Results Count**:
- Format: "Showing X of Y welds"
- Position: Below filter controls, above table
- Updates in real-time as filters change

#### WeldLogTable Component

**Table Structure**:
- 10 columns (see column specs below)
- Virtual scrolling (@tanstack/react-virtual)
- Fixed header row
- Alternating row background (white/slate-50)
- Hover state: `bg-slate-100`

**Column Specifications**:

1. **Weld ID** (80px fixed)
   - Format: Sequential number from identity_key
   - Repairs: Show "42-R1" format (original-R[sequence])
   - Font: Monospace for alignment
   - Not sortable (derived from identity)

2. **Drawing ↓** (120px)
   - Clickable link to DrawingComponentTablePage filtered to this drawing
   - Sortable (default sort direction: descending)
   - Shows sort arrow when active
   - Font: Monospace

3. **Welder** (180px)
   - Two-line display:
     - Line 1: Stencil (bold, `font-semibold`)
     - Line 2: Name (normal weight, `text-slate-600`)
   - Empty state: "Not Assigned" (italic, `text-slate-400`)
   - Sortable by stencil

4. **Date Welded** (120px)
   - Display format: American style "MMM DD, YYYY" (e.g., "Jan 15, 2024")
   - Input format: HTML5 date picker (YYYY-MM-DD) converted to display format on save
   - Empty state: em-dash "—"
   - Sortable (default sort, most recent first)

5. **Type** (60px)
   - Display: Abbreviation only (BW/SW/FW/TW)
   - Tooltip on hover: Full name
     - BW → "Butt Weld"
     - SW → "Socket Weld"
     - FW → "Fillet Weld"
     - TW → "Tack Weld"

6. **Size** (80px)
   - Display: Pipe size with units (1", 2", 3")
   - Empty state: em-dash "—"
   - Sortable numerically

7. **NDE Status** (140px)
   - Format: "{Type} {Result}" or em-dash
   - Color coding:
     - PASS: `text-green-600` with ✓ icon
     - FAIL: `text-red-600` with ✗ icon
     - PENDING: `text-yellow-600` with ⏳ icon
   - Empty state: em-dash "—"

8. **Status Badge** (100px)
   - Pill-shaped badge with icon
   - Active: `bg-blue-100 text-blue-800` 🔵
   - Accepted: `bg-green-100 text-green-800` 🟢
   - Rejected: `bg-red-100 text-red-800 opacity-50` 🔴 (grayed)
   - Sortable (order: Active, Accepted, Rejected)

9. **Progress** (120px)
   - Visual progress bar + percentage
   - Bar: 80px width, 8px height, rounded
   - Filled: `bg-blue-600`
   - Empty: `bg-slate-200`
   - Text: Right-aligned, `text-sm text-slate-600`
   - Format: "▓▓░ 95%"

10. **Actions** (140px)
    - Conditional button display:
      - **Assign Welder**: Foremen/PMs only, active welds without welder
        - Icon: 👷 or User icon
        - Text: "Assign"
        - Opens: WelderAssignDialog
      - **Record NDE**: QC inspectors only, welds with assigned welder
        - Icon: 🔬 or Clipboard icon
        - Text: "NDE"
        - Opens: NDEResultDialog
      - **View Repairs**: Welds with repair chain
        - Icon: 🔗 or Link icon
        - Text: "Repairs"
        - Opens: RepairHistoryDialog
    - Button styling: `text-sm px-3 py-1 rounded`
    - Disabled state: `opacity-50 cursor-not-allowed`

**Row States**:

- **Accepted Weld**:
  - Green NDE status (PASS)
  - Green status badge
  - 100% progress bar (full)
  - No action buttons visible

- **Rejected Weld**:
  - Red NDE status (FAIL)
  - Red grayed status badge (`opacity-50`)
  - 100% progress bar (full)
  - "View Repairs" link visible
  - Entire row slightly grayed (`text-slate-500`)

- **Active Weld (Awaiting NDE)**:
  - Yellow or green NDE status (PENDING or no result yet)
  - Blue status badge
  - 95% progress bar (Fit-up + Weld Complete)
  - "Record NDE" button visible (QC only)

- **Active Weld (Repair Not Started)**:
  - No NDE status (em-dash)
  - Blue status badge
  - 30% progress bar (Fit-up auto-completed)
  - "Assign Welder" button visible (Foremen/PMs)

- **Active Weld (Not Started)**:
  - No welder assigned
  - No NDE status
  - Blue status badge
  - 0% progress bar (empty)
  - Actions disabled

**Empty State**:
```
┌─────────────────────────────────────────────────────┐
│                                                      │
│                   📋 No Welds Found                  │
│                                                      │
│   No field welds match your current filters.        │
│   Try adjusting your search or clearing filters.    │
│                                                      │
│                 [Clear All Filters]                  │
│                                                      │
└─────────────────────────────────────────────────────┘
```

**Loading State**:
- 10 skeleton rows
- Shimmer animation on all cells
- Same height as data rows (64px)

### Responsive Layouts

#### Desktop (>1024px)
- All 10 columns visible
- Full table width
- No horizontal scroll
- Action buttons with full text labels

#### Tablet (768px - 1024px)
```
┌──────────────────────────────────────────────────────────────────────┐
│ < scroll horizontally >                                               │
├──────┬──────────┬─────────────┬──────┬────────┬──────────────────────┤
│ ID ⚓ │ Drawing ⚓│ Welder      │ Type │ Status │ Actions              │
│ (pinned left)  │             │      │        │                      │
│──────┼──────────┼─────────────┼──────┼────────┼──────────────────────│
│ 1    │ P-26B07  │ K-07        │ SW   │ Accept │ (empty)              │
│      │          │ John Smith  │      │ 🟢     │                      │
└──────┴──────────┴─────────────┴──────┴────────┴──────────────────────┘
```
- Weld ID + Drawing columns pinned left (sticky)
- Other columns scroll horizontally
- Condensed welder display (single line: "K-07 - John Smith")
- Icon-only action buttons

#### Mobile (<768px)
```
┌─────────────────────────────────────┐
│ 🔍 Search...                        │
├─────────────────────────────────────┤
│ [Filters ▼]                         │
├─────────────────────────────────────┤
│ Showing 47 of 2,347 welds           │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ Weld #1 • SW 1" • P-26B07           │
│ ─────────────────────────────────── │
│ Welder: K-07 - John Smith           │
│ Date: Jan 15, 2024                  │
│ NDE: RT PASS ✓                      │
│ Status: Accepted 🟢                 │
│ Progress: ▓▓▓ 100%                  │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ Weld #42 • BW 2" • P-55401          │
│ ─────────────────────────────────── │
│ Welder: K-07 - John Smith           │
│ Date: Feb 10, 2024                  │
│ NDE: RT FAIL ✗                      │
│ Status: Rejected 🔴                 │
│ Progress: ▓▓▓ 100%                  │
│ [🔗 View Repair History]            │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ Weld #42-R1 • BW 2" • P-55401       │
│ ─────────────────────────────────── │
│ Welder: Not Assigned                │
│ Date: —                             │
│ NDE: —                              │
│ Status: Active 🔵                   │
│ Progress: ▓░░ 30%                   │
│ [👷 Assign Welder]                  │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ Weld #156 • SW 1" • DRAIN-1         │
│ ─────────────────────────────────── │
│ Welder: R-05 - Mike Rodriguez       │
│ Date: Mar 5, 2024                   │
│ NDE: UT PENDING ⏳                  │
│ Status: Active 🔵                   │
│ Progress: ▓▓░ 95%                   │
│ [🔬 Record NDE]                     │
└─────────────────────────────────────┘
```

**Card Layout Specs**:
- Full-width cards with `border`, `rounded-lg`, `shadow-sm`
- Header: Weld ID • Type Size • Drawing (single line)
- Divider: Horizontal rule
- Body: Key-value pairs, left-aligned labels
- Footer: Full-width action button (if applicable)
- Spacing: 16px between cards
- Card padding: 16px

### Comparison with Drawing Table

| Feature | Drawing Table (Feature 010) | Weld Log (This Feature) |
|---------|----------------------------|-------------------------|
| **Structure** | Nested accordion (drawing → components) | Flat table (all welds) |
| **Focus** | Drawing-level progress rollup | Individual weld QC tracking |
| **Default Sort** | Drawing number (asc) | Date welded (desc) |
| **Filters** | Component type, Status, Search | Drawing, Welder, Status, Package, System, Search |
| **Actions** | Inline milestone checkboxes | Dialog-based workflows (Assign, NDE, Repairs) |
| **Audience** | All team members (general progress) | QC inspectors (detailed tracking) |
| **Expansion** | Click row to expand components | No expansion (flat) |
| **Milestones** | Visible on expanded row | Hidden (only in dialogs) |
| **Virtual Scroll** | Drawings + Components (10k items) | Welds only (2k-5k items) |
| **Responsive** | Feature 010 patterns | Same patterns, adapted for 10 columns |

### Integration with Existing Features

**Navigation**:
- Add "Weld Log" nav item after "Welders" in Layout.tsx
- Icon: `clipboard-check` from lucide-react
- Route: `/weld-log`
- Visible to: All team members (no permission gate)
- Active state styling: Same as other nav items

**Shared Components**:
- Reuses existing dialogs: WelderAssignDialog, NDEResultDialog, RepairHistoryDialog
- Reuses existing hooks: useFieldWelds, useAssignWelder, useRecordNDE
- Reuses status badges: Same color tokens as FieldWeldRow

**Data Source**:
- Hook: `useFieldWelds({ projectId })`
- Returns: All field_welds joined with components, welders, drawings
- Cache key: `['field-welds', { projectId }]`
- Stale time: 2 minutes

### Accessibility

**WCAG 2.1 AA Compliance**:
- Sortable column headers have `aria-sort` attribute
- Action buttons have `aria-label` (e.g., "Assign welder to weld 42")
- Status badges have `aria-label` (e.g., "Status: Accepted")
- Empty state has `role="status"` for screen reader announcement
- Table has `<caption>` element for context

**Keyboard Navigation**:
- Tab: Navigate through filters → table rows → action buttons
- Enter/Space: Activate buttons, toggle filters
- Arrow keys: Navigate filter dropdowns
- Home/End: Jump to first/last table row (when focused)

**Screen Reader Support**:
- Table header announced: "Weld Log table with 10 columns, showing 47 of 2,347 welds"
- Row announced: "Weld 1, Drawing P-26B07, Welder K-07 John Smith, Date welded 2024-01-15, Type Socket Weld, Size 1 inch, NDE Status RT PASS, Status Accepted, Progress 100 percent"
- Filter changes announced: "Filtered to 47 welds"

---

## Other Component Mockups

### WelderAssignDialog
*TODO: Add detailed mockup*

### NDEResultDialog
*TODO: Add detailed mockup*

### CreateRepairWeldDialog
*TODO: Add detailed mockup*

### RepairHistoryDialog
*TODO: Add detailed mockup*

### WelderList (WeldersPage)
*TODO: Add detailed mockup*

### FieldWeldRow (Drawing Table Integration)
*TODO: Add detailed mockup*

---

## Design Tokens Reference

### Status Badge Colors
```css
/* Active */
.badge-active {
  @apply bg-blue-100 text-blue-800;
}

/* Accepted */
.badge-accepted {
  @apply bg-green-100 text-green-800;
}

/* Rejected */
.badge-rejected {
  @apply bg-red-100 text-red-800 opacity-50;
}

/* Welder Status: Verified */
.badge-verified {
  @apply bg-green-100 text-green-800;
}

/* Welder Status: Unverified */
.badge-unverified {
  @apply bg-yellow-100 text-yellow-800;
}
```

### NDE Result Colors
```css
/* PASS */
.nde-pass {
  @apply text-green-600;
}

/* FAIL */
.nde-fail {
  @apply text-red-600;
}

/* PENDING */
.nde-pending {
  @apply text-yellow-600;
}
```

### Button Styles
```css
/* Primary Action */
.btn-primary {
  @apply bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded;
}

/* Secondary Action */
.btn-secondary {
  @apply bg-slate-200 hover:bg-slate-300 text-slate-900 px-4 py-2 rounded;
}

/* Small Action (table buttons) */
.btn-sm {
  @apply text-sm px-3 py-1 rounded;
}
```

### Typography
```css
/* Table header */
.table-header {
  @apply text-sm font-semibold text-slate-700 uppercase tracking-wide;
}

/* Table cell */
.table-cell {
  @apply text-sm text-slate-900;
}

/* Secondary text (welder name line 2) */
.text-secondary {
  @apply text-slate-600;
}

/* Muted text (empty states) */
.text-muted {
  @apply text-slate-400 italic;
}
```

### Date Formatting

**Display Format**: American style "MMM DD, YYYY"

**Utility Function** (TypeScript):
```typescript
/**
 * Format date to American style: "MMM DD, YYYY"
 * @param date - Date string (ISO format) or Date object
 * @returns Formatted string like "Jan 15, 2024"
 */
export function formatDateAmerican(date: string | Date | null): string {
  if (!date) return '—';  // Empty state

  const dateObj = typeof date === 'string' ? new Date(date) : date;

  return dateObj.toLocaleDateString('en-US', {
    month: 'short',  // Jan, Feb, Mar, etc.
    day: 'numeric',  // 1, 2, 3, etc.
    year: 'numeric'  // 2024
  });
}

// Example usage:
// formatDateAmerican('2024-01-15') → "Jan 15, 2024"
// formatDateAmerican(new Date(2024, 2, 5)) → "Mar 5, 2024"
// formatDateAmerican(null) → "—"
```

---

## Accessibility Requirements (WCAG 2.1 AA)

**Purpose**: Ensures all UI components are accessible to users with disabilities, compliant with WCAG 2.1 Level AA standards.

### ARIA Labels for Icon-Only Buttons (CHK031)

All icon-only buttons and action triggers require descriptive `aria-label` attributes:

**WeldLogTable Action Buttons**:
```tsx
// Assign Welder button
<Button aria-label={`Assign welder to weld ${weldId}`}>
  <UserIcon className="h-4 w-4" />
</Button>

// Record NDE button
<Button aria-label={`Record NDE result for weld ${weldId}`}>
  <ClipboardIcon className="h-4 w-4" />
</Button>

// View Repairs button
<Button aria-label={`View repair history for weld ${weldId}`}>
  <LinkIcon className="h-4 w-4" />
</Button>
```

**FieldWeldRow Action Buttons**:
```tsx
// Assign Welder icon (pencil)
<button aria-label="Assign welder to this weld">
  <PencilIcon />
</button>

// Record NDE icon (microscope)
<button aria-label="Record NDE inspection result">
  <MicroscopeIcon />
</button>
```

**Filter Controls**:
```tsx
// Clear filters button
<Button aria-label="Clear all filters and reset search">
  Clear Filters
</Button>

// Collapse All button (DrawingTable)
<Button aria-label="Collapse all expanded drawings">
  Collapse All
</Button>
```

**Status Badges**:
```tsx
// Active badge
<Badge aria-label="Weld status: Active">Active</Badge>

// Accepted badge
<Badge aria-label="Weld status: Accepted">Accepted</Badge>

// Rejected badge
<Badge aria-label="Weld status: Rejected">Rejected</Badge>

// Inherited badge (Feature 011 pattern)
<Badge aria-label="Value inherited from drawing P-001">inherited</Badge>
```

### Screen Reader Announcements (CHK033)

Define live region announcements for dynamic state changes using `aria-live="polite"`:

**Status Change Announcements**:
```tsx
// After recording NDE PASS
<div role="status" aria-live="polite" className="sr-only">
  Weld {weldId} marked as accepted. Progress updated to 100%.
</div>

// After recording NDE FAIL
<div role="status" aria-live="polite" className="sr-only">
  Weld {weldId} marked as rejected. Repair weld dialog opened.
</div>

// After creating repair weld
<div role="status" aria-live="polite" className="sr-only">
  Repair weld created for weld {originalWeldId}. Repair started at 30% progress.
</div>

// After assigning welder
<div role="status" aria-live="polite" className="sr-only">
  Welder {welderStencil} assigned to weld {weldId}. Progress updated to 95%.
</div>
```

**Filter/Search Announcements**:
```tsx
// After applying filters
<div role="status" aria-live="polite" className="sr-only">
  {filteredCount} welds found matching current filters.
</div>

// After search
<div role="status" aria-live="polite" className="sr-only">
  Showing {resultCount} welds matching "{searchTerm}".
</div>
```

**Toast Notification Alternative**:
All toast notifications should have corresponding `aria-live` announcements for screen readers:
```tsx
<Toast>
  <span>5 components inherited metadata</span>
  <span role="status" aria-live="polite" className="sr-only">
    Success: 5 components inherited metadata from drawing.
  </span>
</Toast>
```

### Dialog ARIA Roles & States (CHK037)

All dialogs must implement proper ARIA dialog pattern:

**Required Attributes**:
```tsx
<Dialog>
  <DialogOverlay />
  <DialogContent
    role="dialog"
    aria-modal="true"
    aria-labelledby="dialog-title"
    aria-describedby="dialog-description"
  >
    <DialogTitle id="dialog-title">
      Assign Welder
    </DialogTitle>
    <DialogDescription id="dialog-description">
      Select a welder and date to mark this weld as complete.
    </DialogDescription>

    {/* Form content */}

  </DialogContent>
</Dialog>
```

**Dialog-Specific Requirements**:

**WelderAssignDialog**:
```tsx
aria-labelledby="assign-welder-title"
aria-describedby="assign-welder-description"
// Title: "Assign Welder"
// Description: "Select a welder and date to mark 'Weld Complete' milestone. Progress will update to 95%."
```

**NDEResultDialog**:
```tsx
aria-labelledby="nde-result-title"
aria-describedby="nde-result-description"
// Title: "Record NDE Result"
// Description: "Record non-destructive examination result for weld {weldId}. Warning: FAIL result will mark weld as rejected."
```

**CreateRepairWeldDialog**:
```tsx
aria-labelledby="create-repair-title"
aria-describedby="create-repair-description"
// Title: "Create Repair Weld"
// Description: "Create a new repair weld for failed weld {originalWeldId}. Repair will auto-start at 30% (Fit-up complete)."
```

**RepairHistoryDialog**:
```tsx
aria-labelledby="repair-history-title"
aria-describedby="repair-history-description"
// Title: "Repair History"
// Description: "Full repair chain for weld {weldId}, showing {chainLength} attempts."
```

**Focus Management**:
- Dialog opens: Focus moves to first interactive element (or close button if no form fields)
- Dialog closes: Focus returns to trigger element
- Escape key: Closes dialog
- Tab key: Cycles through dialog elements only (focus trap)

---

## Form Validation Requirements

**Purpose**: Defines validation rules, timing, and error messaging for all form inputs across dialogs.

### Required Field Validation (CHK010)

**All Dialogs - Required Fields**:

**WelderAssignDialog** (2 required fields):
- `welder_id` (Dropdown):
  - Error: "Please select a welder"
  - Validation: Must be non-null UUID
- `date_welded` (Date picker):
  - Error: "Please select a weld date"
  - Validation: Must be valid date, not in future (see CHK011)

**NDEResultDialog** (3 required fields):
- `nde_type` (Dropdown: RT/UT/PT/MT):
  - Error: "Please select an NDE type"
  - Validation: Must be one of enum values
- `nde_result` (Radio: PASS/FAIL/PENDING):
  - Error: "Please select an NDE result"
  - Validation: Must be one of enum values
- `nde_date` (Date picker):
  - Error: "Please select an NDE date"
  - Validation: Must be valid date, not in future

**CreateRepairWeldDialog** (1 required field):
- `weld_type` (Dropdown: BW/SW/FW/TW):
  - Error: "Please select a weld type"
  - Validation: Must be one of enum values
- Other fields (size, schedule, base metal, spec): Optional, pre-filled from original weld

**WelderForm** (2 required fields):
- `stencil` (Text input):
  - Error: "Please enter a welder stencil"
  - Pattern error: "Stencil must be 2-12 uppercase letters, numbers, or hyphens (A-Z, 0-9, -)"
  - Duplicate error: "Stencil '{stencil}' already exists in this project"
  - Validation: Regex `/^[A-Z0-9-]{2,12}$/`
- `name` (Text input):
  - Error: "Please enter welder's name"
  - Validation: Non-empty string, max 100 characters

### Date Validation Rules (CHK011)

**Input Format**: HTML5 `<input type="date">` (YYYY-MM-DD internally)

**Display Format**: American "MMM DD, YYYY" (see §Date Formatting)

**Validation Rules**:
1. **Required vs Optional**:
   - WelderAssignDialog: `date_welded` REQUIRED
   - NDEResultDialog: `nde_date` REQUIRED
   - CreateRepairWeldDialog: All dates optional (pre-filled editable)

2. **No Future Dates**:
   ```typescript
   const today = new Date();
   today.setHours(0, 0, 0, 0); // Normalize to midnight

   if (selectedDate > today) {
     return "Date cannot be in the future";
   }
   ```
   - Error message: "Date cannot be in the future. Please select today or an earlier date."

3. **Reasonable Past Limit** (Optional, nice-to-have):
   ```typescript
   const oneYearAgo = new Date();
   oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

   if (selectedDate < oneYearAgo) {
     // Show warning (not error)
     return "Warning: Date is more than 1 year ago. Please verify this is correct.";
   }
   ```

4. **Default Values**:
   - WelderAssignDialog: Defaults to today (`new Date()`)
   - NDEResultDialog: Defaults to today
   - CreateRepairWeldDialog: No default (inherit from original or leave blank)

### Validation Error Display Format (CHK014)

**Visual Styling**:
```tsx
// Input with validation error
<div className="space-y-1">
  <Label htmlFor="welder-select">
    Welder <span className="text-red-600">*</span>
  </Label>
  <Select
    id="welder-select"
    className={cn(
      "border-input",
      error && "border-red-500 focus:ring-red-500"  // Red border on error
    )}
    aria-invalid={error ? "true" : "false"}
    aria-describedby={error ? "welder-select-error" : undefined}
  />
  {error && (
    <div
      id="welder-select-error"
      className="flex items-center gap-1 text-sm text-red-600"
      role="alert"
    >
      <AlertCircleIcon className="h-4 w-4" />
      <span>{error}</span>
    </div>
  )}
</div>
```

**Styling Tokens**:
- **Error border**: `border-red-500` (Tailwind class)
- **Error text**: `text-red-600` (color), `text-sm` (size)
- **Error icon**: `AlertCircleIcon` from lucide-react, `h-4 w-4` (16px)
- **Error position**: Below input field, left-aligned
- **Error spacing**: `mt-1` (4px gap between input and error)

**Validation Timing**:
- **On blur**: Validate when user leaves field (show error immediately)
- **On submit**: Validate all fields, focus first error
- **Real-time** (optional): Show success checkmark after valid input in blur

**Success State** (optional, nice-to-have):
```tsx
{!error && value && (
  <CheckCircleIcon className="h-4 w-4 text-green-600" />
)}
```

---

## Error States & Toast Notifications

**Purpose**: Defines error handling UI patterns and toast notification specifications.

### Toast Notification Specifications (CHK054)

**Library**: Sonner (already installed per CLAUDE.md)

**Toast Types**:

**Success Toast**:
```tsx
toast.success("Welder assigned successfully", {
  description: "Weld progress updated to 95%",
  duration: 3000,  // 3 seconds
});
```
- **Color**: Green background (`bg-green-50`), green border (`border-green-200`)
- **Icon**: CheckCircleIcon (green)
- **Duration**: 3 seconds (dismissable)

**Error Toast**:
```tsx
toast.error("Failed to assign welder", {
  description: error.message || "An unexpected error occurred",
  duration: 5000,  // 5 seconds (longer for errors)
});
```
- **Color**: Red background (`bg-red-50`), red border (`border-red-200`)
- **Icon**: AlertCircleIcon (red)
- **Duration**: 5 seconds (dismissable)

**Info Toast**:
```tsx
toast.info("5 components inherited metadata", {
  description: "2 kept existing values",
  duration: 4000,
});
```
- **Color**: Blue background (`bg-blue-50`), blue border (`border-blue-200`)
- **Icon**: InfoIcon (blue)
- **Duration**: 4 seconds

**Warning Toast**:
```tsx
toast.warning("This is the 9th repair attempt", {
  description: "Consider engineering review before proceeding",
  duration: 6000,  // 6 seconds (longer for warnings)
});
```
- **Color**: Yellow background (`bg-yellow-50`), yellow border (`border-yellow-200`)
- **Icon**: AlertTriangleIcon (yellow)
- **Duration**: 6 seconds

**Toast Message Examples**:

| Action | Success Message | Error Message |
|--------|----------------|---------------|
| Assign Welder | "Welder assigned successfully" + "Weld progress updated to 95%" | "Failed to assign welder" + actual error |
| Record NDE PASS | "NDE result recorded" + "Weld marked as accepted" | "Failed to record NDE result" + error |
| Record NDE FAIL | "NDE result recorded" + "Weld marked as rejected" | "Failed to record NDE result" + error |
| Create Repair | "Repair weld created" + "Started at 30% progress" | "Failed to create repair weld" + error |
| Create Welder | "Welder {stencil} created" | "Failed to create welder" + error (e.g., "Duplicate stencil") |
| Import CSV | "{count} welds imported successfully" | "{errorCount} rows failed" + "Download error report" link |

**Accessibility**: All toasts have `aria-live="polite"` for screen reader announcements (see §Screen Reader Announcements).

### Validation Error Styling (CHK057)

**Inline Field Errors** (See §Validation Error Display Format for full spec):
- **Border**: `border-red-500` (2px solid red)
- **Focus ring**: `focus:ring-red-500` (red focus outline)
- **Icon**: `AlertCircleIcon` (h-4 w-4, red)
- **Text color**: `text-red-600`
- **Text size**: `text-sm` (14px)

**Form-Level Error Summary** (Optional, for multi-field validation):
```tsx
{formErrors.length > 0 && (
  <Alert variant="destructive" className="mb-4">
    <AlertCircleIcon className="h-4 w-4" />
    <AlertTitle>Please fix the following errors:</AlertTitle>
    <AlertDescription>
      <ul className="list-disc list-inside space-y-1">
        {formErrors.map((error, i) => (
          <li key={i}>{error}</li>
        ))}
      </ul>
    </AlertDescription>
  </Alert>
)}
```

**CSV Import Error Report**:
- Format: Downloadable CSV with columns: Row Number, Field, Error Message
- Example:
  ```csv
  Row,Field,Error
  5,weld_type,"Invalid weld type: 'XW'. Must be BW, SW, FW, or TW"
  12,drawing,"Drawing 'P-999' not found in project"
  45,stencil,"Duplicate welder stencil: 'K-07' already exists"
  ```
- Download trigger: Error toast with "Download Error Report" link

**Disabled State Styling** (addresses CHK045 partially):
```tsx
<Button disabled className="opacity-50 cursor-not-allowed">
  Assign Welder
</Button>

// With tooltip explaining why disabled
<Tooltip content="Complete Fit-up milestone before assigning welder">
  <Button disabled>Assign Welder</Button>
</Tooltip>
```

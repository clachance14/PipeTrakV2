# AI Drawing Import — Phase 1 Design Spec

**Date**: 2026-03-16
**Status**: Draft
**Feature**: AI-powered ISO drawing import with PDF viewer and component sidebar

## Overview

Replace Excel-based material takeoff import with AI-powered ISO drawing upload. Users upload PDF drawings, Google Gemini extracts title block metadata and BOM items, and PipeTrak creates tracked field components automatically. A PDF viewer with an editable component sidebar provides a complementary workflow surface alongside the existing Drawing Table.

### Scope

**Phase 1 (this spec)**:
- Drawing PDF upload on Imports page
- AI extraction pipeline (Gemini Vision: title block + BOM)
- Component creation using existing import logic
- PDF viewer accessible from Drawing Table
- Editable component sidebar with milestones
- Real-time processing progress via Supabase Realtime

**Phase 2 (future)**:
- Interactive weld map overlay on PDF
- Visual weld placement by QC users
- Weld symbol status updates based on field input

### Constraints

- New projects only — existing projects (created before this feature) continue using Excel import
- ISO drawings only — no P&IDs, no general arrangement drawings
- Field material only — shop BOM items stored for sidebar reference but not tracked as components
- Desktop only — PDF viewer hidden on mobile (<=1024px), consistent with existing PDF patterns
- Supabase Edge Functions — all AI processing runs server-side in Deno runtime
- No weld detection — field welds are manually placed by QC users in Phase 2

## Architecture

### Data Flow

```
User uploads PDF(s) on Imports page
  → Files stored in Supabase Storage (drawing-pdfs bucket)
  → Drawing records created with processing_status='queued'
  → Edge Function triggered per PDF page:
      1. Fetch PDF from Storage
      2. Gemini Vision: Title Block extraction → update drawing metadata
      3. Gemini Vision: BOM extraction → structured item list
      4. Store ALL BOM items in drawing_bom_items table
      5. Filter to field-section items only
      6. Map to PipeTrak component types
      7. Create components via existing import logic (qty splitting, identity keys)
      8. Update processing_status='complete'
  → Realtime pushes status updates to client
  → User navigates to Drawing Table to see results
  → Click PDF icon on drawing row → opens Drawing Viewer with sidebar
```

### Component Architecture

**New Edge Function**: `process-drawing`
- Orchestrates per-page extraction pipeline
- Calls Gemini API (title block + BOM, two separate calls)
- Maps BOM items to PipeTrak component types
- Reuses existing component creation logic from `import-takeoff`

**New Client Components**:
- `DrawingUploadTab` — PDF upload zone on Imports page
- `DrawingProcessingProgress` — Real-time progress tracker
- `DrawingViewer` — Full-page PDF viewer layout
- `PdfCanvas` — pdf.js-based PDF renderer (zoom, pan, page navigation)
- `DrawingComponentSidebar` — Component list with editable milestones
- `BomReferenceSection` — Read-only shop/reference items in sidebar

**Modified Components**:
- `DrawingRow` — Add PDF icon link when `file_path` is present
- `ImportPage` — Add "Drawing Upload" tab alongside existing CSV import

## Database Schema Changes

### Extended `drawings` table

```sql
-- Title block metadata (from Gemini extraction)
ALTER TABLE drawings ADD COLUMN sheet_number TEXT DEFAULT '1';
ALTER TABLE drawings ADD COLUMN file_path TEXT;           -- Storage path
ALTER TABLE drawings ADD COLUMN line_number TEXT;         -- e.g., "2-P-1001"
ALTER TABLE drawings ADD COLUMN material TEXT;            -- CS, SS-304, etc.
ALTER TABLE drawings ADD COLUMN schedule TEXT;            -- "40", "80", "STD"
ALTER TABLE drawings ADD COLUMN spec TEXT;                -- Piping spec code
ALTER TABLE drawings ADD COLUMN nde_class TEXT;           -- NDE classification
ALTER TABLE drawings ADD COLUMN pwht BOOLEAN DEFAULT false;
ALTER TABLE drawings ADD COLUMN hydro TEXT;               -- Hydrotest requirement
ALTER TABLE drawings ADD COLUMN insulation TEXT;          -- Insulation type

-- Processing state
ALTER TABLE drawings ADD COLUMN processing_status TEXT
  CHECK (processing_status IN ('queued', 'processing', 'complete', 'error'));
ALTER TABLE drawings ADD COLUMN processing_note TEXT;
```

The unique constraint changes from `(project_id, drawing_no_norm)` to `(project_id, drawing_no_norm, sheet_number)` to support multi-sheet drawings.

### New `drawing_bom_items` table

Stores the complete BOM extraction from Gemini (all items: shop, field, bolts, gaskets). Serves as the data source for the sidebar reference section.

```sql
CREATE TABLE drawing_bom_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  drawing_id UUID NOT NULL REFERENCES drawings(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Extraction data
  item_type TEXT NOT NULL,              -- 'material' | 'support'
  classification TEXT NOT NULL,         -- 'pipe', 'flange', 'elbow 90 LR', etc.
  section TEXT NOT NULL,                -- 'shop' | 'field'
  description TEXT,
  size TEXT,
  size_2 TEXT,                          -- Secondary (reducing items)
  quantity INTEGER NOT NULL DEFAULT 1,
  uom TEXT,                             -- 'LF', 'EA', 'SET'
  spec TEXT,
  material_grade TEXT,
  schedule TEXT,
  schedule_2 TEXT,
  rating TEXT,                          -- Pressure class
  commodity_code TEXT,
  end_connection TEXT,                  -- 'BW', 'SW', 'THD', 'RFWN'
  item_number INTEGER,                  -- Row index in BOM

  -- Review
  needs_review BOOLEAN DEFAULT false,
  review_reason TEXT,
  is_tracked BOOLEAN DEFAULT false,     -- True if also created as a component

  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS: same project-based policies as components
ALTER TABLE drawing_bom_items ENABLE ROW LEVEL SECURITY;
```

### New `ai_usage_log` table

```sql
CREATE TABLE ai_usage_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  drawing_id UUID REFERENCES drawings(id) ON DELETE SET NULL,
  operation TEXT NOT NULL,              -- 'title_block' | 'bom_extraction'
  model TEXT NOT NULL,                  -- 'gemini-3-flash-preview'
  input_tokens INTEGER,
  output_tokens INTEGER,
  total_cost DECIMAL(10, 6),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE ai_usage_log ENABLE ROW LEVEL SECURITY;
```

### New Storage Bucket

`drawing-pdfs` bucket with RLS enabled.
Path structure: `{org_id}/{project_id}/{filename}.pdf`

### Prerequisite Migration: Threaded Pipe Template

Update threaded_pipe progress template to drop the Install milestone (7 milestones instead of 8):

| Order | Milestone | Type | Weight |
|---|---|---|---|
| 1 | Fabricate | Partial % | ~16% |
| 2 | Erect | Partial % | ~20% |
| 3 | Connect | Partial % | ~20% |
| 4 | Support | Partial % | ~24% |
| 5 | Punch | Discrete | 5% |
| 6 | Test | Discrete | 10% |
| 7 | Restore | Discrete | 5% |

Weights to be finalized. Insert as new version (v2) of threaded_pipe template.

## AI Extraction Pipeline

### Edge Function: `process-drawing`

**Input**: `{ projectId: string, drawingId: string, filePath: string }`

**Step 1: Fetch PDF**
- Download from `drawing-pdfs` bucket via Supabase Storage
- Convert to base64 for Gemini Vision API

**Step 2: Title Block Extraction (Gemini Call #1)**
- Prompt adapted from TakeOffTrak's `title-block-reader.ts`
- Extracts: `drawing_number`, `sheet_number`, `line_number`, `material`, `schedule`, `spec`, `nde_class`, `pwht`, `revision`, `hydro`, `insulation`
- Strict JSON schema validation
- Updates the `drawings` record with extracted metadata
- Retry: 3 attempts with exponential backoff (2s, 4s, 8s + jitter)

**Step 3: BOM Extraction (Gemini Call #2)**
- Prompt adapted from TakeOffTrak's `bom-extraction.ts`
- Extracts each BOM line item with: `classification`, `section` (shop/field), `size`, `quantity`, `uom`, `spec`, `material_grade`, `schedule`, `commodity_code`, `end_connection`, `description`, `rating`, `item_number`
- Strict JSON schema validation
- Retry: same as above

**Step 4: Store Complete BOM**
- Insert ALL extracted items into `drawing_bom_items` table
- Both shop and field items stored (sidebar needs them all)

**Step 5: Filter & Map Field Items to Components**
- Filter to `section = 'field'` items only
- Exclude bolts and gaskets (sidebar-only items, `is_tracked = false`)
- Apply component type mapping (see table below)
- Apply quantity splitting logic (same as existing import-takeoff):
  - Valve, Flange, Support, Fitting, Tubing, Hose, Misc → qty explode (seq 1, 2, 3...)
  - Instrument → no explosion (seq always 1)
  - Pipe, Threaded Pipe → aggregate (sum linear feet)
- Assign progress templates by component type
- Batch insert into `components` table
- Mark corresponding `drawing_bom_items` as `is_tracked = true`

**Step 6: Update Status**
- Set `processing_status = 'complete'` (or `'error'` with note)
- Log AI usage to `ai_usage_log`
- Triggers Realtime push to client

**Error Handling**:
- If title block fails → still attempt BOM extraction (partial success OK)
- If BOM fails → drawing created with metadata but no components, status = 'error'
- AI usage logged regardless of outcome

### Component Type Mapping

| BOM Classification | Section | PipeTrak Action | Component Type |
|---|---|---|---|
| pipe (linear feet) | field | Aggregate component | `pipe` |
| threaded pipe | field | Aggregate component | `threaded_pipe` |
| gate/globe/ball/check/butterfly valve | field | Qty explode | `valve` |
| flange (RFWN, SWRF, blind, etc.) | field | Qty explode | `flange` |
| pipe shoe, guide, anchor, spring hanger | field | Qty explode | `support` |
| instrument, gauge, transmitter | field | No explosion | `instrument` |
| tubing | field | Qty explode | `tubing` |
| hose | field | Qty explode | `hose` |
| elbow, tee, reducer, coupling (if field) | field | Qty explode | `fitting` |
| misc / unrecognized | field | Qty explode, flag `needs_review` | `misc_component` |
| bolts, stud bolts | field | Sidebar only | — |
| gaskets | field | Sidebar only | — |
| any item | shop | Sidebar only | — |

### Gemini Configuration

- **Model**: `gemini-3-flash-preview`
- **Input**: Base64-encoded PDF page
- **Output**: Strict JSON schema (SchemaType.OBJECT)
- **Retry**: 3 attempts, exponential backoff (2s, 4s, 8s + jitter)
- **Cost**: ~$0.005-0.015 per drawing page (two API calls)
- **Latency**: ~5-10 seconds per drawing page
- **API key**: Stored as Edge Function secret (`GEMINI_API_KEY`)

## Upload Flow (Imports Page)

### UI Changes

Add a "Drawing Upload" tab alongside the existing "Spreadsheet Import" tab on the Imports page.

**Drawing Upload tab contains**:
1. Drag-and-drop zone for PDF files (max 50MB each)
2. Info banner explaining: "Each PDF page is processed as a separate drawing sheet"

### Processing Flow

1. User drops PDF file(s) → client validates (PDF type, size limit)
2. Client splits multi-page PDFs into individual pages (using pdf.js)
3. For each page:
   - Upload to Supabase Storage (`drawing-pdfs/{org_id}/{project_id}/{filename}_p{N}.pdf`)
   - Create `drawings` record with `processing_status = 'queued'`
4. Client calls `process-drawing` Edge Function for each queued drawing
5. Client subscribes to Realtime changes on `drawings.processing_status`
6. Progress UI shows per-drawing status:
   - Queued → Processing (Extracting title block... / Extracting BOM...) → Complete (N components)
   - Error state with processing_note displayed
7. Running totals: components created, drawings processed, remaining
8. On complete: "View in Drawing Table" button + "Upload More" button
9. Warning callouts for drawings that need review

### Concurrency

- Upload concurrency: 3 files at a time (prevent rate limits)
- Processing concurrency: 2 Edge Function calls at a time (Gemini rate limits: 300 RPM)
- Supabase Realtime handles progress updates without polling

## Drawing Viewer

### Navigation

- Drawing Table row shows a **PDF icon** (📄) on drawings that have `file_path` set
- Drawings without PDFs (Excel-imported) show no icon
- Clicking the icon navigates to `/projects/:projectId/drawings/:drawingId/viewer`
- Back button returns to Drawing Table

### Layout

Full-page layout with three sections:

**Toolbar** (top bar):
- Back to Drawing Table link
- Drawing metadata: number, sheet, size, material, spec, revision
- Zoom controls (-, %, +)
- Page navigation for multi-sheet drawings (< 1/N >)

**PDF Canvas** (left, flex-grow):
- pdf.js-based renderer
- Zoom: 10%-1000% with mouse wheel
- Pan: Click + drag
- Scroll navigation
- Foundation for Phase 2 weld overlay

**Component Sidebar** (right, 320px fixed):
- Two collapsible sections:

**Section 1: Field Components** (from `components` table):
- Each component shows: type name, identity display, commodity code
- Milestone controls in 3-column grid (reuses mobile pattern from `ComponentRow`)
- Discrete milestones: `MilestoneCheckbox` with abbreviated labels (Recv, Inst, ER, CONN, SUP, Punch, Test, Rest)
- Partial milestones: `PartialMilestoneInput` compact variant with % input and LF helper
- Milestones rendered dynamically from `progress_template.milestones_config` — never hardcoded
- Checked milestones get blue highlight background
- Rollback confirmation modal on unchecking
- Component count badges for qty-exploded items (e.g., "1 of 4")

**Section 2: Shop / Reference** (from `drawing_bom_items` where `is_tracked = false`):
- Read-only list of non-tracked items
- Shows: classification, size, quantity
- Collapsible, collapsed by default
- Includes: shop fittings, bolts, gaskets, shop pipe

### Desktop Only

PDF viewer is hidden on mobile (<=1024px). The Drawing Table remains the primary mobile workflow. Consistent with existing PDF export patterns (`hidden lg:flex`).

## Drawing Table Integration

### Modified DrawingRow

- Add PDF icon column (before drawing number)
- Icon visible only when `file_path IS NOT NULL`
- Click navigates to Drawing Viewer
- Processing status badge while drawings are being processed:
  - `queued` → gray dot
  - `processing` → blue pulsing dot
  - `complete` → no badge (normal state)
  - `error` → red dot with tooltip showing `processing_note`

### No Other Changes

The Drawing Table remains the primary workflow surface. Expandable rows, milestone updates, bulk actions, filters — all unchanged. The PDF viewer is a complementary view accessed via the icon.

## Milestone Templates Reference

Milestones per component type (from `progress_templates`). The sidebar renders these dynamically — no hardcoded milestone names.

| Type | Milestones | Workflow |
|---|---|---|
| Spool (6) | Receive, Erect, Connect, Punch, Test, Restore | Discrete |
| Valve (5) | Receive, Install, Punch, Test, Restore | Discrete |
| Flange (5) | Receive, Install, Punch, Test, Restore | Discrete |
| Support (5) | Receive, Install, Punch, Test, Restore | Discrete |
| Instrument (5) | Receive, Install, Punch, Test, Restore | Discrete |
| Fitting (5) | Receive, Install, Punch, Test, Restore | Discrete |
| Tubing (5) | Receive, Install, Punch, Test, Restore | Discrete |
| Hose (5) | Receive, Install, Punch, Test, Restore | Discrete |
| Misc (5) | Receive, Install, Punch, Test, Restore | Discrete |
| Pipe (7) | Receive, Erect, Connect, Support, Punch, Test, Restore | Hybrid (first 4 partial %) |
| Threaded Pipe (7)* | Fabricate, Erect, Connect, Support, Punch, Test, Restore | Hybrid (first 4 partial %) |

*Threaded Pipe template requires prerequisite migration to drop Install milestone (currently 8 → 7).

## Security

### RLS Policies

All new tables (`drawing_bom_items`, `ai_usage_log`) follow existing RLS patterns:
- Users can only read/write data for projects they belong to
- Policies check `project_id` membership via user's organization

### Storage RLS

`drawing-pdfs` bucket:
- Upload: authenticated users who belong to the project's organization
- Read: authenticated users who belong to the project's organization
- Delete: admin/PM roles only

### API Key Protection

- `GEMINI_API_KEY` stored as Edge Function secret (never in client code)
- All Gemini calls happen server-side in Edge Functions
- Client never sees or sends the API key

## Testing Strategy

### Unit Tests
- Component type mapping function (BOM classification → PipeTrak type)
- Quantity splitting logic (shared with existing import)
- Title block field parsing and normalization
- Size normalization (fractions, mixed numbers)

### Integration Tests
- Edge Function: mock Gemini responses, verify component creation
- Drawing creation with correct identity keys and attributes
- BOM items stored correctly (shop vs field, is_tracked flag)
- Multi-sheet drawing handling (unique constraint with sheet_number)

### Component Tests
- `PdfCanvas` rendering (mock pdf.js)
- `DrawingComponentSidebar` milestone interactions
- `DrawingProcessingProgress` real-time updates
- `DrawingUploadTab` file validation and upload flow

## Out of Scope

- Interactive weld map overlay (Phase 2)
- Visual weld placement by QC users (Phase 2)
- Weld symbol status updates (Phase 2)
- P&ID or general arrangement drawing support
- Spool detection from drawings (spools added manually or via Excel)
- Field weld detection from drawings (Phase 2 manual placement)
- Mobile PDF viewer
- Existing project migration (no retroactive drawing upload for active projects)
- AI cost display to users (tracked internally only)

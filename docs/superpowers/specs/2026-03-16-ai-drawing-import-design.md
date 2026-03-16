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
- Reuses existing component creation logic from `import-takeoff` (see Code Reuse Strategy below)

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

**Unique constraint migration**: The existing partial unique index `idx_drawings_project_norm ON drawings(project_id, drawing_no_norm) WHERE NOT is_retired` must be dropped and recreated as `(project_id, drawing_no_norm, sheet_number) WHERE NOT is_retired`. Downstream impact:
- `import-takeoff/transaction-v2.ts` queries drawings by `(project_id, drawing_no_norm)` — must add `sheet_number` to upsert logic
- `detect_similar_drawings()` RPC — verify still works with new constraint
- `assign_drawing_with_inheritance()` — verify drawing lookup still works
- Any other queries that rely on `drawing_no_norm` uniqueness per project

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

  -- Audit
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE drawing_bom_items ENABLE ROW LEVEL SECURITY;

-- RLS policies (project-based, matching components pattern)
CREATE POLICY "Users can view BOM items for their projects" ON drawing_bom_items
  FOR SELECT USING (
    project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can insert BOM items for their projects" ON drawing_bom_items
  FOR INSERT WITH CHECK (
    project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can update BOM items for their projects" ON drawing_bom_items
  FOR UPDATE USING (
    project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid())
  );
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

-- RLS: admin/PM read-only (users should not see AI cost data)
CREATE POLICY "Admins can view AI usage logs" ON ai_usage_log
  FOR SELECT USING (
    project_id IN (
      SELECT project_id FROM project_members
      WHERE user_id = auth.uid() AND role IN ('admin', 'pm')
    )
  );
-- INSERT is done via service role in edge function (bypasses RLS)
```

### New Storage Bucket

`drawing-pdfs` bucket with RLS enabled (configured via Supabase dashboard, not SQL migrations).
Path structure: `{project_id}/{original_filename}.pdf` for the uploaded file, plus `{project_id}/{original_filename}_p{N}.pdf` for extracted individual pages (created by the edge function).

**Bucket RLS** (configured in Supabase dashboard):
- **Upload (INSERT)**: Authenticated users whose `project_id` folder matches a project they belong to
- **Read (SELECT)**: Same — authenticated users with project membership
- **Delete**: Admin/PM roles only
- Policy enforced by folder path matching against `project_members` table

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

**Migration impact analysis**: Changing the threaded_pipe template affects:
- `import-takeoff/transaction-v2.ts` — initializes `current_milestones` with `Install_LF` key; must be updated
- `calculate_component_percent()` / `calculate_earned_milestone_value()` — reads milestone names from templates, should adapt automatically via `get_component_template()`
- `mv_template_milestone_weights` materialized view — must be refreshed after template insert
- Manhour views (`vw_manhour_progress_by_*`) — consume the materialized view, should pick up changes after refresh
- Existing threaded_pipe components in production — if any exist with `Install_LF` in `current_milestones`, they need a data migration to remove the key and redistribute the value
- The template is versioned (v2 inserted, v1 kept), so new components get v2 while existing ones keep v1 until explicitly migrated

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

**Authorization** (Step 0):
- Edge function validates the calling user's JWT
- Verifies user belongs to the project's organization (same check as `import-takeoff`)
- Returns 403 if unauthorized
- Uses `createClient(supabaseUrl, serviceRoleKey)` for data operations (bypasses RLS for batch inserts)

**Drawing Normalization**:
- `drawing_no_raw` = raw value from Gemini title block extraction
- `drawing_no_norm` = normalized via the same `normalizeDrawing()` function used by `import-takeoff` (UPPERCASE, trimmed, separators collapsed, leading zeros removed)
- **Prerequisite**: `normalizeDrawing()` MUST be extracted from `import-takeoff` to `_shared/normalize-drawing.ts` BEFORE implementing `process-drawing`

**Error Handling**:
- If title block fails → still attempt BOM extraction (partial success OK)
- If BOM fails → drawing created with metadata but no components, status = 'error'
- AI usage logged regardless of outcome
- Partial failures within component creation: components created before the error remain in the database (same behavior as existing `import-takeoff`). No transaction rollback — the drawing is marked with `processing_status = 'error'` and `processing_note` describes what failed. User can re-process or manually fix.

**Re-processing**: If a drawing is re-processed (user re-uploads the same PDF or triggers re-extraction):
- Existing `drawing_bom_items` for that drawing are deleted and recreated
- Existing `components` linked to that drawing are NOT deleted (they may have milestone progress)
- New components are deduplicated by identity key (same as existing import logic — skip if exists)
- This is consistent with the existing `import-takeoff` idempotent behavior

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
2. Client uploads the **full multi-page PDF** to Supabase Storage (`drawing-pdfs/{project_id}/{filename}.pdf`)
3. Client calls `process-drawing` Edge Function with `{ projectId, filePath }`
4. Edge function internally:
   - Detects page count from the PDF
   - Processes each page sequentially (title block + BOM extraction per page)
   - Creates a `drawings` record per page with `processing_status` updates
   - Stores per-page references as `{filename}_p{N}` in the drawing's `file_path` field
5. No client-side PDF splitting — avoids pdf-lib dependency and memory issues with large files
5. Client subscribes to Realtime changes on `drawings.processing_status`
6. Progress UI shows per-drawing status:
   - Queued → Processing (Extracting title block... / Extracting BOM...) → Complete (N components)
   - Error state with processing_note displayed
7. Running totals: components created, drawings processed, remaining
8. On complete: "View in Drawing Table" button + "Upload More" button
9. Warning callouts for drawings that need review

### Concurrency & Duplicate Prevention

- Upload concurrency: 3 files at a time (prevent rate limits)
- Processing concurrency: 2 Edge Function calls at a time (Gemini rate limits: 300 RPM)
- Supabase Realtime handles progress updates without polling
- **Client-side duplicate prevention**: Upload button disabled while any drawing is in 'queued' or 'processing' state. Warn user if re-uploading a file with the same name in the same project. Each uploaded file shows clear progress with filename.

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

## Code Reuse Strategy

The `import-takeoff` edge function contains logic that `process-drawing` needs:
- `normalizeDrawing()` — drawing number normalization
- Quantity splitting logic (seq assignment for qty-exploded components)
- Pipe/threaded pipe aggregate creation (pipe_id generation, linear feet summing)
- Identity key construction per component type
- Progress template assignment
- Deduplication by identity key

**Approach**: Extract shared utilities into `supabase/functions/_shared/` modules:
- `_shared/normalize-drawing.ts` — drawing normalization
- `_shared/component-builder.ts` — identity key construction, qty splitting, aggregate creation
- `_shared/schema-helpers.ts` — type-safe builder functions for `drawing_bom_items` inserts

Both `import-takeoff` and `process-drawing` import from `_shared/`. The `import-takeoff` function is refactored to use these shared modules (no behavior change, just extraction). This avoids code duplication and ensures both import paths produce identical component structures.

**Note**: The `process-drawing` edge function must include its own `schema-helpers.ts` for type-safe `drawing_bom_items` and `ai_usage_log` inserts, per the established edge function pattern.

## TanStack Query Hooks

New hooks (CLAUDE.md Rule 6 — never bare Supabase calls in components):
- `useDrawingBomItems(drawingId)` — fetch BOM items for sidebar
- `useDrawingProcessingStatus(projectId)` — subscribe to Realtime processing status changes
- `useProcessDrawing()` — mutation to trigger edge function
- `useDrawingFile(filePath)` — get signed URL for PDF from Storage
- `useUpdateDrawingMilestone()` — mutation for sidebar milestone updates (wraps existing `useUpdateMilestone`)

## Virtualization

Per CLAUDE.md Rule 9, the `DrawingComponentSidebar` and `BomReferenceSection` must use `@tanstack/react-virtual` if a drawing has 50+ items. Typical ISO drawings have 10-30 field components and 20-50 shop items, so virtualization may not always be needed but should be implemented as a safeguard.

## Post-Implementation Updates

After implementation, update CLAUDE.md with:
- New route: `/projects/:projectId/drawings/:drawingId/viewer`
- New edge function: `process-drawing`
- New storage bucket: `drawing-pdfs`
- New Zustand store if needed (drawing viewer state)

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

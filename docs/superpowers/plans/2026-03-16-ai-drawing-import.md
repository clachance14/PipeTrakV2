# AI Drawing Import — Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable AI-powered ISO drawing upload that extracts BOM items via Google Gemini and creates tracked field components in PipeTrak, with a PDF viewer and editable milestone sidebar.

**Architecture:** Supabase Edge Function (`process-drawing`) calls Gemini Vision API for title block + BOM extraction per PDF page. Extracted field items become PipeTrak components via shared logic with `import-takeoff`. Client uploads PDFs on Imports page, views drawings in a pdf.js-based viewer with a milestone sidebar accessible from the Drawing Table.

**Tech Stack:** Google Gemini API (gemini-3-flash-preview), pdf.js (PDF rendering), Supabase Edge Functions (Deno), Supabase Storage, Supabase Realtime, React + TanStack Query.

**Spec:** `docs/superpowers/specs/2026-03-16-ai-drawing-import-design.md`

---

## Chunk 1: Database Migrations & Shared Module Extraction

### Task 1: Prerequisite — Threaded Pipe Template Migration

**Files:**
- Create: `supabase/migrations/YYYYMMDDHHMMSS_threaded_pipe_template_v2.sql`

- [ ] **Step 1: Check for existing threaded_pipe components in production**

Write a query script to check if any threaded_pipe components exist with `Install_LF` milestones:

```typescript
// query.ts
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
async function main() {
  const { data, error } = await supabase
    .from('components')
    .select('id, identity_key, current_milestones')
    .eq('component_type', 'threaded_pipe')
    .eq('is_retired', false);
  console.log('Threaded pipe components:', data?.length ?? 0);
  if (data?.length) console.log('Sample milestones:', JSON.stringify(data[0].current_milestones));
}
main();
```

Run:
```bash
export VITE_SUPABASE_URL=$(grep VITE_SUPABASE_URL .env | cut -d= -f2 | tr -d '\r') && \
export SUPABASE_SERVICE_ROLE_KEY=$(grep SUPABASE_SERVICE_ROLE_KEY .env | cut -d= -f2 | tr -d '\r') && \
npx tsx query.ts && rm query.ts
```

If zero components exist → skip data migration, just insert new template. If components exist → add `Install_LF` key removal + weight redistribution to the migration.

- [ ] **Step 2: Create the migration**

Create migration file with UTC timestamp (check latest: `ls -t supabase/migrations/ | head -1`). Wait 2+ seconds after any recent migration.

The migration inserts a v2 threaded_pipe template WITHOUT Install:
```sql
-- Insert v2 threaded_pipe template (drops Install milestone)
INSERT INTO progress_templates (component_type, version, workflow_type, milestones_config)
VALUES ('threaded_pipe', 2, 'hybrid', '[
  {"name": "Fabricate", "weight": 16, "order": 1, "is_partial": true, "requires_welder": false},
  {"name": "Erect", "weight": 20, "order": 2, "is_partial": true, "requires_welder": false},
  {"name": "Connect", "weight": 20, "order": 3, "is_partial": true, "requires_welder": false},
  {"name": "Support", "weight": 24, "order": 4, "is_partial": true, "requires_welder": false},
  {"name": "Punch", "weight": 5, "order": 5, "is_partial": false, "requires_welder": false},
  {"name": "Test", "weight": 10, "order": 6, "is_partial": false, "requires_welder": false},
  {"name": "Restore", "weight": 5, "order": 7, "is_partial": false, "requires_welder": false}
]'::jsonb);

-- Refresh materialized view so new template is picked up
REFRESH MATERIALIZED VIEW mv_template_milestone_weights;
```

If existing components were found in Step 1, add data migration logic before the INSERT.

- [ ] **Step 3: Update `import-takeoff/transaction-v2.ts` milestone initialization**

Find the section that initializes `current_milestones` for threaded_pipe (search for `Install_LF` or `Fabricate_LF`). Update to remove `Install_LF` key from the initialization object for new components. The v2 template will be picked up automatically by `get_component_template()` since it uses `MAX(version)`.

- [ ] **Step 4: Push migration and verify**

```bash
./db-push.sh
```

Verify: query `progress_templates` to confirm v2 threaded_pipe exists with 7 milestones.

- [ ] **Step 5: Generate types and commit**

```bash
supabase gen types typescript --linked > src/types/database.types.ts
git add supabase/migrations/ src/types/database.types.ts supabase/functions/import-takeoff/transaction-v2.ts
git commit -m "feat: add threaded_pipe template v2 (drop Install milestone)"
```

---

### Task 2: Extend Drawings Table

**Files:**
- Create: `supabase/migrations/YYYYMMDDHHMMSS_extend_drawings_for_ai_import.sql`

- [ ] **Step 1: Create migration**

```sql
-- Add title block metadata columns to drawings table
ALTER TABLE drawings ADD COLUMN IF NOT EXISTS sheet_number TEXT DEFAULT '1';
ALTER TABLE drawings ADD COLUMN IF NOT EXISTS file_path TEXT;
ALTER TABLE drawings ADD COLUMN IF NOT EXISTS line_number TEXT;
ALTER TABLE drawings ADD COLUMN IF NOT EXISTS material TEXT;
ALTER TABLE drawings ADD COLUMN IF NOT EXISTS schedule TEXT;
ALTER TABLE drawings ADD COLUMN IF NOT EXISTS spec TEXT;
ALTER TABLE drawings ADD COLUMN IF NOT EXISTS nde_class TEXT;
ALTER TABLE drawings ADD COLUMN IF NOT EXISTS pwht BOOLEAN DEFAULT false;
ALTER TABLE drawings ADD COLUMN IF NOT EXISTS hydro TEXT;
ALTER TABLE drawings ADD COLUMN IF NOT EXISTS insulation TEXT;

-- Processing state
ALTER TABLE drawings ADD COLUMN IF NOT EXISTS processing_status TEXT
  CHECK (processing_status IN ('queued', 'processing', 'complete', 'error'));
ALTER TABLE drawings ADD COLUMN IF NOT EXISTS processing_note TEXT;

-- Update unique constraint to include sheet_number
-- Drop existing partial unique index
DROP INDEX IF EXISTS idx_drawings_project_norm;

-- Recreate with sheet_number (preserving WHERE NOT is_retired)
CREATE UNIQUE INDEX idx_drawings_project_norm
  ON drawings(project_id, drawing_no_norm, sheet_number)
  WHERE NOT is_retired;

-- Enable Realtime on drawings table for processing_status updates
-- (Realtime is likely already enabled on drawings; verify in Supabase dashboard)
```

- [ ] **Step 2: Verify downstream functions still work**

After pushing, check these functions still operate correctly:
- `detect_similar_drawings()` — uses `drawing_no_norm` GIN index (trigram), not the unique constraint. Should be fine.
- `assign_drawing_with_inheritance()` — queries by `drawing_id` (UUID), not by norm. Should be fine.
- `import-takeoff/transaction-v2.ts` — queries by `(project_id, drawing_no_norm)`. Must add `sheet_number` to the upsert lookup. Default `'1'` for existing import path.

- [ ] **Step 3: Update import-takeoff drawing upsert to include sheet_number**

In `supabase/functions/import-takeoff/transaction-v2.ts`, find the drawing lookup/insert logic. Add `sheet_number: '1'` as the default for CSV-imported drawings (they never have multi-sheet).

- [ ] **Step 4: Push, generate types, commit**

```bash
./db-push.sh
supabase gen types typescript --linked > src/types/database.types.ts
git add supabase/migrations/ src/types/database.types.ts supabase/functions/import-takeoff/
git commit -m "feat: extend drawings table with title block metadata and sheet_number"
```

---

### Task 3: Create drawing_bom_items and ai_usage_log Tables

**Files:**
- Create: `supabase/migrations/YYYYMMDDHHMMSS_create_drawing_bom_items_and_ai_usage_log.sql`

- [ ] **Step 1: Create migration**

Use the exact SQL from the spec (lines 110-189) for both tables including RLS policies.

- [ ] **Step 2: Push, generate types, commit**

```bash
./db-push.sh
supabase gen types typescript --linked > src/types/database.types.ts
git add supabase/migrations/ src/types/database.types.ts
git commit -m "feat: create drawing_bom_items and ai_usage_log tables with RLS"
```

---

### Task 4: Extract Shared Modules from import-takeoff

**Files:**
- Create: `supabase/functions/_shared/normalize-drawing.ts`
- Create: `supabase/functions/_shared/component-builder.ts`
- Modify: `supabase/functions/import-takeoff/transaction-v2.ts`

- [ ] **Step 1: Create `_shared/` directory and `normalize-drawing.ts`**

Extract `normalizeDrawing()` from `transaction-v2.ts`. The function UPPERCASES, trims, collapses separators, and removes leading zeros.

```typescript
// supabase/functions/_shared/normalize-drawing.ts
export function normalizeDrawing(raw: string): string {
  // Copy exact logic from transaction-v2.ts normalizeDrawing()
  // UPPERCASE, trim, collapse separators, remove leading zeros
}
```

- [ ] **Step 2: Create `_shared/component-builder.ts`**

Extract shared logic:
- `buildIdentityKey(componentType, drawingNorm, cmdtyCode, size, seq)` — identity key construction
- `splitQuantity(componentType, qty)` — returns array of seq numbers based on type
- `buildPipeAggregateId(drawingNorm, size, cmdtyCode)` — pipe_id generation
- `assignProgressTemplate(componentType, templateMap)` — template lookup

Keep this focused on pure functions with no Supabase client dependency.

- [ ] **Step 3: Refactor `transaction-v2.ts` to use shared modules**

Replace inline functions with imports from `_shared/`. Run existing import tests to verify no behavior change.

- [ ] **Step 4: Verify existing import still works**

```bash
npm test -- --grep "import" --run
```

Also test manually: do a small CSV import on a test project and verify components are created correctly.

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/_shared/ supabase/functions/import-takeoff/
git commit -m "refactor: extract shared component-builder and normalize-drawing modules"
```

---

## Chunk 2: AI Extraction Edge Function

### Task 5: Create process-drawing Edge Function Scaffold

**Files:**
- Create: `supabase/functions/process-drawing/index.ts`
- Create: `supabase/functions/process-drawing/types.ts`
- Create: `supabase/functions/process-drawing/schema-helpers.ts`
- Create: `supabase/functions/process-drawing/import_map.json`

- [ ] **Step 1: Create the edge function directory and scaffold**

```bash
mkdir -p supabase/functions/process-drawing
```

Create `import_map.json` (copy from `import-takeoff/import_map.json`).

Create `types.ts` with interfaces:
```typescript
export interface ProcessDrawingRequest {
  projectId: string;
  filePath: string;
}

export interface TitleBlockData {
  drawing_number: string | null;
  sheet_number: string | null;
  line_number: string | null;
  material: string | null;
  schedule: string | null;
  spec: string | null;
  nde_class: string | null;
  pwht: boolean;
  revision: string | null;
  hydro: string | null;
  insulation: string | null;
}

export interface BomItem {
  item_type: 'material' | 'support';
  classification: string;
  section: 'shop' | 'field';
  description: string | null;
  size: string | null;
  size_2: string | null;
  quantity: number;
  uom: string | null;
  spec: string | null;
  material_grade: string | null;
  schedule: string | null;
  schedule_2: string | null;
  rating: string | null;
  commodity_code: string | null;
  end_connection: string | null;
  item_number: number | null;
  needs_review: boolean;
  review_reason: string | null;
}

export interface ProcessingResult {
  success: boolean;
  drawingsProcessed: number;
  componentsCreated: number;
  bomItemsStored: number;
  errors: string[];
}
```

Create `schema-helpers.ts` with type-safe builder functions for `drawing_bom_items` and `ai_usage_log` inserts.

Create `index.ts` with:
- CORS headers
- JWT validation
- Request body parsing
- Authorization check (user belongs to project's org)
- Call to `processDrawing()` (stubbed)
- Error handling wrapper

- [ ] **Step 2: Commit scaffold**

```bash
git add supabase/functions/process-drawing/
git commit -m "feat: scaffold process-drawing edge function"
```

---

### Task 6: Gemini Client Module

**Files:**
- Create: `supabase/functions/process-drawing/gemini-client.ts`

- [ ] **Step 1: Read TakeOffTrak's gemini-client.ts for reference**

Read `/home/clachance14/projects/TakeOffTrak/src/lib/ai-pipeline/gemini-client.ts` to understand the API call pattern, retry logic, and cost tracking.

- [ ] **Step 2: Create Deno-compatible Gemini client**

Port the client for Deno runtime (no `node:` imports). Key functions:
- `callGemini(base64Pdf: string, prompt: string, schema: object): Promise<GeminiResult>` — makes the API call with retry
- `trackUsage(result, operation, projectId, drawingId, supabase)` — logs to `ai_usage_log`
- Retry logic: 3 attempts, exponential backoff (2s, 4s, 8s + jitter)
- Rate limit detection (429, RESOURCE_EXHAUSTED)
- Reads `GEMINI_API_KEY` from `Deno.env.get('GEMINI_API_KEY')`

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/process-drawing/gemini-client.ts
git commit -m "feat: add Gemini Vision API client for process-drawing"
```

---

### Task 7: Title Block Extraction

**Files:**
- Create: `supabase/functions/process-drawing/title-block-reader.ts`

- [ ] **Step 1: Read TakeOffTrak's title-block-reader.ts for the prompt**

Read `/home/clachance14/projects/TakeOffTrak/src/lib/ai-pipeline/title-block-reader.ts` and adapt the prompt.

- [ ] **Step 2: Create title block reader**

```typescript
// title-block-reader.ts
import { callGemini } from './gemini-client.ts';
import type { TitleBlockData } from './types.ts';

const TITLE_BLOCK_PROMPT = `...`; // Adapted from TakeOffTrak

const TITLE_BLOCK_SCHEMA = { /* strict JSON schema */ };

export async function extractTitleBlock(base64Pdf: string): Promise<TitleBlockData> {
  const result = await callGemini(base64Pdf, TITLE_BLOCK_PROMPT, TITLE_BLOCK_SCHEMA);
  return parseTitleBlockResponse(result);
}
```

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/process-drawing/title-block-reader.ts
git commit -m "feat: add title block extraction via Gemini Vision"
```

---

### Task 8: BOM Extraction

**Files:**
- Create: `supabase/functions/process-drawing/bom-extractor.ts`

- [ ] **Step 1: Read TakeOffTrak's bom-extraction.ts for the prompt**

Read `/home/clachance14/projects/TakeOffTrak/src/lib/ai-pipeline/bom-extraction.ts` and adapt the prompt. Key adaptation: include `section` (shop/field) in the extraction schema.

- [ ] **Step 2: Create BOM extractor**

```typescript
// bom-extractor.ts
import { callGemini } from './gemini-client.ts';
import type { BomItem } from './types.ts';

const BOM_EXTRACTION_PROMPT = `...`; // Adapted from TakeOffTrak

const BOM_SCHEMA = { /* strict JSON schema with section field */ };

export async function extractBom(base64Pdf: string): Promise<BomItem[]> {
  const result = await callGemini(base64Pdf, BOM_EXTRACTION_PROMPT, BOM_SCHEMA);
  return parseBomResponse(result);
}
```

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/process-drawing/bom-extractor.ts
git commit -m "feat: add BOM extraction via Gemini Vision"
```

---

### Task 9: Component Type Mapper

**Files:**
- Create: `supabase/functions/process-drawing/component-mapper.ts`
- Create: `supabase/functions/process-drawing/component-mapper.test.ts`

- [ ] **Step 1: Write failing tests for the mapper**

```typescript
// component-mapper.test.ts
import { describe, it, expect } from 'vitest';
import { mapBomToComponentType, isTrackedItem } from './component-mapper';

describe('mapBomToComponentType', () => {
  it('maps gate valve to valve', () => {
    expect(mapBomToComponentType('gate valve')).toBe('valve');
  });
  it('maps ball valve to valve', () => {
    expect(mapBomToComponentType('ball valve')).toBe('valve');
  });
  it('maps flange RFWN to flange', () => {
    expect(mapBomToComponentType('flange RFWN')).toBe('flange');
  });
  it('maps pipe shoe to support', () => {
    expect(mapBomToComponentType('pipe shoe')).toBe('support');
  });
  it('maps elbow 90 LR to fitting', () => {
    expect(mapBomToComponentType('elbow 90 LR')).toBe('fitting');
  });
  it('maps pipe to pipe', () => {
    expect(mapBomToComponentType('pipe')).toBe('pipe');
  });
  it('maps unrecognized to misc_component', () => {
    expect(mapBomToComponentType('unknown widget')).toBe('misc_component');
  });
});

describe('isTrackedItem', () => {
  it('returns false for bolts', () => {
    expect(isTrackedItem('stud bolt', 'field')).toBe(false);
  });
  it('returns false for gaskets', () => {
    expect(isTrackedItem('spiral wound gasket', 'field')).toBe(false);
  });
  it('returns false for shop items', () => {
    expect(isTrackedItem('elbow 90 LR', 'shop')).toBe(false);
  });
  it('returns true for field valve', () => {
    expect(isTrackedItem('gate valve', 'field')).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- supabase/functions/process-drawing/component-mapper.test.ts --run
```

- [ ] **Step 3: Implement the mapper**

```typescript
// component-mapper.ts
const VALVE_PATTERNS = /\b(gate|globe|ball|check|butterfly|plug|needle)\s*valve\b/i;
const FLANGE_PATTERNS = /\bflange\b/i;
const SUPPORT_PATTERNS = /\b(pipe\s*shoe|guide|anchor|spring\s*hanger|support|clamp)\b/i;
const FITTING_PATTERNS = /\b(elbow|tee|reducer|coupling|cap|union|nipple|bushing)\b/i;
const PIPE_PATTERNS = /^pipe$/i;
const THREADED_PIPE_PATTERNS = /\bthreaded\s*pipe\b/i;
const INSTRUMENT_PATTERNS = /\b(instrument|gauge|transmitter|indicator)\b/i;
const TUBING_PATTERNS = /\btubing\b/i;
const HOSE_PATTERNS = /\bhose\b/i;
const BOLT_PATTERNS = /\b(bolt|stud\s*bolt|nut|washer)\b/i;
const GASKET_PATTERNS = /\bgasket\b/i;

export function mapBomToComponentType(classification: string): string {
  if (VALVE_PATTERNS.test(classification)) return 'valve';
  if (FLANGE_PATTERNS.test(classification)) return 'flange';
  if (SUPPORT_PATTERNS.test(classification)) return 'support';
  if (INSTRUMENT_PATTERNS.test(classification)) return 'instrument';
  if (THREADED_PIPE_PATTERNS.test(classification)) return 'threaded_pipe';
  if (PIPE_PATTERNS.test(classification)) return 'pipe';
  if (FITTING_PATTERNS.test(classification)) return 'fitting';
  if (TUBING_PATTERNS.test(classification)) return 'tubing';
  if (HOSE_PATTERNS.test(classification)) return 'hose';
  return 'misc_component';
}

export function isTrackedItem(classification: string, section: string): boolean {
  if (section === 'shop') return false;
  if (BOLT_PATTERNS.test(classification)) return false;
  if (GASKET_PATTERNS.test(classification)) return false;
  return true;
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- supabase/functions/process-drawing/component-mapper.test.ts --run
```

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/process-drawing/component-mapper*
git commit -m "feat: add BOM classification to PipeTrak component type mapper"
```

---

### Task 10: Wire Up the Full Pipeline in process-drawing/index.ts

**Files:**
- Modify: `supabase/functions/process-drawing/index.ts`

- [ ] **Step 1: Implement the main processing function**

Wire together: auth check → fetch PDF → title block extraction → BOM extraction → store BOM items → filter field items → map to components → create components → update status.

Key implementation details:
- Fetch PDF from Storage: `supabase.storage.from('drawing-pdfs').download(filePath)`
- Convert to base64: `btoa(String.fromCharCode(...new Uint8Array(buffer)))`
- Use `normalizeDrawing()` from `_shared/normalize-drawing.ts`
- Use `buildIdentityKey()`, `splitQuantity()` from `_shared/component-builder.ts`
- Use `schema-helpers.ts` for type-safe inserts
- Update `drawings.processing_status` at each stage (triggers Realtime)
- Log AI usage via `trackUsage()` from `gemini-client.ts`

**Multi-sheet handling details**:
- Detect page count: read PDF buffer and count pages (Deno PDF library or Gemini returns page info)
- For each page, create a `drawings` record with `sheet_number = String(pageNum)`
- Title block extraction may return the same `drawing_number` for all sheets — that's correct (unique constraint is on `drawing_no_norm + sheet_number`)
- `file_path` per page: `{projectId}/{filename}_p{pageNum}.pdf`
- Update `processing_status` per-drawing (each sheet = separate Realtime update)

- [ ] **Step 2: Write integration test with mocked Gemini**

Create `tests/integration/process-drawing.test.ts`:
- Mock Gemini API responses (title block JSON + BOM JSON)
- Verify `drawing_bom_items` populated correctly (shop + field items)
- Verify `components` created only for field items with correct identity keys
- Verify bolts/gaskets are `is_tracked = false`
- Verify multi-sheet handling (same drawing_no, different sheet_number)
- Verify `ai_usage_log` entries created

- [ ] **Step 3: Test manually with a sample ISO PDF**

Upload a test PDF to the `drawing-pdfs` bucket, call the edge function, verify:
- Drawing record updated with title block metadata
- `drawing_bom_items` populated with all BOM items
- `components` created for field items only
- `ai_usage_log` entries created
- `processing_status = 'complete'`

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/process-drawing/ tests/integration/process-drawing.test.ts
git commit -m "feat: implement full AI extraction pipeline in process-drawing"
```

---

## Chunk 3: Client Upload Flow

### Task 11: TanStack Query Hooks

**Files:**
- Create: `src/hooks/useProcessDrawing.ts`
- Create: `src/hooks/useDrawingProcessingStatus.ts`
- Create: `src/hooks/useDrawingFile.ts`
- Create: `src/hooks/useDrawingBomItems.ts`

- [ ] **Step 1: Create `useProcessDrawing` mutation hook**

Calls the `process-drawing` edge function. Pattern follows existing `useImport.ts`.

```typescript
// src/hooks/useProcessDrawing.ts
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export function useProcessDrawing() {
  return useMutation({
    mutationFn: async ({ projectId, filePath }: { projectId: string; filePath: string }) => {
      const { data, error } = await supabase.functions.invoke('process-drawing', {
        body: { projectId, filePath },
      });
      if (error) throw error;
      return data;
    },
  });
}
```

- [ ] **Step 2: Create `useDrawingProcessingStatus` hook with Realtime subscription**

Subscribes to `drawings` table changes filtered by `project_id` and `processing_status` changes.

- [ ] **Step 3: Create `useDrawingFile` hook**

Gets a signed URL from Supabase Storage for the PDF.

- [ ] **Step 4: Create `useDrawingBomItems` hook**

Fetches `drawing_bom_items` for a given `drawingId`.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useProcessDrawing.ts src/hooks/useDrawingProcessingStatus.ts \
  src/hooks/useDrawingFile.ts src/hooks/useDrawingBomItems.ts
git commit -m "feat: add TanStack Query hooks for drawing import"
```

---

### Task 12: Drawing Upload Tab Component

**Files:**
- Create: `src/components/import/DrawingUploadTab.tsx`
- Create: `src/components/import/DrawingUploadTab.test.tsx`

- [ ] **Step 1: Write basic test**

Test that the component renders the drop zone, validates file types (PDF only), and validates file size (max 50MB).

- [ ] **Step 2: Implement `DrawingUploadTab`**

Pattern follows existing `ImportPage.tsx` drop zone. Key features:
- Drag-and-drop zone accepting only PDF files
- File size validation (50MB max)
- Upload to Supabase Storage (`drawing-pdfs/{projectId}/{filename}.pdf`)
- Call `useProcessDrawing()` mutation after upload
- Disable upload button while processing
- Duplicate filename warning

- [ ] **Step 3: Run tests, commit**

```bash
npm test -- src/components/import/DrawingUploadTab.test.tsx --run
git add src/components/import/DrawingUploadTab*
git commit -m "feat: add DrawingUploadTab component with PDF upload"
```

---

### Task 13: Processing Progress Component

**Files:**
- Create: `src/components/import/DrawingProcessingProgress.tsx`
- Create: `src/components/import/DrawingProcessingProgress.test.tsx`

- [ ] **Step 1: Write test**

Test that the component shows progress for queued/processing/complete/error states, displays running totals, and shows the completion actions.

- [ ] **Step 2: Implement `DrawingProcessingProgress`**

Uses `useDrawingProcessingStatus()` hook for Realtime updates. Displays:
- Progress bar (N / total complete)
- Per-drawing status rows (drawing number, metadata, component count)
- Running totals (components created, drawings processed, remaining)
- Completion state with "View in Drawing Table" and "Upload More" buttons
- Warning callouts for drawings with `processing_status = 'error'`
- Warning badges for drawings with BOM items flagged `needs_review = true` (e.g., unrecognized classifications mapped to misc_component)

- [ ] **Step 3: Run tests, commit**

```bash
npm test -- src/components/import/DrawingProcessingProgress.test.tsx --run
git add src/components/import/DrawingProcessingProgress*
git commit -m "feat: add real-time drawing processing progress component"
```

---

### Task 14: Integrate Upload Tab into Imports Page

**Files:**
- Modify: `src/pages/ImportsPage.tsx`

- [ ] **Step 1: Add tab navigation**

Add tabs to the Imports page: "Spreadsheet Import" (existing) | "Drawing Upload" (new). Use Radix Tabs component (already installed).

- [ ] **Step 2: Wire up DrawingUploadTab and DrawingProcessingProgress**

When "Drawing Upload" tab is active, show `DrawingUploadTab`. When processing starts, switch to `DrawingProcessingProgress`.

- [ ] **Step 3: Test manually and commit**

```bash
git add src/pages/ImportsPage.tsx
git commit -m "feat: add Drawing Upload tab to Imports page"
```

---

## Chunk 4: PDF Viewer & Sidebar

### Task 15: Install pdf.js

- [ ] **Step 1: Install pdfjs-dist**

```bash
npm install pdfjs-dist
```

- [ ] **Step 2: Configure pdf.js worker**

Create a worker setup file. pdf.js requires a web worker for off-main-thread rendering.

```typescript
// src/lib/pdf-worker.ts
import * as pdfjsLib from 'pdfjs-dist';
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();
export { pdfjsLib };
```

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json src/lib/pdf-worker.ts
git commit -m "feat: install and configure pdfjs-dist"
```

---

### Task 16: PdfCanvas Component

**Files:**
- Create: `src/components/drawing-viewer/PdfCanvas.tsx`
- Create: `src/components/drawing-viewer/PdfCanvas.test.tsx`

- [ ] **Step 1: Write basic test**

Mock pdf.js. Test that the component renders a canvas, handles zoom state, and displays page navigation controls.

- [ ] **Step 2: Implement PdfCanvas**

Reference TakeOffTrak's `PdfCanvas.tsx` at `/home/clachance14/projects/TakeOffTrak/src/lib/pdf-viewer/PdfCanvas.tsx`. Adapt for PipeTrak:
- Accepts `fileUrl` prop (signed URL from `useDrawingFile`)
- Zoom: 10%-1000% with mouse wheel (Ctrl+scroll)
- Pan: Click + drag
- Page navigation (for multi-sheet — prev/next controls)
- Canvas rendering via pdf.js `page.render()`
- Loading state while PDF loads
- Error state if PDF fails to load

- [ ] **Step 3: Run tests, commit**

```bash
npm test -- src/components/drawing-viewer/PdfCanvas.test.tsx --run
git add src/components/drawing-viewer/PdfCanvas*
git commit -m "feat: add PdfCanvas component with zoom, pan, and page navigation"
```

---

### Task 17: Drawing Component Sidebar

**Files:**
- Create: `src/components/drawing-viewer/DrawingComponentSidebar.tsx`
- Create: `src/components/drawing-viewer/BomReferenceSection.tsx`
- Create: `src/components/drawing-viewer/DrawingComponentSidebar.test.tsx`

- [ ] **Step 1: Write tests**

Test that the sidebar:
- Shows field components with milestone controls
- Shows shop/reference items as read-only
- Calls milestone update mutation on checkbox change
- Shows component count badges
- Renders different milestone types correctly (discrete checkboxes vs partial % inputs)

- [ ] **Step 2: Implement DrawingComponentSidebar**

Uses `useComponentsByDrawing(drawingId)` (existing hook) for tracked components. Uses `useDrawingBomItems(drawingId)` for sidebar reference items.

Field Components section:
- Renders each component with 3-column grid milestone layout (mobile pattern from `ComponentRow`)
- Uses existing `MilestoneCheckbox` and `PartialMilestoneInput` (compact variant)
- Milestone updates use existing `useUpdateMilestone` hook
- Rollback confirmation modal on unchecking
- Virtualized with `@tanstack/react-virtual` when 50+ items

BomReferenceSection:
- Collapsible (collapsed by default)
- Read-only list: classification, size, quantity
- Filters to `is_tracked = false` items
- Virtualized when 50+ items

- [ ] **Step 3: Run tests, commit**

```bash
npm test -- src/components/drawing-viewer/DrawingComponentSidebar.test.tsx --run
git add src/components/drawing-viewer/DrawingComponentSidebar* \
  src/components/drawing-viewer/BomReferenceSection*
git commit -m "feat: add drawing component sidebar with editable milestones"
```

---

### Task 18: Drawing Viewer Page

**Files:**
- Create: `src/pages/DrawingViewerPage.tsx`
- Modify: `src/App.tsx` (add route)

- [ ] **Step 1: Create DrawingViewerPage**

Full-page layout:
- Toolbar: back button, drawing metadata, zoom controls, page nav
- PdfCanvas (left, `flex-1`)
- DrawingComponentSidebar (right, `w-80`)
- Desktop only: wrap in `hidden lg:flex`
- Route: `/projects/:projectId/drawings/:drawingId/viewer`

Uses:
- `useDrawings()` to fetch drawing metadata
- `useDrawingFile()` to get signed PDF URL
- `useComponentsByDrawing()` for sidebar field components
- `useDrawingBomItems()` for sidebar reference items

- [ ] **Step 2: Add route to App.tsx**

Add the route inside the authenticated routes section, under the project routes.

- [ ] **Step 3: Test manually and commit**

Navigate to a drawing viewer page. Verify PDF renders, sidebar shows components, milestone updates work.

```bash
git add src/pages/DrawingViewerPage.tsx src/App.tsx
git commit -m "feat: add DrawingViewerPage with PDF canvas and sidebar"
```

---

## Chunk 5: Drawing Table Integration & Polish

### Task 19: Add PDF Icon to Drawing Table Row

**Files:**
- Modify: `src/components/drawing-table/DrawingRow.tsx`

- [ ] **Step 1: Add PDF icon and processing status badge**

In `DrawingRow.tsx`:
- Add a PDF icon (📄 or Lucide `FileText`) before the drawing number
- Show icon only when `file_path IS NOT NULL`
- Click handler navigates to `/projects/:projectId/drawings/:drawingId/viewer`
- Processing status badge:
  - `queued` → gray dot
  - `processing` → blue pulsing dot (animate-pulse)
  - `error` → red dot with tooltip showing `processing_note`
  - `complete` or null → no badge

- [ ] **Step 2: Commit**

```bash
git add src/components/drawing-table/DrawingRow.tsx
git commit -m "feat: add PDF icon and processing status badge to DrawingRow"
```

---

### Task 20: Create Storage Bucket

- [ ] **Step 1: Create `drawing-pdfs` bucket in Supabase dashboard**

Go to Supabase dashboard → Storage → New bucket:
- Name: `drawing-pdfs`
- Public: No (private bucket)
- File size limit: 50MB
- Allowed MIME types: `application/pdf`

- [ ] **Step 2: Configure bucket RLS policies in dashboard**

Add policies for SELECT (project members), INSERT (project members), DELETE (admin/PM only).

- [ ] **Step 3: Set GEMINI_API_KEY edge function secret**

```bash
supabase secrets set GEMINI_API_KEY=<your-key> --project-ref <project-ref>
```

- [ ] **Step 4: Deploy process-drawing edge function**

```bash
supabase functions deploy process-drawing --project-ref <project-ref>
```

- [ ] **Step 5: Document in commit**

```bash
git commit --allow-empty -m "chore: configure drawing-pdfs storage bucket and deploy process-drawing"
```

---

### Task 21: Generate Types & Update CLAUDE.md

**Files:**
- Modify: `src/types/database.types.ts` (regenerated)
- Modify: `CLAUDE.md`

- [ ] **Step 1: Regenerate types**

```bash
supabase gen types typescript --linked > src/types/database.types.ts
```

- [ ] **Step 2: Update CLAUDE.md**

Add to the Routes section:
```
- **Drawing Viewer**: `/projects/:projectId/drawings/:drawingId/viewer`
```

Add to the Edge Functions table in `supabase/CLAUDE.md`:
```
| `process-drawing` | AI-powered ISO drawing extraction |
```

Add to Storage section:
```
- `drawing-pdfs` — ISO drawing PDF files ({project_id}/ structure)
```

- [ ] **Step 3: Commit**

```bash
git add src/types/database.types.ts CLAUDE.md supabase/CLAUDE.md
git commit -m "chore: regenerate types and update CLAUDE.md with drawing import feature"
```

---

### Task 22: End-to-End Verification

- [ ] **Step 1: Full flow test**

1. Create a new test project
2. Go to Imports → Drawing Upload tab
3. Upload a sample ISO PDF (multi-page)
4. Verify real-time progress shows processing status
5. Navigate to Drawing Table → verify drawings appear with PDF icon
6. Click PDF icon → verify Drawing Viewer opens
7. Verify sidebar shows field components with milestone controls
8. Update a milestone from the sidebar → verify it persists
9. Verify shop/reference section shows non-tracked BOM items
10. Check `ai_usage_log` has entries

- [ ] **Step 2: Verify existing features still work**

1. CSV import still works (Spreadsheet Import tab)
2. Drawing Table expandable rows still work
3. Milestone updates from Drawing Table still work
4. Reports still generate correctly

- [ ] **Step 3: Run full test suite**

```bash
npm test -- --run
npm run lint
tsc -b
npm run build
```

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat: complete AI drawing import Phase 1"
```

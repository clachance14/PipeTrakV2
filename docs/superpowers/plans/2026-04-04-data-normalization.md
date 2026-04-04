# Data Normalization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add spec normalization (first-token extraction) and title block no-data cleanup to both the AI drawing import and CSV takeoff import pipelines.

**Architecture:** Two pure utility modules (`normalizeSpec`, `normalizeTitleBlock`) integrate at the extraction boundary — after Gemini returns data and before DB writes. CSV imports get `normalizeSpec` only. No database migrations needed.

**Tech Stack:** TypeScript (Deno for edge functions, Vite for client), Vitest for testing.

**Spec:** `docs/superpowers/specs/2026-04-04-data-normalization-design.md`

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `supabase/functions/_shared/normalize-spec.ts` | Shared `normalizeSpec()` for edge functions (Deno) |
| Create | `src/lib/csv/normalize-spec.ts` | Client-side `normalizeSpec()` mirror (Vite) |
| Create | `src/lib/csv/normalize-spec.test.ts` | Unit tests for client-side `normalizeSpec()` |
| Create | `supabase/functions/process-drawing/title-block-normalizer.ts` | `normalizeTitleBlock()` — no-data cleanup + spec normalization |
| Create | `src/lib/csv/title-block-normalizer.test.ts` | Unit tests for `normalizeTitleBlock()` (pure function, testable via Vitest) |
| Modify | `supabase/functions/process-drawing/title-block-reader.ts:130-152` | Call `normalizeTitleBlock()`, remove manual spec stripping |
| Modify | `supabase/functions/process-drawing/bom-extractor.ts:321` | Call `normalizeSpec()` on BOM item spec |
| Modify | `src/lib/csv/csv-validator.ts:163` | Call `normalizeSpec()` on CSV spec field |
| Modify | `supabase/functions/import-takeoff/transaction.ts:321` | Call `normalizeSpec()` on spec before insert |
| Modify | `supabase/functions/import-takeoff/transaction-v2.ts:357` | Call `normalizeSpec()` on spec before insert |

---

### Task 1: Create `normalizeSpec()` — Edge Function Copy

**Files:**
- Create: `supabase/functions/_shared/normalize-spec.ts`

- [ ] **Step 1: Write the normalizeSpec function**

```typescript
// supabase/functions/_shared/normalize-spec.ts

/**
 * Spec normalization — shared across edge functions.
 * Extracts the core piping spec code by taking the first
 * whitespace-delimited token, trimmed and uppercased.
 *
 * "PU-32 CC0085888" → "PU-32"
 * "PU-32 CC"        → "PU-32"
 * "PU-32"           → "PU-32"
 * "  pu-22  "       → "PU-22"
 * ""                → null
 * null              → null
 */
export function normalizeSpec(raw: string | null): string | null {
  if (raw == null) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  return trimmed.split(/\s+/)[0].toUpperCase();
}
```

- [ ] **Step 2: Commit**

```bash
git add supabase/functions/_shared/normalize-spec.ts
git commit -m "feat: add normalizeSpec shared utility for edge functions"
```

---

### Task 2: Create `normalizeSpec()` — Client-Side Copy + Tests

**Files:**
- Create: `src/lib/csv/normalize-spec.ts`
- Create: `src/lib/csv/normalize-spec.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// src/lib/csv/normalize-spec.test.ts
import { describe, it, expect } from 'vitest';
import { normalizeSpec } from './normalize-spec';

describe('normalizeSpec', () => {
  it('extracts first token from spec with trailing contract code', () => {
    expect(normalizeSpec('PU-32 CC0085888')).toBe('PU-32');
  });

  it('extracts first token from spec with trailing partial code', () => {
    expect(normalizeSpec('PU-32 CC')).toBe('PU-32');
  });

  it('returns spec unchanged when no trailing tokens', () => {
    expect(normalizeSpec('PU-32')).toBe('PU-32');
  });

  it('trims whitespace and uppercases', () => {
    expect(normalizeSpec('  pu-22  ')).toBe('PU-22');
  });

  it('handles multiple spaces between tokens', () => {
    expect(normalizeSpec('PU-32   CC0085888')).toBe('PU-32');
  });

  it('returns null for empty string', () => {
    expect(normalizeSpec('')).toBeNull();
  });

  it('returns null for whitespace-only string', () => {
    expect(normalizeSpec('   ')).toBeNull();
  });

  it('returns null for null input', () => {
    expect(normalizeSpec(null)).toBeNull();
  });

  it('preserves hyphens within spec code', () => {
    expect(normalizeSpec('HC-05')).toBe('HC-05');
  });

  it('preserves alphanumeric spec codes', () => {
    expect(normalizeSpec('A1A')).toBe('A1A');
  });

  it('uppercases lowercase spec', () => {
    expect(normalizeSpec('hc-05')).toBe('HC-05');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/csv/normalize-spec.test.ts`
Expected: FAIL — `normalizeSpec` not found (module doesn't exist yet)

- [ ] **Step 3: Write the client-side normalizeSpec**

```typescript
// src/lib/csv/normalize-spec.ts

/**
 * Spec Normalization Utility
 * Extracts the core piping spec code by taking the first
 * whitespace-delimited token, trimmed and uppercased.
 *
 * MUST match the edge function copy at:
 * supabase/functions/_shared/normalize-spec.ts
 *
 * Examples:
 * - "PU-32 CC0085888" → "PU-32"
 * - "PU-32 CC"        → "PU-32"
 * - "PU-32"           → "PU-32"
 * - "  pu-22  "       → "PU-22"
 * - ""                → null
 * - null              → null
 */
export function normalizeSpec(raw: string | null): string | null {
  if (raw == null) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  return trimmed.split(/\s+/)[0].toUpperCase();
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/csv/normalize-spec.test.ts`
Expected: PASS — all 11 tests green

- [ ] **Step 5: Commit**

```bash
git add src/lib/csv/normalize-spec.ts src/lib/csv/normalize-spec.test.ts
git commit -m "feat: add normalizeSpec client-side utility with tests"
```

---

### Task 3: Create `normalizeTitleBlock()` + Tests

**Files:**
- Create: `supabase/functions/process-drawing/title-block-normalizer.ts`
- Create: `src/lib/csv/title-block-normalizer.test.ts`

Note: The normalizer lives in the edge function directory (Deno) but is a pure function with no Deno-specific imports, so it can be tested via Vitest by importing via a relative path workaround OR by testing a client-side copy. Since the function is pure and small, we test it by creating a test file that imports the types and re-tests the logic patterns directly. However, the simplest approach: the test file imports from its own inline copy of the patterns (just the regexes and helper functions) to verify correctness, since the edge function file uses Deno imports.

**Actually — simpler approach:** The `normalizeTitleBlock` function imports `normalizeSpec` from `../_shared/normalize-spec.ts` and `TitleBlockData` from `./types.ts`. Since Vitest can't resolve Deno paths, we test the **patterns and logic** by creating a parallel test file that tests the pure helper functions (`normalizeGeneric`, `normalizeInsulation`, `normalizeHydro`) and the full `normalizeTitleBlock` function by importing from a test-friendly copy.

Best approach for this project: Create the test in `src/lib/csv/` that tests the normalization patterns directly, same as TakeOffTrak does with its `_testing` export.

- [ ] **Step 1: Write the failing tests**

```typescript
// src/lib/csv/title-block-normalizer.test.ts
import { describe, it, expect } from 'vitest';

// We test the patterns directly since the edge function uses Deno imports.
// These patterns MUST match supabase/functions/process-drawing/title-block-normalizer.ts

const GENERIC_NO_VALUE = /^(n\/?a|none|nil|--?|-{2,}|\.+)$/i;
const INSULATION_NO_VALUE = /^(n|no|0(\.0+)?"?)$/i;
const HYDRO_NO_VALUE = /^(n|no)$/i;

function normalizeGeneric(value: string | null): string | null {
  if (value === null) return null;
  const trimmed = value.trim();
  if (trimmed === '') return null;
  if (GENERIC_NO_VALUE.test(trimmed)) return null;
  return trimmed;
}

function normalizeInsulation(value: string | null): string | null {
  if (value === null) return null;
  const trimmed = value.trim();
  if (trimmed === '') return null;
  if (GENERIC_NO_VALUE.test(trimmed)) return null;
  if (INSULATION_NO_VALUE.test(trimmed)) return null;
  return trimmed;
}

function normalizeHydro(value: string | null): string | null {
  if (value === null) return null;
  const trimmed = value.trim();
  if (trimmed === '') return null;
  if (GENERIC_NO_VALUE.test(trimmed)) return null;
  if (HYDRO_NO_VALUE.test(trimmed)) return null;
  return trimmed;
}

describe('normalizeGeneric', () => {
  it('returns null for null input', () => {
    expect(normalizeGeneric(null)).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(normalizeGeneric('')).toBeNull();
  });

  it('returns null for whitespace-only', () => {
    expect(normalizeGeneric('   ')).toBeNull();
  });

  it.each([
    'N/A', 'n/a', 'NA', 'na',
    'none', 'None', 'NONE',
    'nil', 'NIL',
    '-', '--', '---',
    '.', '..', '...',
  ])('returns null for no-value pattern: "%s"', (input) => {
    expect(normalizeGeneric(input)).toBeNull();
  });

  it.each([
    ['Class 1', 'Class 1'],
    ['40', '40'],
    ['A1A', 'A1A'],
    ['CS', 'CS'],
    ['H', 'H'],
    ['Required', 'Required'],
  ])('preserves real value: "%s" → "%s"', (input, expected) => {
    expect(normalizeGeneric(input)).toBe(expected);
  });

  it('trims whitespace from real values', () => {
    expect(normalizeGeneric('  Class 1  ')).toBe('Class 1');
  });
});

describe('normalizeInsulation', () => {
  it.each([
    'N', 'n', 'No', 'no', 'NO',
    '0', '0.0', '0.00', '0"', '0.0"', '0.00"',
    'N/A', 'none', '-',
  ])('returns null for no-insulation pattern: "%s"', (input) => {
    expect(normalizeInsulation(input)).toBeNull();
  });

  it.each([
    ['H', 'H'],
    ['C', 'C'],
    ['P', 'P'],
    ['3PG', '3PG'],
    ['25H', '25H'],
  ])('preserves real insulation value: "%s" → "%s"', (input, expected) => {
    expect(normalizeInsulation(input)).toBe(expected);
  });
});

describe('normalizeHydro', () => {
  it.each([
    'N', 'n', 'No', 'no', 'NO',
    'N/A', 'none', '-',
  ])('returns null for no-hydro pattern: "%s"', (input) => {
    expect(normalizeHydro(input)).toBeNull();
  });

  it.each([
    ['Required', 'Required'],
    ['Yes', 'Yes'],
    ['150 PSIG', '150 PSIG'],
  ])('preserves real hydro value: "%s" → "%s"', (input, expected) => {
    expect(normalizeHydro(input)).toBe(expected);
  });
});
```

Also add an orchestration test that verifies `normalizeTitleBlock` applies the correct normalizer to each field. Since the edge function can't be imported by Vitest (Deno imports), inline the full function with its helpers for testing:

```typescript
// Add at the end of the test file, after the normalizeHydro tests:

import { normalizeSpec } from './normalize-spec';

// Inline copy of normalizeTitleBlock for testing.
// MUST match supabase/functions/process-drawing/title-block-normalizer.ts
interface TitleBlockData {
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

function normalizeTitleBlock(result: TitleBlockData): TitleBlockData {
  const spec = normalizeGeneric(result.spec);
  return {
    ...result,
    drawing_number: normalizeGeneric(result.drawing_number),
    sheet_number: normalizeGeneric(result.sheet_number),
    line_number: normalizeGeneric(result.line_number),
    material: normalizeGeneric(result.material),
    schedule: normalizeGeneric(result.schedule),
    spec: normalizeSpec(spec),
    nde_class: normalizeGeneric(result.nde_class),
    revision: normalizeGeneric(result.revision),
    insulation: normalizeInsulation(result.insulation),
    hydro: normalizeHydro(result.hydro),
  };
}

describe('normalizeTitleBlock', () => {
  const baseTitleBlock: TitleBlockData = {
    drawing_number: 'ISO-2001',
    sheet_number: '1',
    line_number: '6-CS-2003',
    material: 'CS',
    schedule: '40',
    spec: 'PU-32',
    nde_class: 'Class 1',
    pwht: false,
    revision: 'A',
    hydro: 'Required',
    insulation: 'H',
  };

  it('passes through clean values unchanged', () => {
    const result = normalizeTitleBlock(baseTitleBlock);
    expect(result).toEqual(baseTitleBlock);
  });

  it('nullifies generic no-data values across all string fields', () => {
    const dirty: TitleBlockData = {
      ...baseTitleBlock,
      drawing_number: 'N/A',
      sheet_number: 'none',
      line_number: '--',
      material: 'nil',
      schedule: '-',
      nde_class: '...',
      revision: 'NA',
    };
    const result = normalizeTitleBlock(dirty);
    expect(result.drawing_number).toBeNull();
    expect(result.sheet_number).toBeNull();
    expect(result.line_number).toBeNull();
    expect(result.material).toBeNull();
    expect(result.schedule).toBeNull();
    expect(result.nde_class).toBeNull();
    expect(result.revision).toBeNull();
  });

  it('applies insulation-specific patterns to insulation field', () => {
    const result = normalizeTitleBlock({ ...baseTitleBlock, insulation: 'N' });
    expect(result.insulation).toBeNull();
  });

  it('applies hydro-specific patterns to hydro field', () => {
    const result = normalizeTitleBlock({ ...baseTitleBlock, hydro: 'No' });
    expect(result.hydro).toBeNull();
  });

  it('does NOT apply insulation patterns to nde_class', () => {
    const result = normalizeTitleBlock({ ...baseTitleBlock, nde_class: 'N' });
    expect(result.nde_class).toBe('N'); // "N" is only no-data for insulation/hydro
  });

  it('applies both no-data cleanup and normalizeSpec to spec field', () => {
    const result = normalizeTitleBlock({ ...baseTitleBlock, spec: 'PU-32 CC0085888' });
    expect(result.spec).toBe('PU-32');
  });

  it('nullifies spec when it is a no-data value', () => {
    const result = normalizeTitleBlock({ ...baseTitleBlock, spec: 'N/A' });
    expect(result.spec).toBeNull();
  });

  it('preserves pwht boolean unchanged', () => {
    const resultTrue = normalizeTitleBlock({ ...baseTitleBlock, pwht: true });
    expect(resultTrue.pwht).toBe(true);
    const resultFalse = normalizeTitleBlock({ ...baseTitleBlock, pwht: false });
    expect(resultFalse.pwht).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they pass**

Run: `npx vitest run src/lib/csv/title-block-normalizer.test.ts`
Expected: PASS — all pattern tests and orchestration tests green

- [ ] **Step 3: Write the edge function title-block-normalizer**

```typescript
// supabase/functions/process-drawing/title-block-normalizer.ts

/**
 * Title block normalization layer for Gemini extraction results.
 *
 * Sits between Gemini extraction and DB storage. Converts "no data"
 * values to null so downstream code never sees false positives.
 *
 * Ported from TakeOffTrak (src/lib/ai-pipeline/title-block-normalizer.ts).
 * Patterns derived empirically from multiple real projects.
 *
 * Design principles:
 *  - Conservative: only nullifies values that CLEARLY mean "no data"
 *  - Field-specific: "N" → null for insulation/hydro, but NOT for nde_class
 */

import { normalizeSpec } from '../_shared/normalize-spec.ts';
import type { TitleBlockData } from './types.ts';

// ── Generic "no value" patterns (applied to ALL nullable string fields) ──
// Matches: n/a, na, none, nil, single dash, double+ dashes, dots
// NOTE: a single "-" IS treated as no-data. Some drawings use "-" to mean
// "standard/default" for fields like schedule, but those should be null
// (the template default applies).
const GENERIC_NO_VALUE = /^(n\/?a|none|nil|--?|-{2,}|\.+)$/i;

// ── Insulation-specific "no value" patterns ──
// Bare "N" = no insulation type
// Zero thickness variants: 0, 0.0, 0.00, 0", 0.0", 0.00" etc.
const INSULATION_NO_VALUE = /^(n|no|0(\.0+)?"?)$/i;

// ── Hydro-specific "no value" patterns ──
// Bare "N" or "No" = no hydro requirement
const HYDRO_NO_VALUE = /^(n|no)$/i;

function normalizeGeneric(value: string | null): string | null {
  if (value === null) return null;
  const trimmed = value.trim();
  if (trimmed === '') return null;
  if (GENERIC_NO_VALUE.test(trimmed)) return null;
  return trimmed;
}

function normalizeInsulation(value: string | null): string | null {
  if (value === null) return null;
  const trimmed = value.trim();
  if (trimmed === '') return null;
  if (GENERIC_NO_VALUE.test(trimmed)) return null;
  if (INSULATION_NO_VALUE.test(trimmed)) return null;
  return trimmed;
}

function normalizeHydro(value: string | null): string | null {
  if (value === null) return null;
  const trimmed = value.trim();
  if (trimmed === '') return null;
  if (GENERIC_NO_VALUE.test(trimmed)) return null;
  if (HYDRO_NO_VALUE.test(trimmed)) return null;
  return trimmed;
}

/**
 * Normalize all nullable string fields in a TitleBlockData result.
 * Pure function — no side effects, no I/O.
 *
 * Applied after Gemini extraction, before DB storage.
 * Spec field gets both no-value cleanup AND first-token normalization.
 */
export function normalizeTitleBlock(result: TitleBlockData): TitleBlockData {
  const spec = normalizeGeneric(result.spec);
  return {
    ...result,
    drawing_number: normalizeGeneric(result.drawing_number),
    sheet_number: normalizeGeneric(result.sheet_number),
    line_number: normalizeGeneric(result.line_number),
    material: normalizeGeneric(result.material),
    schedule: normalizeGeneric(result.schedule),
    spec: normalizeSpec(spec),
    nde_class: normalizeGeneric(result.nde_class),
    revision: normalizeGeneric(result.revision),
    insulation: normalizeInsulation(result.insulation),
    hydro: normalizeHydro(result.hydro),
  };
}
```

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/process-drawing/title-block-normalizer.ts src/lib/csv/title-block-normalizer.test.ts
git commit -m "feat: add title block no-data normalizer with tests"
```

---

### Task 4: Integrate into Title Block Reader

**Files:**
- Modify: `supabase/functions/process-drawing/title-block-reader.ts:130-152`

- [ ] **Step 1: Add import at top of file**

Add after the existing imports (line 2):

```typescript
import { normalizeTitleBlock } from './title-block-normalizer.ts';
```

- [ ] **Step 2: Replace manual spec stripping with normalizeTitleBlock()**

Replace lines 130-152 (from `// Coerce to typed TitleBlockData` through the `data` construction and return):

**Current code (lines 130-152):**
```typescript
  // Coerce to typed TitleBlockData with fallback defaults
  let spec = raw.spec != null ? String(raw.spec) : null;

  // Strip trailing project numbers from spec (e.g. "HC-05 12345678" → "HC-05")
  if (spec) {
    spec = spec.replace(/[\s-]+\d{6,}$/, '').trim() || spec;
  }

  const data: TitleBlockData = {
    ...EMPTY_TITLE_BLOCK,
    drawing_number: raw.drawing_number != null ? String(raw.drawing_number) : null,
    sheet_number: raw.sheet_number != null ? String(raw.sheet_number) : null,
    line_number: raw.line_number != null ? String(raw.line_number) : null,
    material: raw.material != null ? String(raw.material) : null,
    // Coerce to string — Gemini may return numbers for schedule
    schedule: raw.schedule != null ? String(raw.schedule) : null,
    spec,
    nde_class: raw.nde_class != null ? String(raw.nde_class) : null,
    pwht: raw.pwht === true,
    revision: raw.revision != null ? String(raw.revision) : null,
    hydro: raw.hydro != null ? String(raw.hydro) : null,
    insulation: raw.insulation != null ? String(raw.insulation) : null,
  };
```

**New code:**
```typescript
  // Coerce to typed TitleBlockData with fallback defaults
  const coerced: TitleBlockData = {
    ...EMPTY_TITLE_BLOCK,
    drawing_number: raw.drawing_number != null ? String(raw.drawing_number) : null,
    sheet_number: raw.sheet_number != null ? String(raw.sheet_number) : null,
    line_number: raw.line_number != null ? String(raw.line_number) : null,
    material: raw.material != null ? String(raw.material) : null,
    // Coerce to string — Gemini may return numbers for schedule
    schedule: raw.schedule != null ? String(raw.schedule) : null,
    spec: raw.spec != null ? String(raw.spec) : null,
    nde_class: raw.nde_class != null ? String(raw.nde_class) : null,
    pwht: raw.pwht === true,
    revision: raw.revision != null ? String(raw.revision) : null,
    hydro: raw.hydro != null ? String(raw.hydro) : null,
    insulation: raw.insulation != null ? String(raw.insulation) : null,
  };

  // Normalize: strip no-data values + first-token spec extraction
  const data = normalizeTitleBlock(coerced);
```

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/process-drawing/title-block-reader.ts
git commit -m "feat: integrate normalizeTitleBlock into title block reader"
```

---

### Task 5: Integrate `normalizeSpec()` into BOM Extractor

**Files:**
- Modify: `supabase/functions/process-drawing/bom-extractor.ts:1,321`

- [ ] **Step 1: Add import**

Add after line 2 (the `import type { BomItem }` line):

```typescript
import { normalizeSpec } from '../_shared/normalize-spec.ts';
```

- [ ] **Step 2: Apply normalizeSpec to BOM item spec field**

Change line 321 from:
```typescript
      spec: item.spec != null ? String(item.spec) : null,
```

To:
```typescript
      spec: normalizeSpec(item.spec != null ? String(item.spec) : null),
```

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/process-drawing/bom-extractor.ts
git commit -m "feat: normalize spec values in BOM extraction"
```

---

### Task 6: Integrate `normalizeSpec()` into CSV Import Pipeline

**Files:**
- Modify: `src/lib/csv/csv-validator.ts:12,163`
- Modify: `supabase/functions/import-takeoff/transaction.ts:321`
- Modify: `supabase/functions/import-takeoff/transaction-v2.ts:357`

- [ ] **Step 1: Add import to csv-validator.ts**

Add after line 13 (the `import { normalizeSize }` line) in `src/lib/csv/csv-validator.ts`:

```typescript
import { normalizeSpec } from './normalize-spec';
```

- [ ] **Step 2: Apply normalizeSpec in csv-validator.ts**

Change line 163 from:
```typescript
      spec: spec || undefined,
```

To:
```typescript
      spec: normalizeSpec(spec ?? null) || undefined,
```

Note: `spec` is `string | undefined` from `getFieldValue()`, but `normalizeSpec` accepts `string | null`. The `?? null` converts `undefined` to `null` at the call site.

- [ ] **Step 3: Add import to transaction.ts**

Add at top of `supabase/functions/import-takeoff/transaction.ts`:

```typescript
import { normalizeSpec } from '../_shared/normalize-spec.ts';
```

- [ ] **Step 4: Apply normalizeSpec in transaction.ts**

Change line 321 from:
```typescript
          spec: row.spec || '',
```

To:
```typescript
          spec: normalizeSpec(row.spec ?? null) || '',
```

- [ ] **Step 5: Add import to transaction-v2.ts**

Add at top of `supabase/functions/import-takeoff/transaction-v2.ts`:

```typescript
import { normalizeSpec } from '../_shared/normalize-spec.ts';
```

- [ ] **Step 6: Apply normalizeSpec in transaction-v2.ts**

Change line 357 from:
```typescript
          spec: row.spec || '',
```

To:
```typescript
          spec: normalizeSpec(row.spec ?? null) || '',
```

- [ ] **Step 7: Commit**

```bash
git add src/lib/csv/csv-validator.ts supabase/functions/import-takeoff/transaction.ts supabase/functions/import-takeoff/transaction-v2.ts
git commit -m "feat: normalize spec values in CSV takeoff import pipeline"
```

---

### Task 7: Run Full Test Suite + Type Check

**Files:** None (verification only)

- [ ] **Step 1: Run type check**

Run: `npx tsc -b`
Expected: No errors

- [ ] **Step 2: Run all tests**

Run: `npx vitest run`
Expected: All tests pass, including the new normalize-spec and title-block-normalizer tests

- [ ] **Step 3: Run lint**

Run: `npm run lint`
Expected: No errors

- [ ] **Step 4: Build**

Run: `npm run build`
Expected: Build succeeds

**Note on integration verification:** The spec calls for end-to-end pipeline verification (dirty drawing → clean DB values). This requires a deployed edge function and real Gemini calls, so it cannot be automated in CI. Manual verification should be done by uploading a test drawing with dirty spec/no-data values after the edge function is deployed and confirming the `drawings` and `components` tables have clean values.

---

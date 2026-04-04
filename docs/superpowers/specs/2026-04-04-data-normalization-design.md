# Data Normalization: Spec Cleanup & Title Block No-Data Handling

**Date**: 2026-04-04
**Branch**: feature/ai-drawing-import
**Status**: Design approved

## Problem

Two data quality gaps exist in the import pipeline:

1. **Spec values arrive with trailing contract codes** — e.g., `"PU-32 CC0085888"` instead of `"PU-32"`. This happens in both the AI drawing extraction (Gemini) and CSV material takeoff imports. The core spec is always the first whitespace-delimited token; everything after is a contract/commodity code that shouldn't be stored.

2. **Gemini returns false-positive "no data" values** — strings like `"N/A"`, `"none"`, `"nil"`, `"--"`, `"..."` for fields that should be `null`. Downstream code (progress calculations, exports, scope resolution) treats these as real values, causing incorrect displays and matching failures.

## Solution

### Part 1: Spec Normalization (`normalizeSpec`)

A shared utility that extracts the core spec code by taking the first whitespace-delimited token.

```typescript
export function normalizeSpec(raw: string | null): string | null {
  if (raw == null) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  return trimmed.split(/\s+/)[0].toUpperCase();
}
```

**Examples:**
| Input | Output |
|---|---|
| `"PU-32 CC0085888"` | `"PU-32"` |
| `"PU-32 CC"` | `"PU-32"` |
| `"PU-32"` | `"PU-32"` |
| `"  pu-22  "` | `"PU-22"` |
| `""` | `null` |
| `null` | `null` |

**Files:**
- `supabase/functions/_shared/normalize-spec.ts` — edge function copy (Deno)
- `src/lib/csv/normalize-spec.ts` — client-side copy (Vite)

Follows the established pattern of `normalize-drawing.ts` which exists in both locations.

### Part 2: Title Block No-Data Normalizer (`normalizeTitleBlock`)

A pure function that sits between Gemini extraction and DB storage. Converts "no data" strings to `null` so downstream code never sees false positives.

Ported from the battle-tested TakeOffTrak implementation (`src/lib/ai-pipeline/title-block-normalizer.ts`), which was derived empirically from multiple real projects.

**Patterns:**

```typescript
// Generic — applied to ALL nullable string fields
// Matches: n/a, na, none, nil, single dash, double+ dashes, dots
// NOTE: a single "-" IS treated as no-data. Some drawings use "-" to mean
// "standard/default" for fields like schedule, but those should be null
// (the template default applies).
const GENERIC_NO_VALUE = /^(n\/?a|none|nil|--?|-{2,}|\.+)$/i;

// Insulation-specific — bare "N", "No", zero thickness
const INSULATION_NO_VALUE = /^(n|no|0(\.0+)?"?)$/i;

// Hydro-specific — bare "N", "No"
const HYDRO_NO_VALUE = /^(n|no)$/i;
```

**Field mapping:**
| Field | Patterns Applied | Safety Note |
|---|---|---|
| `drawing_number` | Generic | Safe: pipeline falls back to filename-based extraction (`extractFilenameAsDrawingNo()` in `index.ts` line 121) if null |
| `sheet_number` | Generic | |
| `line_number` | Generic | |
| `material` | Generic | |
| `schedule` | Generic | |
| `spec` | Generic + `normalizeSpec()` | |
| `nde_class` | Generic | |
| `revision` | Generic | |
| `insulation` | Generic + Insulation-specific | |
| `hydro` | Generic + Hydro-specific | |
| `pwht` | Not affected (boolean) | |

**File:** `supabase/functions/process-drawing/title-block-normalizer.ts`

## Integration Points

### 1. AI Pipeline — Title Block (`title-block-reader.ts`)

Current flow:
```
Gemini → coerce types → strip trailing project numbers → return TitleBlockData
```

New flow:
```
Gemini → coerce types → normalizeTitleBlock() → return TitleBlockData
```

`normalizeTitleBlock()` replaces the existing project-number stripping logic (lines 131-135 of `title-block-reader.ts`). The existing regex `spec.replace(/[\s-]+\d{6,}$/, '')` handles both whitespace-separated AND hyphen-separated trailing digits (e.g., `"HC-05-12345678"`). The new `normalizeSpec()` first-token approach only splits on whitespace, so it would NOT catch hyphen-separated contract codes. However, hyphen-separated contract codes have not been observed in real data — contract codes always appear after a space. The existing regex is removed since `normalizeSpec()` handles the observed cases, but if hyphen-separated codes surface in the future, the regex can be re-added inside `normalizeTitleBlock()`.

### 1a. AI Pipeline — Drawing Record Insert/Update (`index.ts`)

The normalized `TitleBlockData` from step 1 flows directly into the `drawings` table at both the insert path (line 164-185) and update path (line 141-157). Fields affected: `spec`, `line_number`, `material`, `schedule`, `nde_class`, `revision`, `hydro`, `insulation`. Because `normalizeTitleBlock()` runs in `title-block-reader.ts` before the data reaches `index.ts`, all drawing record writes automatically receive clean values — no additional normalization calls needed in `index.ts`.

### 2. AI Pipeline — BOM Extractor (`bom-extractor.ts`)

Current (line 321):
```typescript
spec: item.spec != null ? String(item.spec) : null,
```

New:
```typescript
spec: normalizeSpec(item.spec != null ? String(item.spec) : null),
```

BOM items only get spec normalization, not the full title block no-data cleanup (BOM items have their own validation rules).

Normalizing at the BOM extraction boundary ensures all downstream consumers receive clean spec values: both the `drawing_bom_items` insert (Step 5 in `index.ts`) and component creation (Step 6, lines ~432/468/514 where `item.spec` flows into component attributes). No additional normalization calls needed in `index.ts`.

### 3. CSV Import — Takeoff Pipeline

Add `normalizeSpec()` at these specific locations:

- **Client-side preview**: `src/lib/csv/csv-validator.ts` line 163 — change `spec: spec || undefined` to `spec: normalizeSpec(spec) || undefined`
- **Server-side insert**: `supabase/functions/import-takeoff/transaction.ts` line 321 — change `spec: row.spec || ''` to `spec: normalizeSpec(row.spec) || ''`
- **Server-side v2 insert**: `supabase/functions/import-takeoff/transaction-v2.ts` line 357 — change `spec: row.spec || ''` to `spec: normalizeSpec(row.spec) || ''`

### 4. Client-Side Spec Normalizer (`src/lib/csv/normalize-spec.ts`)

Mirror of the edge function `normalizeSpec()` for the client-side CSV pipeline. Used by `csv-validator.ts` for preview normalization before submission.

## Pipeline Diagram

```
┌─────────────────────────────────────────────────────────┐
│  AI DRAWING IMPORT                                       │
│                                                          │
│  PDF → Gemini Vision                                     │
│         │                                                │
│         ├── Title Block ──→ normalizeTitleBlock()         │
│         │                    ├─ generic no-value cleanup  │
│         │                    ├─ field-specific cleanup    │
│         │                    └─ normalizeSpec() on spec   │
│         │                         │                      │
│         │                         ▼                      │
│         │                   CLEAN TitleBlockData → DB     │
│         │                                                │
│         └── BOM Items ───→ normalizeSpec() on each item  │
│                                 │                        │
│                                 ▼                        │
│                           CLEAN BomItem[] → DB           │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│  CSV MATERIAL TAKEOFF IMPORT                              │
│                                                          │
│  CSV → Papa Parse → Column Mapping → Validation          │
│                                          │               │
│                                    normalizeSpec()       │
│                                          │               │
│                                          ▼               │
│                                    CLEAN rows → DB       │
└──────────────────────────────────────────────────────────┘
```

## Scope

- **Forward-only**: No data migration for existing records
- **No Gemini prompt changes**: Code-level normalization is the deterministic safety net
- **No new database columns or migrations**: Normalization happens in application code before insert

## Testing

Unit tests for both normalizers, colocated with source:

**`normalize-spec.test.ts`:**
- First-token extraction with various trailing patterns
- Whitespace handling (leading, trailing, multiple spaces)
- Uppercase conversion
- Null/empty input handling
- Edge cases: single token (no-op), hyphenated specs

**`title-block-normalizer.test.ts`:**
- Generic no-value patterns (N/A, none, nil, dashes, dots)
- Single dash "-" treated as no-data
- Insulation-specific patterns (N, No, zero thickness)
- Hydro-specific patterns (N, No)
- Preservation of real values (H, C, P for insulation; Required for hydro)
- Spec field gets both no-value + first-token normalization
- Boolean pwht field unaffected

**Integration verification:**
- Process a test drawing through the full pipeline (`extractTitleBlock` → `normalizeTitleBlock` → drawing insert) and verify clean values reach the `drawings` table
- Process a BOM with dirty spec values and verify normalized specs on both `drawing_bom_items` and `components`

## Design Decisions

1. **First token, not regex pattern matching** — Spec formats vary by client/project. Taking the first token is simple and handles all formats without maintaining a spec pattern library.

2. **Two copies of normalizeSpec** — Deno edge functions can't import from `src/lib/`, and Vite client can't import from `supabase/functions/`. This matches the existing `normalize-drawing.ts` pattern.

3. **normalizeSpec replaces project-number stripping** — The existing `spec.replace(/[\s-]+\d{6,}$/, '')` in `title-block-reader.ts` handles both whitespace and hyphen-separated trailing digits. First-token extraction only handles whitespace separation, so it does NOT catch `"HC-05-12345678"`. However, hyphen-separated contract codes have not been observed in real data. If they surface, the regex can be re-added inside `normalizeTitleBlock()`.

4. **No-data normalizer is AI-pipeline only** — CSV imports have explicit column mapping and validation; users don't type "N/A" in spec fields. The no-data problem is Gemini-specific.

5. **Conservative patterns from TakeOffTrak** — Battle-tested across 5+ real projects. Only nullifies values that clearly mean "no data".

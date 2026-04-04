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
const GENERIC_NO_VALUE = /^(n\/?a|none|nil|--?|-{2,}|\.+)$/i;

// Insulation-specific — bare "N", "No", zero thickness
const INSULATION_NO_VALUE = /^(n|no|0(\.0+)?"?)$/i;

// Hydro-specific — bare "N", "No"
const HYDRO_NO_VALUE = /^(n|no)$/i;
```

**Field mapping:**
| Field | Patterns Applied |
|---|---|
| `drawing_number` | Generic |
| `sheet_number` | Generic |
| `line_number` | Generic |
| `material` | Generic |
| `schedule` | Generic |
| `spec` | Generic + `normalizeSpec()` |
| `nde_class` | Generic |
| `revision` | Generic |
| `insulation` | Generic + Insulation-specific |
| `hydro` | Generic + Hydro-specific |
| `pwht` | Not affected (boolean) |

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

`normalizeTitleBlock()` replaces the existing project-number stripping logic (line 134-136 of `title-block-reader.ts`), since first-token extraction via `normalizeSpec()` is a superset — it strips both project numbers and contract codes.

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

### 3. CSV Import — Takeoff Validator (`import-takeoff/validator.ts`)

Add `normalizeSpec()` call during validation, following the existing pattern of `normalizeDrawing()` and `normalizeSize()`. Applied when the CSV has a SPEC column.

### 4. Client-Side CSV Preview (`src/lib/csv/normalize-spec.ts`)

Mirror of the edge function `normalizeSpec()` for showing normalized spec values in the CSV import preview UI before submission.

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
- Insulation-specific patterns (N, No, zero thickness)
- Hydro-specific patterns (N, No)
- Preservation of real values (H, C, P for insulation; Required for hydro)
- Spec field gets both no-value + first-token normalization
- Boolean pwht field unaffected

## Design Decisions

1. **First token, not regex pattern matching** — Spec formats vary by client/project. Taking the first token is simple and handles all formats without maintaining a spec pattern library.

2. **Two copies of normalizeSpec** — Deno edge functions can't import from `src/lib/`, and Vite client can't import from `supabase/functions/`. This matches the existing `normalize-drawing.ts` pattern.

3. **normalizeSpec replaces project-number stripping** — The existing `spec.replace(/[\s-]+\d{6,}$/, '')` in `title-block-reader.ts` is a subset of first-token extraction. No need for both.

4. **No-data normalizer is AI-pipeline only** — CSV imports have explicit column mapping and validation; users don't type "N/A" in spec fields. The no-data problem is Gemini-specific.

5. **Conservative patterns from TakeOffTrak** — Battle-tested across 5+ real projects. Only nullifies values that clearly mean "no data".

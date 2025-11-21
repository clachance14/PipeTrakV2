# Identity Key Structures Reference

---
**⚠️ QUICK REFERENCE ONLY - Not the source of truth**

**Source of Truth**: `supabase/migrations/00010_component_tracking.sql` (validate_component_identity_key function)

**Last Synced**: Migration 00010 (Initial component tracking)

**When to Update**: After any migration that modifies `validate_component_identity_key()` function

**Auto-Update**: Run `npm run sync-skill-docs` after schema changes

**Verification**: The SKILL will always read migration files directly. If this reference conflicts with migrations, the migrations win.
---

## Component Type: `spool`

```json
{
  "spool_id": "string"
}
```

**Required Fields**: `spool_id` (string, non-empty)

**Example**: `{"spool_id": "SP-001"}`

---

## Component Type: `field_weld`

```json
{
  "weld_number": "string"
}
```

**Required Fields**: `weld_number` (string, non-empty)

**Example**: `{"weld_number": "W-1234"}`

---

## Component Type: `support` (Class-B)

```json
{
  "drawing_norm": "string",
  "commodity_code": "string",
  "size": "string",
  "seq": number
}
```

**Required Fields**:
- `drawing_norm` (string) - Drawing reference
- `commodity_code` (string) - **NOT `tag_number`!**
- `size` (string) - Component size
- `seq` (number) - Sequence number on drawing

**Example**: `{"drawing_norm": "P-001", "commodity_code": "CS-2", "size": "2IN", "seq": 1}`

**Common Mistake**: Using `tag_number` instead of `commodity_code` (see Migration 00055 bug)

---

## Class-B Components (Same Structure as `support`)

These component types all use the same 4-field identity structure:

- `valve`
- `fitting`
- `flange`
- `instrument`
- `tubing`
- `hose`
- `misc_component`

All require: `drawing_norm`, `commodity_code`, `size`, `seq` (number)

**Critical**: Use `commodity_code`, NOT `tag_number` for all Class-B components.

---

## Component Type: `threaded_pipe`

```json
{
  "drawing_norm": "string",
  "commodity_code": "string",
  "size": "string",
  "seq": "any"
}
```

**Note**: `seq` can be any JSON type for threaded_pipe (no type constraint, unlike other Class-B components)

---

## Quick Summary Table

| Component Type | Identity Structure | Key Fields |
|----------------|-------------------|------------|
| `spool` | Single key | `spool_id` (string) |
| `field_weld` | Single key | `weld_number` (string) |
| Class-B (9 types) | Composite (4 fields) | `drawing_norm`, `commodity_code`, `size`, `seq` (number) |
| `threaded_pipe` | Composite (4 fields) | `drawing_norm`, `commodity_code`, `size`, `seq` (any) |

**Class-B types**: support, valve, fitting, flange, instrument, tubing, hose, misc_component

---

## Validation

All identity keys are validated by the `validate_component_identity_key()` function in migration 00010.

Enforced by CHECK constraint: `chk_identity_key_structure`

**This means**: Invalid identity_key = PostgreSQL constraint violation error at insert time.

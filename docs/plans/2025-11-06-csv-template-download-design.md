# CSV Template Download Feature Design

**Date:** 2025-11-06
**Status:** Design Approved
**Related Feature:** 024 - Flexible CSV Import

## Overview

Add a downloadable CSV template to guide users in preparing material takeoff data for import. The template includes all supported import columns with asterisks marking mandatory fields, plus sample data rows showing component types, optional fields, and metadata usage.

## Problem Statement

Users attempting CSV imports currently have no reference for:
- Which columns are required vs. optional
- Proper column header naming (e.g., "DRAWING" vs "DWG NO")
- Valid data formats and component types
- How to use optional metadata fields (AREA, SYSTEM, TEST_PACKAGE)

This leads to trial-and-error CSV formatting and import validation errors.

## Design Goals

1. Create a self-documenting template marking mandatory fields with asterisks
2. Show realistic sample data for multiple component types
3. Demonstrate optional field usage patterns
4. Keep implementation simple and maintainable
5. Align with existing validation rules in `src/types/csv-import.types.ts`

## Architecture

### Implementation Approach: Static CSV File

**Selected approach:** Static CSV file in public directory

**Rationale:**
- Simplest implementation (no dynamic generation needed)
- Direct browser download via public path
- Easy to update manually if import format evolves
- No runtime performance impact
- Future enhancement option: migrate to dynamic generation if template logic becomes complex

**Alternatives considered:**
- Client-side generation: More complex, adds no value for this simple template
- Reusable utility + hook: Over-engineered for single-use case

### File Structure

```
public/
  templates/
    material-takeoff-template.csv    # Template file

src/
  components/
    ImportPage.tsx                    # Add download button
```

**Public path:** `/templates/material-takeoff-template.csv`

## Template Content Specification

### Column Headers

Mandatory fields marked with asterisk suffix:

```
DRAWING*,TYPE*,QTY*,CMDTY CODE*,SIZE,SPEC,DESCRIPTION,COMMENTS,AREA,SYSTEM,TEST_PACKAGE
```

**Mandatory fields (4):**
- `DRAWING*` - Drawing number (normalized to uppercase)
- `TYPE*` - Component type (must match valid types list)
- `QTY*` - Quantity (integer ≥ 1)
- `CMDTY CODE*` - Commodity code (identity key component)

**Optional standard fields (4):**
- `SIZE` - Nominal size (defaults to "NOSIZE" if empty)
- `SPEC` - Material specification code
- `DESCRIPTION` - Component description
- `COMMENTS` - Additional notes

**Optional metadata fields (3):**
- `AREA` - Area assignment (auto-creates if new)
- `SYSTEM` - System assignment (auto-creates if new)
- `TEST_PACKAGE` - Test package assignment (auto-creates if new)

### Sample Data Rows

Three example rows demonstrating:
1. Different component types (Pipe, Valve, Fitting)
2. Optional field usage (some populated, some empty)
3. Metadata examples (AREA, SYSTEM, TEST_PACKAGE)
4. Quantity explosion (QTY: 25, 2, 10)

**Row 1: Pipe with full metadata**
```
1001-P-001,Pipe,25,PIP-CS-150,6,A106-B,6" Carbon Steel Pipe,Shop fabricated,Area 100,Cooling Water,PKG-001
```

**Row 2: Valve with minimal optional fields**
```
1001-P-001,Valve,2,VLV-GATE-150,4,,,Field install,Area 100,,
```

**Row 3: Fitting with quantity explosion**
```
1002-P-005,Fitting,10,FTG-ELBOW-90,2,A234-WPB,90° Elbow 2",,Area 200,Process Gas,PKG-002
```

**Validation alignment:**
- Component types match `DEFAULT_VALIDATION_RULES.validTypes`
- Required fields present per `REQUIRED_FIELDS` constant
- Empty optional fields show they can be omitted
- Metadata values demonstrate auto-creation behavior

## UI Implementation

### Download Button Location

Add download button to `ImportPage.tsx` above the file upload dropzone.

**Visual hierarchy:**
1. Page header ("Import Material Takeoff")
2. **Download template link** ← NEW
3. File upload dropzone (primary action)
4. Validation/preview sections (post-upload)

### Component Code

```tsx
<div className="mb-4">
  <a
    href="/templates/material-takeoff-template.csv"
    download="material-takeoff-template.csv"
    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors"
  >
    <DownloadIcon className="h-4 w-4" />
    Download Template CSV
  </a>
  <p className="mt-2 text-sm text-muted-foreground">
    Download a template with sample data. Columns marked with * are required.
  </p>
</div>
```

**Design decisions:**
- Subtle styling (link style, not primary button) - doesn't compete with upload action
- Helper text explains asterisk convention
- `download` attribute forces browser download (not navigation)
- Lucide-react `Download` icon for visual clarity
- Hover states provide affordance feedback

### User Flow

1. User navigates to Import page (`/imports`)
2. Sees "Download Template CSV" link at top
3. Clicks link → browser downloads `material-takeoff-template.csv`
4. User opens template in Excel/Google Sheets
5. User edits sample rows or replaces with their own data
6. User saves modified CSV
7. User returns to import page and uploads their CSV
8. System validates against same column structure

## Implementation Tasks

1. Create `public/templates/` directory
2. Create `material-takeoff-template.csv` with specified content
3. Modify `src/components/ImportPage.tsx`:
   - Import `Download` icon from lucide-react
   - Add download button above file upload section
   - Add helper text explaining asterisk convention
4. Manual testing:
   - Verify CSV downloads correctly in Chrome, Firefox, Safari
   - Verify CSV opens properly in Excel and Google Sheets
   - Verify asterisks display correctly in headers
   - Verify sample data matches validation rules

## Testing Strategy

**Manual testing required:**
- Cross-browser download verification (Chrome, Firefox, Safari)
- CSV compatibility with Excel and Google Sheets
- Visual regression testing for button placement on ImportPage

**No automated tests needed:**
- Static file (no logic to test)
- Simple link element (covered by React Testing Library defaults)
- Future enhancement: E2E test for complete download → edit → upload workflow

## Future Enhancements

1. **Dynamic generation:** If template format evolves frequently, migrate to client-side generation synced with `REQUIRED_FIELDS` and `DEFAULT_VALIDATION_RULES` constants
2. **Multiple templates:** Add templates for field weld imports, NDE results, etc.
3. **Inline documentation:** Add a "Help" column with field descriptions (would need to be stripped during validation)
4. **Localization:** Support multiple languages for international projects

## Dependencies

- Existing validation constants in `src/types/csv-import.types.ts`
- Lucide-react `Download` icon
- Public directory serving (Vite default)

## Risks & Mitigations

**Risk:** Template becomes outdated if import validation rules change
**Mitigation:** Document template update as part of import feature change checklist

**Risk:** Users modify headers incorrectly (remove asterisks, change casing)
**Mitigation:** Flexible column mapper already handles synonyms and case-insensitivity (Feature 024)

**Risk:** Sample data contains invalid values after future rule changes
**Mitigation:** Include template validation in pre-deployment checklist

## Success Metrics

- Reduction in import validation errors (baseline TBD)
- User feedback on template helpfulness (qualitative)
- Decreased support requests for CSV formatting issues

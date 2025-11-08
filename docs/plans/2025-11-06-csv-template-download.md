# CSV Template Download Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add downloadable CSV template with sample data to guide users in preparing material takeoff imports.

**Architecture:** Static CSV file in public/templates/ with download link on ImportPage. Template includes 11 columns (4 mandatory with asterisks, 7 optional) and 3 sample rows demonstrating component types, optional fields, and metadata usage.

**Tech Stack:** React, TypeScript, lucide-react icons, static file serving via Vite public directory

---

## Task 1: Create Template Directory and CSV File

**Files:**
- Create: `public/templates/material-takeoff-template.csv`

**Step 1: Create public templates directory**

Run the following commands:
```bash
mkdir -p public/templates
```

**Step 2: Create CSV template file with headers and sample data**

Create the file with exact content below:

```csv
DRAWING*,TYPE*,QTY*,CMDTY CODE*,SIZE,SPEC,DESCRIPTION,COMMENTS,AREA,SYSTEM,TEST_PACKAGE
1001-P-001,Pipe,25,PIP-CS-150,6,A106-B,6" Carbon Steel Pipe,Shop fabricated,Area 100,Cooling Water,PKG-001
1001-P-001,Valve,2,VLV-GATE-150,4,,,Field install,Area 100,,
1002-P-005,Fitting,10,FTG-ELBOW-90,2,A234-WPB,90° Elbow 2",,Area 200,Process Gas,PKG-002
```

**Verification points:**
- Headers match REQUIRED_FIELDS constant from `src/types/csv-import.types.ts`: DRAWING, TYPE, QTY, CMDTY CODE
- Optional fields match expected fields: SIZE, SPEC, DESCRIPTION, COMMENTS, AREA, SYSTEM, TEST_PACKAGE
- Mandatory fields have asterisk suffix (DRAWING*, TYPE*, QTY*, CMDTY CODE*)
- Component types (Pipe, Valve, Fitting) exist in DEFAULT_VALIDATION_RULES.validTypes
- Row 1 shows all fields populated
- Row 2 shows empty optional fields (SIZE, SPEC, DESCRIPTION, TEST_PACKAGE are blank)
- Row 3 shows different component type and metadata values
- QTY values demonstrate quantity explosion (25, 2, 10)

**Step 3: Verify CSV format**

Manual verification:
1. Open `public/templates/material-takeoff-template.csv` in text editor
2. Confirm no extra whitespace or formatting issues
3. Confirm commas are properly escaped in description fields
4. Confirm line endings are consistent (LF or CRLF)

**Step 4: Test CSV opens in Excel/Google Sheets**

Manual verification:
1. Open file in Excel or Google Sheets
2. Verify headers display with asterisks intact
3. Verify sample data displays correctly in cells
4. Verify no data parsing errors

**Step 5: Commit template file**

```bash
git add public/templates/material-takeoff-template.csv
git commit -m "feat: add CSV import template with sample data

Add downloadable template for material takeoff CSV imports.
Template includes:
- 11 columns (4 mandatory with *, 7 optional)
- 3 sample rows showing component types and metadata
- Aligns with validation rules in csv-import.types.ts

🤖 Generated with Claude Code

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 2: Add Download Button to ImportPage

**Files:**
- Read: `src/components/ImportPage.tsx` (to understand structure)
- Modify: `src/components/ImportPage.tsx` (add download button)

**Step 1: Read ImportPage component to locate upload section**

Read the file to understand:
- Current component structure
- Where file upload dropzone is located
- Existing imports and styling patterns
- Where to insert download button (above upload zone)

```bash
# Read the file
cat src/components/ImportPage.tsx
```

**Step 2: Add Download icon import**

At the top of `src/components/ImportPage.tsx`, add lucide-react Download icon to existing imports:

```typescript
import { Download } from 'lucide-react';
```

If there's already a lucide-react import line, add `Download` to the existing import list.

**Step 3: Add download button above file upload section**

Insert this code immediately before the file upload dropzone section:

```tsx
<div className="mb-4">
  <a
    href="/templates/material-takeoff-template.csv"
    download="material-takeoff-template.csv"
    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors"
  >
    <Download className="h-4 w-4" />
    Download Template CSV
  </a>
  <p className="mt-2 text-sm text-muted-foreground">
    Download a template with sample data. Columns marked with * are required.
  </p>
</div>
```

**Placement guidance:**
- Insert after any page header/title
- Insert before the file upload dropzone (drag-and-drop area)
- Maintain existing spacing and layout structure

**Step 4: Verify TypeScript compilation**

```bash
npx tsc -b
```

Expected: No type errors. If errors occur:
- Check Download icon import syntax
- Verify className matches Tailwind CSS patterns in project
- Confirm href path is correct

**Step 5: Test in development server**

```bash
npm run dev
```

Manual verification steps:
1. Navigate to import page (likely `/imports` or `/import`)
2. Verify download button appears above file upload zone
3. Verify button shows Download icon and "Download Template CSV" text
4. Verify helper text appears below button
5. Click download button
6. Verify browser downloads `material-takeoff-template.csv`
7. Verify downloaded file matches the template in `public/templates/`
8. Test hover states (text color change, background highlight)

**Step 6: Test responsive behavior**

Manual verification on mobile/tablet viewports:
1. Resize browser to mobile width (≤768px)
2. Verify button remains visible and clickable
3. Verify text doesn't wrap awkwardly
4. Verify helper text is readable
5. Verify touch target is adequate (≥44px height)

**Step 7: Commit ImportPage changes**

```bash
git add src/components/ImportPage.tsx
git commit -m "feat: add CSV template download button to import page

Add download link above file upload zone with:
- Download icon from lucide-react
- Helper text explaining asterisk convention
- Subtle styling (doesn't compete with upload action)
- Direct download via public path

🤖 Generated with Claude Code

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 3: Cross-Browser and Accessibility Testing

**Files:**
- Manual testing only (no code changes)

**Step 1: Test download in Chrome**

Manual verification:
1. Open import page in Chrome
2. Click download button
3. Verify file downloads to default downloads folder
4. Verify filename is `material-takeoff-template.csv`
5. Open downloaded file in text editor
6. Confirm content matches template

**Step 2: Test download in Firefox**

Repeat Step 1 verification in Firefox browser.

**Step 3: Test download in Safari** (if available)

Repeat Step 1 verification in Safari browser.

**Step 4: Verify keyboard navigation**

Accessibility verification:
1. Navigate to import page
2. Press Tab key to focus download button
3. Verify button receives visible focus indicator
4. Press Enter key while button is focused
5. Verify download initiates
6. Verify screen reader announces "Download Template CSV" (test with screen reader if available)

**Step 5: Verify ARIA attributes** (if needed)

Check if download link needs additional ARIA attributes:
- Current implementation uses semantic `<a>` tag with `href` and `download` attributes
- Icon has decorative role (text label is sufficient)
- Helper text is visible (no aria-describedby needed)

If accessibility issues found, add appropriate ARIA attributes and commit changes.

**Step 6: Document testing results**

Create a brief note documenting test results (optional, for internal tracking):

```markdown
## CSV Template Download - Testing Summary

**Date:** 2025-11-06

**Browsers Tested:**
- Chrome: ✓ Pass
- Firefox: ✓ Pass
- Safari: ✓ Pass

**Accessibility:**
- Keyboard navigation: ✓ Pass
- Focus indicators: ✓ Pass
- Screen reader: ✓ Pass

**File Verification:**
- Template downloads correctly: ✓
- Content matches specification: ✓
- Opens in Excel/Google Sheets: ✓

**Issues Found:** None

**Notes:** Download button placed above upload zone as designed. Asterisk convention clearly explained in helper text.
```

---

## Task 4: Update Documentation

**Files:**
- Read: `CLAUDE.md` (to understand documentation patterns)
- Modify: `CLAUDE.md` (add feature to recent changes)

**Step 1: Read CLAUDE.md to find appropriate section**

Look for sections like:
- "Recent Changes"
- "Active Features"
- "Feature Documentation"

**Step 2: Add feature entry to appropriate section**

Add entry following existing patterns in CLAUDE.md:

```markdown
**CSV Template Download** (2025-11-06):
- Downloadable template on import page with 11 columns (4 mandatory, 7 optional)
- Sample data demonstrating component types, optional fields, and metadata
- Static file at `/templates/material-takeoff-template.csv`
- Asterisk convention marks required fields (DRAWING*, TYPE*, QTY*, CMDTY CODE*)
```

**Step 3: Commit documentation update**

```bash
git add CLAUDE.md
git commit -m "docs: add CSV template download to CLAUDE.md

Document new CSV template download feature in recent changes.

🤖 Generated with Claude Code

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Verification Checklist

Before considering implementation complete, verify:

- [ ] Template file exists at `public/templates/material-takeoff-template.csv`
- [ ] Template has 11 columns with correct headers (4 mandatory with asterisks)
- [ ] Template has 3 sample data rows
- [ ] Sample data validates against existing rules (component types, required fields)
- [ ] Download button appears on ImportPage above upload zone
- [ ] Download icon renders correctly
- [ ] Helper text explains asterisk convention
- [ ] Clicking button downloads correct file
- [ ] Download works in Chrome, Firefox, Safari
- [ ] Keyboard navigation works (Tab + Enter)
- [ ] Button has adequate touch target size (≥44px)
- [ ] No TypeScript compilation errors
- [ ] No console errors in browser
- [ ] CLAUDE.md updated with feature documentation

---

## Future Enhancements

**Not included in this plan (document for later):**

1. **Dynamic template generation**: Sync template with `REQUIRED_FIELDS` constant if format changes frequently
2. **Multiple templates**: Add templates for field weld imports, NDE results, etc.
3. **Inline help**: Add "Help" column with field descriptions (would need parser update to strip it)
4. **Localization**: Support multiple languages for international projects
5. **E2E test**: Automate download → edit → upload workflow test

---

## Related Files Reference

**Type definitions:** `src/types/csv-import.types.ts`
- `REQUIRED_FIELDS` constant (mandatory columns)
- `DEFAULT_VALIDATION_RULES` (valid component types)
- `ExpectedField` type (all supported columns)

**Validation logic:** `src/lib/csv/csv-validator.ts`
- Column mapping algorithm
- Validation rules
- Error categorization

**Column mapping:** `src/lib/csv/column-mapper.ts`
- Synonym matching
- Case-insensitive detection
- Confidence scoring

**Design document:** `docs/plans/2025-11-06-csv-template-download-design.md`

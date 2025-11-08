# CSV Template Download - Testing Checklist

**Feature:** CSV Template Download Button on Import Page
**Date Created:** 2025-11-06
**Implementation Plan:** `docs/plans/2025-11-06-csv-template-download.md` (Task 3)

---

## Overview

This document provides a comprehensive testing checklist for the CSV template download feature. It covers cross-browser testing, accessibility verification, and functional testing across different devices and environments.

---

## Pre-Testing Setup

**Files to Verify Exist:**
- [x] `/home/clachance14/projects/PipeTrak_V2/public/templates/material-takeoff-template.csv`
- [x] Download button implementation in `src/components/ImportPage.tsx`

**Environment:**
- Development server running: `npm run dev`
- Test URL: `http://localhost:5173/imports` (or wherever ImportPage is mounted)

---

## 1. Cross-Browser Testing

### 1.1 Google Chrome (Latest Stable)

**Test Steps:**
1. Open import page in Chrome
2. Locate the download button (should appear above file upload zone)
3. Click "Download Template CSV" button
4. Verify file downloads to default downloads folder
5. Verify filename is exactly `material-takeoff-template.csv`
6. Open downloaded file in text editor
7. Confirm content matches template specification

**Expected Results:**
- [ ] Button renders correctly with Download icon
- [ ] Helper text appears below button
- [ ] Click initiates download immediately
- [ ] Downloaded file has correct name
- [ ] File content has 11 columns with asterisks on required fields
- [ ] File has 3 sample data rows

**Issues Found:**
```
[Document any issues here]
```

---

### 1.2 Mozilla Firefox (Latest Stable)

**Test Steps:**
1. Repeat all steps from Chrome test
2. Note any Firefox-specific download dialog behavior

**Expected Results:**
- [ ] Button renders identically to Chrome
- [ ] Download behavior works correctly
- [ ] File integrity matches specification

**Issues Found:**
```
[Document any issues here]
```

---

### 1.3 Safari (macOS) - If Available

**Test Steps:**
1. Repeat all steps from Chrome test
2. Note any Safari-specific rendering or download behavior

**Expected Results:**
- [ ] Button renders correctly
- [ ] Download works on Safari
- [ ] File integrity preserved

**Issues Found:**
```
[Document any issues here]
```

---

### 1.4 Microsoft Edge (Latest Stable)

**Test Steps:**
1. Repeat all steps from Chrome test
2. Note any Edge-specific behavior

**Expected Results:**
- [ ] Button renders correctly
- [ ] Download functions properly
- [ ] File integrity maintained

**Issues Found:**
```
[Document any issues here]
```

---

## 2. Accessibility Testing

### 2.1 Keyboard Navigation

**Test Steps:**
1. Navigate to import page
2. Press `Tab` key repeatedly until download button receives focus
3. Verify visible focus indicator appears
4. Press `Enter` key while button is focused
5. Verify download initiates
6. Press `Tab` again to verify focus moves to next element

**Expected Results:**
- [ ] Button is reachable via Tab key
- [ ] Focus indicator is clearly visible (outline or ring)
- [ ] Enter key triggers download
- [ ] Focus order is logical (download button → upload zone)

**Issues Found:**
```
[Document any issues here]
```

---

### 2.2 Screen Reader Testing

**Screen Readers to Test (if available):**
- NVDA (Windows)
- JAWS (Windows)
- VoiceOver (macOS/iOS)
- TalkBack (Android)

**Test Steps:**
1. Enable screen reader
2. Navigate to import page
3. Tab to download button
4. Listen to announcement

**Expected Announcements:**
- "Download Template CSV, link" or similar
- Should identify element as clickable/actionable
- Should announce the full button text

**Expected Results:**
- [ ] Button is announced with clear label
- [ ] Element type (link/button) is conveyed
- [ ] Purpose is understandable from announcement alone
- [ ] Helper text is readable when focused/navigated to

**Issues Found:**
```
[Document any issues here]
```

---

### 2.3 ARIA Attributes Verification

**Automated Check (via browser dev tools):**
1. Inspect download button element
2. Verify semantic HTML structure

**Current Implementation:**
```tsx
<a
  href="/templates/material-takeoff-template.csv"
  download="material-takeoff-template.csv"
  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors"
>
  <Download className="h-4 w-4" />
  Download Template CSV
</a>
```

**Verification Points:**
- [x] Uses semantic `<a>` tag (not generic `<div>`)
- [x] Has `href` attribute (screen readers announce as link)
- [x] Has `download` attribute (triggers download behavior)
- [x] Icon is decorative (text label is sufficient)
- [x] Helper text is visible (no hidden aria-describedby needed)

**Additional ARIA Needed?**
- [ ] None required (semantic HTML is sufficient)
- [ ] Add `aria-label` if text needs clarification (unlikely)
- [ ] Add `aria-describedby` to reference helper text (optional enhancement)

**Issues Found:**
```
[Document any issues here]
```

---

### 2.4 Color Contrast

**Test with WCAG Contrast Checker:**
1. Use browser extension or online tool (e.g., WebAIM Contrast Checker)
2. Test button text color (`text-blue-600`) against background
3. Test hover state (`text-blue-700` on `bg-blue-50`)

**WCAG 2.1 AA Requirements:**
- Normal text: 4.5:1 minimum
- Large text (≥18pt or ≥14pt bold): 3:1 minimum

**Expected Results:**
- [ ] Default state meets 4.5:1 contrast ratio
- [ ] Hover state meets 4.5:1 contrast ratio
- [ ] Helper text (`text-muted-foreground`) meets 4.5:1 ratio

**Issues Found:**
```
[Document any issues here]
```

---

## 3. Responsive Design Testing

### 3.1 Mobile (≤768px)

**Test Devices/Viewports:**
- iPhone SE (375px width)
- iPhone 12/13 (390px width)
- Android phone (360px width)

**Test Steps:**
1. Resize browser to mobile width OR use device
2. Verify button remains visible and usable
3. Test touch interaction (tap button)
4. Measure touch target size (should be ≥44px per WCAG 2.1 AA)

**Expected Results:**
- [ ] Button text doesn't wrap awkwardly
- [ ] Icon and text remain aligned
- [ ] Helper text is readable
- [ ] Touch target is ≥44px in height
- [ ] Touch target is ≥44px in width (or full-width on mobile)
- [ ] Download works on mobile browsers

**Touch Target Measurement:**
```
Current CSS: px-4 py-2 (padding: 16px horizontal, 8px vertical)
Icon size: h-4 w-4 (16px)
Text size: text-sm (14px line-height ~20px)
Estimated height: 8px (top) + 20px (text) + 8px (bottom) = 36px

⚠️ Potential Issue: May not meet 44px minimum for touch targets
Recommendation: Consider increasing py-2 to py-3 (12px) for mobile
```

**Issues Found:**
```
[Document any issues here]
```

---

### 3.2 Tablet (768px - 1024px)

**Test Devices/Viewports:**
- iPad (768px width)
- iPad Pro (1024px width)

**Test Steps:**
1. Resize browser to tablet width OR use device
2. Verify layout adapts appropriately
3. Test touch interaction

**Expected Results:**
- [ ] Button scales appropriately for tablet
- [ ] Spacing is comfortable for touch
- [ ] No layout shifts or wrapping issues

**Issues Found:**
```
[Document any issues here]
```

---

### 3.3 Desktop (≥1024px)

**Test Resolutions:**
- 1280px width (common laptop)
- 1920px width (full HD)
- 2560px width (2K/4K)

**Test Steps:**
1. Test at various desktop resolutions
2. Verify button remains properly positioned
3. Test hover states

**Expected Results:**
- [ ] Button positioning is consistent
- [ ] Hover states work smoothly
- [ ] No unexpected layout shifts

**Issues Found:**
```
[Document any issues here]
```

---

## 4. File Content Verification

### 4.1 Template Structure

**Download and inspect template file:**

**Header Row:**
```
DRAWING*,TYPE*,QTY*,CMDTY CODE*,SIZE,SPEC,DESCRIPTION,COMMENTS,AREA,SYSTEM,TEST_PACKAGE
```

**Verification:**
- [x] 11 columns total
- [x] 4 mandatory fields with asterisks: DRAWING*, TYPE*, QTY*, CMDTY CODE*
- [x] 7 optional fields without asterisks: SIZE, SPEC, DESCRIPTION, COMMENTS, AREA, SYSTEM, TEST_PACKAGE
- [x] Headers match `REQUIRED_FIELDS` from `src/types/csv-import.types.ts`

---

### 4.2 Sample Data Rows

**Row 1 (All fields populated):**
```
1001-P-001,Pipe,25,PIP-CS-150,6,A106-B,6" Carbon Steel Pipe,Shop fabricated,Area 100,Cooling Water,PKG-001
```

**Verification:**
- [x] Valid component type: "Pipe"
- [x] All fields populated
- [x] Quantity demonstrates bulk entry (25)

**Row 2 (Sparse data - empty optional fields):**
```
1001-P-001,Valve,2,VLV-GATE-150,4,,,Field install,Area 100,,
```

**Verification:**
- [x] Valid component type: "Valve"
- [x] Empty fields: SPEC, DESCRIPTION, TEST_PACKAGE
- [x] Demonstrates optional field handling

**Row 3 (Different metadata):**
```
1002-P-005,Fitting,10,FTG-ELBOW-90,2,A234-WPB,90° Elbow 2",,Area 200,Process Gas,PKG-002
```

**Verification:**
- [x] Valid component type: "Fitting"
- [x] Different drawing, area, system, package
- [x] Empty COMMENTS field
- [x] Special character in DESCRIPTION (degree symbol: °)

---

### 4.3 Excel/Google Sheets Compatibility

**Test in Excel:**
1. Open `material-takeoff-template.csv` in Microsoft Excel
2. Verify columns display correctly
3. Verify no parsing errors

**Expected Results:**
- [ ] 11 columns recognized
- [ ] Asterisks display in headers
- [ ] Sample data displays in correct cells
- [ ] No "Text Import Wizard" errors
- [ ] Special characters (° symbol) render correctly

**Test in Google Sheets:**
1. Upload/import CSV to Google Sheets
2. Verify columns display correctly
3. Verify no parsing errors

**Expected Results:**
- [ ] 11 columns recognized
- [ ] Asterisks display in headers
- [ ] Sample data displays in correct cells
- [ ] No import errors

**Issues Found:**
```
[Document any issues here]
```

---

## 5. Integration Testing

### 5.1 Download → Edit → Upload Workflow

**Full User Journey Test:**
1. Navigate to import page
2. Click "Download Template CSV"
3. Open downloaded file in Excel/Google Sheets
4. Edit sample data (add new rows, modify values)
5. Save as CSV
6. Upload edited CSV to import page
7. Verify import preview shows expected data
8. Confirm import
9. Verify components created successfully

**Expected Results:**
- [ ] Template downloads successfully
- [ ] Template opens in spreadsheet software
- [ ] Users can edit and save as CSV
- [ ] Edited CSV uploads without errors
- [ ] Import validation passes
- [ ] Components create successfully

**Issues Found:**
```
[Document any issues here]
```

---

### 5.2 Template Alignment with Validation Rules

**Verify sample data passes validation:**
1. Upload unmodified template
2. Check import preview validation results

**Expected Results:**
- [ ] All 3 rows marked as valid
- [ ] No validation errors
- [ ] Column mappings detected correctly
- [ ] Component types recognized (Pipe, Valve, Fitting)

**Code Reference:**
- Validation rules: `src/lib/csv/csv-validator.ts`
- Column mapping: `src/lib/csv/column-mapper.ts`
- Type definitions: `src/types/csv-import.types.ts`

**Issues Found:**
```
[Document any issues here]
```

---

## 6. Performance Testing

### 6.1 Download Performance

**Test download speed:**
1. Click download button
2. Measure time from click to file appearing in downloads

**Expected Results:**
- [ ] Download starts immediately (<100ms)
- [ ] File size is minimal (~250 bytes)
- [ ] No server requests (static file)

**Verification:**
```bash
# Check file size
ls -lh public/templates/material-takeoff-template.csv
```

**Issues Found:**
```
[Document any issues here]
```

---

## 7. Visual Regression Testing

### 7.1 Button Appearance

**Visual Checklist:**
- [ ] Download icon renders correctly (arrow pointing down)
- [ ] Icon and text are properly aligned
- [ ] Spacing is consistent with design system
- [ ] Font weight is appropriate (font-medium)
- [ ] Color matches brand (text-blue-600)

### 7.2 Hover State

**Visual Checklist:**
- [ ] Text darkens on hover (text-blue-700)
- [ ] Background appears on hover (bg-blue-50)
- [ ] Transition is smooth (transition-colors)
- [ ] Cursor changes to pointer

### 7.3 Focus State

**Visual Checklist:**
- [ ] Focus ring appears when tabbed to
- [ ] Focus ring is visible against all backgrounds
- [ ] Focus ring meets WCAG visibility requirements

---

## 8. Edge Cases and Error Conditions

### 8.1 Missing Template File

**Simulation:**
1. Temporarily rename/delete `public/templates/material-takeoff-template.csv`
2. Click download button
3. Observe browser behavior

**Expected Results:**
- [ ] Browser shows 404 error (acceptable)
- [ ] No JavaScript errors in console
- [ ] Application remains functional

**Note:** This is a deployment issue, not a code issue. Document for deployment checklist.

---

### 8.2 Browser Download Blocking

**Test with download restrictions:**
1. Configure browser to ask where to save files
2. Click download button
3. Test canceling download dialog

**Expected Results:**
- [ ] Application handles cancel gracefully
- [ ] No JavaScript errors
- [ ] Can retry download

---

### 8.3 Multiple Rapid Clicks

**Stress Test:**
1. Click download button multiple times rapidly
2. Observe browser behavior

**Expected Results:**
- [ ] Multiple downloads queue (browser behavior)
- [ ] No UI freezing or errors
- [ ] All downloads complete successfully

---

## 9. Automated Verification (Where Possible)

### 9.1 TypeScript Compilation

**Command:**
```bash
npx tsc -b
```

**Expected Results:**
- [x] No type errors
- [x] Download icon import resolves correctly
- [x] href attribute type-checks

---

### 9.2 Linting

**Command:**
```bash
npm run lint
```

**Expected Results:**
- [x] No linting errors in ImportPage.tsx
- [x] No accessibility warnings (jsx-a11y rules)

---

### 9.3 File Existence Check

**Command:**
```bash
test -f public/templates/material-takeoff-template.csv && echo "✓ Template exists" || echo "✗ Template missing"
```

**Expected Results:**
- [x] Template file exists at correct path

---

## 10. Test Execution Summary

**Testing Date:** _______________
**Tester Name:** _______________
**Environment:** Development / Staging / Production

### Overall Results

**Cross-Browser:**
- Chrome: ☐ Pass ☐ Fail ☐ Not Tested
- Firefox: ☐ Pass ☐ Fail ☐ Not Tested
- Safari: ☐ Pass ☐ Fail ☐ Not Tested
- Edge: ☐ Pass ☐ Fail ☐ Not Tested

**Accessibility:**
- Keyboard Navigation: ☐ Pass ☐ Fail ☐ Not Tested
- Screen Reader: ☐ Pass ☐ Fail ☐ Not Tested
- Color Contrast: ☐ Pass ☐ Fail ☐ Not Tested

**Responsive Design:**
- Mobile: ☐ Pass ☐ Fail ☐ Not Tested
- Tablet: ☐ Pass ☐ Fail ☐ Not Tested
- Desktop: ☐ Pass ☐ Fail ☐ Not Tested

**File Content:**
- Template Structure: ☐ Pass ☐ Fail ☐ Not Tested
- Sample Data: ☐ Pass ☐ Fail ☐ Not Tested
- Spreadsheet Compatibility: ☐ Pass ☐ Fail ☐ Not Tested

**Integration:**
- Download → Edit → Upload: ☐ Pass ☐ Fail ☐ Not Tested
- Validation Alignment: ☐ Pass ☐ Fail ☐ Not Tested

### Critical Issues Found

```
[List any critical issues that block release]
```

### Non-Critical Issues Found

```
[List any minor issues or enhancements]
```

### Recommendations

```
[Any recommendations for improvement or follow-up work]
```

### Sign-Off

**Ready for Production:** ☐ Yes ☐ No ☐ With Conditions

**Conditions (if applicable):**
```
[List conditions that must be met before production deployment]
```

**Tester Signature:** _______________
**Date:** _______________

---

## Appendix A: Quick Reference

### File Locations
- Template: `/public/templates/material-takeoff-template.csv`
- Component: `/src/components/ImportPage.tsx`
- Implementation Plan: `/docs/plans/2025-11-06-csv-template-download.md`

### Testing URLs
- Dev Server: `http://localhost:5173/imports`
- Staging: (TBD)
- Production: (TBD)

### Related Documentation
- CSV Import Types: `src/types/csv-import.types.ts`
- Column Mapper: `src/lib/csv/column-mapper.ts`
- CSV Validator: `src/lib/csv/csv-validator.ts`

---

**Document Version:** 1.0
**Last Updated:** 2025-11-06
**Maintained By:** Development Team

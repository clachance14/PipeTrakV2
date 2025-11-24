# PDF Preview for All Exports - Design Document

**Date:** 2025-01-23
**Status:** Approved
**Related Feature:** 030-test-package-workflow (extends PDF export system)

## Problem Statement

Currently, PDF exports have inconsistent UX:
- Field Weld Report and Component Progress Report show previews before download
- Welder Summary Report and Package Workflow Report download immediately without preview
- Package Workflow PDF export hook lacks preview capability entirely

Users need a consistent preview-first experience across all PDF exports.

## Solution Overview

Implement preview-first PDF exports across all report types by:
1. Creating a reusable `usePDFPreviewState` hook for state management
2. Adding `generatePDFPreview` method to `usePackageWorkflowPDFExport`
3. Updating pages to use the preview pattern consistently
4. Removing legacy direct-download code paths

## Design

### 1. The `usePDFPreviewState` Hook

**Location:** `src/hooks/usePDFPreviewState.ts`

**Purpose:** Encapsulate preview state management and cleanup logic.

**API:**
```typescript
interface UsePDFPreviewStateReturn {
  previewState: {
    open: boolean;
    url: string | null;
    filename: string | null;
    blob: Blob | null;
  };
  openPreview: (blob: Blob, url: string, filename: string) => void;
  closePreview: () => void;
}
```

**Responsibilities:**
- Manage preview dialog open/closed state
- Store blob, URL, and filename for download
- Cleanup object URLs on close
- Cleanup object URLs on unmount

**Benefits:**
- Eliminates 30-40 lines of boilerplate per page
- Guarantees consistent cleanup behavior
- Single source of truth for preview state pattern

### 2. Hook Updates

**Update `usePackageWorkflowPDFExport`** to match the API of other PDF export hooks:

**Add `generatePDFBlob` helper:**
- Lazy loads @react-pdf/renderer
- Generates PDF blob from React component
- Returns `{ blob, filename }`

**Add `generatePDFPreview` method:**
- Calls `generatePDFBlob` internally
- Creates object URL from blob
- Returns `{ blob, url, filename }`
- Does NOT trigger download

**Keep `generatePDF` method:**
- Maintains backward compatibility
- Still triggers immediate download
- Will be phased out as pages migrate to preview

**Result:** All four PDF export hooks (`useFieldWeldPDFExport`, `useComponentProgressPDFExport`, `useWelderSummaryPDFExport`, `usePackageWorkflowPDFExport`) will have identical APIs.

### 3. Page Updates

**Pages to update:**
- `WelderSummaryReportPage.tsx` (line 48)
- `PackageDetailPage.tsx` (line 458)

**Migration steps for each page:**

1. Import `usePDFPreviewState` and `PDFPreviewDialog`
2. Initialize preview state hook
3. Change handler to call `generatePDFPreview` instead of `generatePDF`
4. Call `openPreview()` with the returned data
5. Add `<PDFPreviewDialog>` to JSX
6. Update button text to "Preview & Export PDF"
7. Remove success toast (dialog provides feedback)

**Before:**
```typescript
const handleExport = async () => {
  await generatePDF(data, projectName);
  toast.success('PDF downloaded successfully');
};
```

**After:**
```typescript
const { previewState, openPreview, closePreview } = usePDFPreviewState();

const handleExport = async () => {
  try {
    const { blob, url, filename } = await generatePDFPreview(data, projectName);
    openPreview(blob, url, filename);
  } catch (err) {
    toast.error('Failed to generate PDF');
  }
};

// In JSX:
<PDFPreviewDialog
  open={previewState.open}
  onClose={closePreview}
  previewUrl={previewState.url}
  blob={previewState.blob}
  filename={previewState.filename}
/>
```

### 4. Testing Strategy

**Unit Tests:**
- `usePDFPreviewState.test.tsx` - test state transitions and cleanup
- `usePackageWorkflowPDFExport.test.tsx` - verify `generatePDFPreview` returns correct shape

**Integration Tests:**
- Update page tests to verify dialog appears on export click
- Mock PDF hooks and verify no immediate download
- Verify cleanup on unmount

**Manual Testing:**
- Test all four PDF exports show preview
- Verify download works from preview dialog
- Verify cancel closes without downloading
- Verify cleanup (no memory leaks from object URLs)

### 5. Cleanup

**Remove legacy code:**
- Remove "Classic PDF Export" button from `FieldWeldReportTable.tsx` (line 162-170)
- This was a jsPDF fallback that's no longer needed

**Deprecation path:**
- Keep `generatePDF` method in hooks for now (no breaking changes)
- Phase out direct download usage over time
- Eventually remove `generatePDF` methods in future refactor

## Implementation Checklist

- [ ] Create `usePDFPreviewState` hook
- [ ] Add unit tests for `usePDFPreviewState`
- [ ] Add `generatePDFPreview` to `usePackageWorkflowPDFExport`
- [ ] Update tests for `usePackageWorkflowPDFExport`
- [ ] Update `WelderSummaryReportPage.tsx` to use preview
- [ ] Update `PackageDetailPage.tsx` to use preview
- [ ] Update page component tests
- [ ] Remove "Classic PDF Export" button from `FieldWeldReportTable.tsx`
- [ ] Manual testing across all four export types
- [ ] Update CLAUDE.md if needed

## Success Criteria

- ✅ All PDF exports show preview dialog before download
- ✅ Preview dialog shows actual PDF content
- ✅ Download from dialog works correctly
- ✅ Cancel closes dialog without downloading
- ✅ No memory leaks (object URLs properly cleaned up)
- ✅ Consistent UX across all report types
- ✅ Desktop-only constraint maintained (≥1024px)

## Non-Goals

- Mobile PDF export (remains disabled per CLAUDE.md)
- Customizable preview dialog UI
- Print from preview (future enhancement)
- Email from preview (future enhancement)

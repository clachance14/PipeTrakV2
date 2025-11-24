# PDF Customization Workflow Design

**Date:** 2025-01-23
**Status:** Implementation Complete (Core Infrastructure)
**Branch:** 030-test-package-workflow

## Overview

Adds PDF report customization workflow to existing PDF preview system, allowing users to customize report content, layout, and filtering before generating PDFs.

### Key Features

- **Modal-based editing** with tabbed interface (Content, Filtering, Customization, Layout)
- **Persistent preferences** using Zustand + localStorage
- **Iterative refinement** - edit settings from preview dialog, auto-regenerate PDF
- **14+ customization options** for Package Workflow Reports
- **Validation** - prevents invalid configurations
- **Desktop-only** - respects existing ≤1024px mobile breakpoint

---

## Architecture

### State Management (Separated Concerns Pattern)

**Layer 1: Persisted Preferences (Zustand Store)**
```typescript
// src/stores/usePackageWorkflowCustomizationStore.ts
interface PackageWorkflowPDFOptions {
  // Content Filtering - Package Info
  includePackageInfo: boolean;
  includeDescription: boolean;
  includeTestType: boolean;
  includeTargetDate: boolean;
  includeRequirements: boolean;

  // Content Filtering - Workflow Stages
  includeSkippedStages: boolean;
  showStageData: boolean;
  showSignOffs: boolean;

  // Custom Text
  customTitle?: string;
  customHeaderText?: string;
  customNotes?: string;

  // Layout Options
  viewMode: 'summary' | 'detailed';
  includeCompanyLogo: boolean;

  // Data Transformations
  stageStatusFilter: 'all' | 'completed' | 'in-progress' | 'not-started';
}

// Stored in localStorage: pipetrak:package-workflow-pdf-options
```

**Layer 2: Modal State (React Hook)**
```typescript
// src/hooks/usePackageWorkflowCustomization.ts
// Manages temp options until Save clicked
// Separates UI state from persisted data
```

**Layer 3: Preview State (React Hook)**
```typescript
// src/hooks/usePDFPreviewState.ts (enhanced)
// New: updatePreview() method for auto-regeneration
// Handles object URL lifecycle
```

### Component Structure

```
Package Detail Page
├── "Edit Report" Button
│   └── Opens PackageWorkflowCustomizationDialog
├── "Export PDF" Button
│   └── Generates PDF with saved preferences
│       └── Opens PDFPreviewDialog
│           └── "Edit Settings" Button (in preview)
│               └── Opens PackageWorkflowCustomizationDialog
│                   └── On Save: Auto-regenerates PDF
└── PackageWorkflowCustomizationDialog
    ├── Tabs (Content, Filtering, Customization, Layout)
    ├── Reset to Defaults
    ├── Cancel (discards changes)
    └── Save Settings (persists + closes)
```

---

## User Flows

### Flow 1: Direct Export (No Customization)
```
User clicks "Export PDF"
→ PDF generated with saved preferences (or defaults if first time)
→ Preview dialog opens
→ User clicks "Download" or "Edit Settings"
```

### Flow 2: Edit Then Export
```
User clicks "Edit Report"
→ Customization modal opens with current preferences
→ User modifies options (checkboxes, text inputs, etc.)
→ User clicks "Save Settings"
→ Modal closes, preferences saved to localStorage
→ User clicks "Export PDF"
→ PDF generated with new preferences
→ Preview dialog opens
```

### Flow 3: Iterative Refinement (Edit from Preview)
```
User clicks "Export PDF"
→ Preview dialog opens
→ User sees something to change
→ User clicks "Edit Settings" in preview footer
→ Customization modal opens (preview dims in background)
→ User modifies options
→ User clicks "Save Settings"
→ Modal closes back to preview
→ Loading overlay shows "Regenerating PDF with new settings..."
→ Preview automatically updates with new PDF
→ User reviews again (repeat edit cycle as needed)
→ User clicks "Download" when satisfied
```

---

## Implementation Details

### Core Files Created

1. **`src/stores/usePackageWorkflowCustomizationStore.ts`**
   - Zustand store with persist middleware
   - 14 customization options
   - `setOption()`, `setOptions()`, `resetToDefaults()` actions

2. **`src/hooks/usePackageWorkflowCustomization.ts`**
   - Modal state management (open/close/temp options)
   - Similar pattern to `usePDFPreviewState`
   - Temp state prevents accidental saves

3. **`src/utils/pdfFilters.ts`**
   - `applyStageFilters()` - filters stages by status, excludes skipped
   - `validatePDFOptions()` - prevents empty content, enforces text limits
   - `hasAnyContentEnabled()` - validation helper

4. **`src/components/packages/PackageWorkflowCustomizationDialog.tsx`**
   - Modal with 4 tabs (Content, Filtering, Customization, Layout)
   - Form validation before save
   - Character counters for text fields
   - Reset to defaults button

### Core Files Modified

5. **`src/hooks/usePackageWorkflowPDFExport.tsx`**
   - Added `options?: PackageWorkflowPDFOptions` parameter
   - Applies `applyStageFilters()` before PDF generation
   - Passes options to PDF component
   - Uses custom title in filename if provided

6. **`src/components/pdf/reports/PackageWorkflowReportPDF.tsx`**
   - Added `options?: PackageWorkflowPDFOptions` prop
   - Conditional rendering based on options
   - Custom title, header text, notes support
   - Show/hide package info fields
   - Show/hide stage data and sign-offs

7. **`src/components/reports/PDFPreviewDialog.tsx`**
   - Added `onEditSettings?: () => void` prop
   - Added `isRegenerating?: boolean` prop
   - "Edit Settings" button in footer (left side)
   - Loading overlay during regeneration
   - Disabled buttons during regeneration

8. **`src/hooks/usePDFPreviewState.ts`**
   - Added `updatePreview()` method
   - Cleans up old object URL before replacing
   - Keeps dialog open during update

---

## Integration Guide

### How to Wire Up in a Page

```typescript
// Example: PackageDetailPage.tsx (or wherever export button lives)
import { useState } from 'react';
import { usePackageWorkflowCustomizationStore } from '@/stores/usePackageWorkflowCustomizationStore';
import { usePackageWorkflowCustomization } from '@/hooks/usePackageWorkflowCustomization';
import { usePackageWorkflowPDFExport } from '@/hooks/usePackageWorkflowPDFExport';
import { usePDFPreviewState } from '@/hooks/usePDFPreviewState';
import { PackageWorkflowCustomizationDialog } from '@/components/packages/PackageWorkflowCustomizationDialog';
import { PDFPreviewDialog } from '@/components/reports/PDFPreviewDialog';
import { toast } from 'sonner';

export function PackageDetailPage() {
  // 1. Get options from store
  const { options, setOptions } = usePackageWorkflowCustomizationStore();

  // 2. Customization modal state
  const {
    customizationState,
    openCustomization,
    closeCustomization,
  } = usePackageWorkflowCustomization();

  // 3. PDF generation
  const { generatePDFPreview, isGenerating } = usePackageWorkflowPDFExport();

  // 4. Preview dialog state
  const { previewState, openPreview, updatePreview, closePreview } = usePDFPreviewState();

  // 5. Regeneration loading state
  const [isRegenerating, setIsRegenerating] = useState(false);

  // 6. Open customization modal (Edit Report button)
  const handleEditReport = () => {
    openCustomization(options);
  };

  // 7. Save customization (from modal)
  const handleSaveCustomization = async (newOptions: PackageWorkflowPDFOptions) => {
    // Save to store
    setOptions(newOptions);
    closeCustomization();

    // If preview is open, regenerate automatically
    if (previewState.open) {
      setIsRegenerating(true);
      try {
        const { blob, url, filename } = await generatePDFPreview(
          packageData,
          workflowStages,
          projectName,
          companyLogo,
          newOptions // Use new options
        );
        updatePreview(blob, url, filename); // Update existing preview
        toast.success('PDF regenerated with new settings');
      } catch (error) {
        toast.error('Failed to regenerate PDF');
        console.error(error);
      } finally {
        setIsRegenerating(false);
      }
    }
  };

  // 8. Export PDF (with current options)
  const handleExportPDF = async () => {
    try {
      const { blob, url, filename } = await generatePDFPreview(
        packageData,
        workflowStages,
        projectName,
        companyLogo,
        options // Use saved options
      );
      openPreview(blob, url, filename);
    } catch (error) {
      toast.error('Failed to generate PDF');
      console.error(error);
    }
  };

  // 9. Edit from preview
  const handleEditFromPreview = () => {
    openCustomization(options);
  };

  return (
    <div>
      {/* Desktop-only buttons (hidden on mobile ≤1024px) */}
      <div className="hidden lg:flex gap-2">
        <Button
          variant="outline"
          onClick={handleEditReport}
          disabled={isGenerating || isRegenerating}
        >
          Edit Report
        </Button>
        <Button
          onClick={handleExportPDF}
          disabled={isGenerating || isRegenerating}
        >
          {isGenerating ? 'Generating...' : 'Export PDF'}
        </Button>
      </div>

      {/* Customization Dialog */}
      <PackageWorkflowCustomizationDialog
        open={customizationState.isOpen}
        onClose={closeCustomization}
        onSave={handleSaveCustomization}
        initialOptions={customizationState.tempOptions || options}
      />

      {/* Preview Dialog */}
      <PDFPreviewDialog
        open={previewState.open}
        onClose={closePreview}
        previewUrl={previewState.url}
        blob={previewState.blob}
        filename={previewState.filename}
        onEditSettings={handleEditFromPreview}
        isRegenerating={isRegenerating}
      />
    </div>
  );
}
```

---

## Customization Options Reference

### Content Filtering - Package Information
- `includePackageInfo` (boolean) - Show/hide entire package info section
- `includeDescription` (boolean) - Show/hide description field
- `includeTestType` (boolean) - Show/hide test type field
- `includeTargetDate` (boolean) - Show/hide target date field
- `includeRequirements` (boolean) - Show/hide coating/insulation requirements

### Content Filtering - Workflow Stages
- `includeSkippedStages` (boolean) - Include or exclude skipped stages
- `showStageData` (boolean) - Show/hide stage-specific data fields
- `showSignOffs` (boolean) - Show/hide sign-off details

### Custom Text Fields
- `customTitle` (string, max 100 chars) - Override default report title
- `customHeaderText` (string, max 200 chars) - Additional header text
- `customNotes` (string, max 1000 chars) - Additional notes section at end

### Layout Options
- `viewMode` ('summary' | 'detailed') - Summary (titles+status) vs Detailed (all data)
- `includeCompanyLogo` (boolean) - Include or exclude company logo

### Data Transformations
- `stageStatusFilter` ('all' | 'completed' | 'in-progress' | 'not-started') - Filter stages by status

---

## Error Handling

### Validation Errors (Shown as Toast)
- **Empty content**: "At least one content section must be enabled"
- **Title too long**: "Custom title must be 100 characters or less"
- **Header too long**: "Custom header text must be 200 characters or less"
- **Notes too long**: "Custom notes must be 1000 characters or less"
- **No matching stages**: "No stages match the selected filters. Please adjust your settings."

### Generation Errors
- **Regeneration failure**: Preview stays open with old PDF, error toasted
- **localStorage failure**: Falls back to defaults, warning logged
- **Concurrent exports**: Prevents multiple simultaneous generations

### Edge Cases
- User unchecks ALL content sections → validation error (modal stays open)
- User closes modal without saving → temp options discarded
- User edits during regeneration → Edit button disabled
- Stages filtered to zero → friendly error thrown

---

## Testing Strategy

### Unit Tests (Required)

**Store Tests** (`usePackageWorkflowCustomizationStore.test.ts`)
- Loads default options on first use
- Persists options to localStorage
- Resets to defaults correctly
- Handles localStorage failures gracefully

**Filter Tests** (`pdfFilters.test.ts`)
- Filters stages by status correctly
- Excludes skipped stages when option disabled
- Throws error when no stages match filters
- Validates text field lengths correctly

**Hook Tests** (`usePackageWorkflowCustomization.test.ts`)
- Opens modal with initial options
- Closes modal and discards temp state
- Updates temp options correctly

### Integration Tests (Required)

**Customization Dialog Tests**
- Renders all 4 tabs correctly
- Calls onSave with updated options
- Resets to defaults when Reset clicked
- Discards changes when Cancel clicked

**Preview Dialog Tests**
- Shows Edit Settings button when onEditSettings provided
- Disables buttons during regeneration
- Shows loading overlay during regeneration

### End-to-End Test (Required)

**Complete Flow Test**
- User opens customization modal
- User toggles some options
- User saves and closes modal
- User generates PDF preview
- User clicks Edit Settings in preview
- User modifies more options
- User saves
- Preview regenerates automatically
- User downloads PDF

---

## Extending to Other Report Types

This workflow was prototyped for **Package Workflow Reports** but is designed to be reusable for other report types (Field Weld, Component Progress, Welder Summary).

### Steps to Extend

1. **Create report-specific options interface**
   ```typescript
   // Example: src/stores/useFieldWeldPDFCustomizationStore.ts
   interface FieldWeldPDFOptions {
     // Report-specific options
   }
   ```

2. **Create report-specific customization dialog**
   - Copy `PackageWorkflowCustomizationDialog.tsx`
   - Modify form fields for report-specific options

3. **Update export hook** to accept options parameter

4. **Update PDF component** to respect options

5. **Wire up in parent page** using integration guide above

### Reusable Components
- ✅ `PDFPreviewDialog` - Already supports all report types
- ✅ `usePDFPreviewState` - Already supports all report types
- ✅ `usePackageWorkflowCustomization` pattern - Copy for other reports

---

## Performance Considerations

- **Lazy loading** - `@react-pdf/renderer` already lazy-loaded (700KB-1.2MB)
- **No re-renders** - Zustand store updates don't trigger unnecessary re-renders
- **Cleanup** - Object URLs properly cleaned up (prevents memory leaks)
- **Validation** - Runs before regeneration (prevents wasted PDF generation)

---

## Browser Support

- **Modern browsers** - Requires ES2020+ (supported by Vite build target)
- **localStorage** - Required for persistence (gracefully degrades to defaults)
- **Object URLs** - Required for preview (no fallback needed)

---

## Future Enhancements (Out of Scope)

- **Per-package preferences** - Currently global per-report-type
- **URL state** - Shareable customized report links
- **Templates** - Save multiple customization presets
- **Batch export** - Export multiple packages with same settings
- **Preview thumbnails** - Show preview before full generation
- **Undo/Redo** - In customization dialog

---

## Summary

**Status**: ✅ Core infrastructure complete
**Remaining**: Wire up in PackagesPage + tests + find export button location

**Files Created**: 4
**Files Modified**: 4
**Total Lines**: ~1,200

**Next Steps**:
1. Find Package Workflow export button location
2. Wire up using integration guide above
3. Write unit tests (store, filters, validation)
4. Write integration tests (modal, preview dialog)
5. Write E2E test (complete flow)
6. Apply pattern to other report types (Field Weld, Component Progress, Welder Summary)

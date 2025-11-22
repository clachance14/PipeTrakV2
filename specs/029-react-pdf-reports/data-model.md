# Phase 1: Data Model & Component Flow

**Feature**: Advanced Report Generation with Component-Based PDF Library
**Date**: 2025-01-21
**Status**: Complete

## Overview

This document defines the data structures, component interfaces, and data flow for the PDF generation system. All types are TypeScript strict mode compatible with explicit null handling.

---

## Data Entities

### 1. PDF Component Props

**Purpose**: Define interfaces for all PDF components to ensure type safety

#### BrandedHeaderProps
```typescript
interface BrandedHeaderProps {
  // Optional company logo (base64 encoded image)
  logo?: string;

  // Report title (e.g., "PipeTrak Field Weld Progress Report")
  title: string;

  // Optional subtitle for additional context
  subtitle?: string;

  // Project name from ProjectContext
  projectName: string;

  // Report dimension label (e.g., "Area", "System", "Welder")
  dimensionLabel: string;

  // ISO date string for generation timestamp
  generatedDate: string;
}
```

**Validation Rules**:
- `title` must be non-empty string
- `logo` if provided must be valid base64 string or URL
- `generatedDate` must be valid ISO 8601 date string

---

#### ReportFooterProps
```typescript
interface ReportFooterProps {
  // Optional company information or disclaimers
  companyInfo?: string;

  // Whether to show page numbers (default: true)
  showPageNumbers?: boolean;
}
```

**Notes**:
- Page numbers use render prop: `render={({ pageNumber, totalPages }) => ...}`
- Company info appears in bottom-left, page numbers in bottom-right

---

#### PageLayoutProps
```typescript
interface PageLayoutProps {
  // Page size (A4, Letter, Legal)
  size?: 'A4' | 'LETTER' | 'LEGAL';

  // Page orientation
  orientation: 'portrait' | 'landscape';

  // Whether to show header (default: true)
  showHeader?: boolean;

  // Whether to show footer (default: true)
  showFooter?: boolean;

  // Header component props
  headerProps?: BrandedHeaderProps;

  // Footer component props
  footerProps?: ReportFooterProps;

  // Content to render between header and footer
  children: React.ReactNode;
}
```

**Default Values**:
- `size`: 'A4'
- `showHeader`: true
- `showFooter`: true

---

#### TableColumnDefinition
```typescript
interface TableColumnDefinition {
  // Unique key matching data field
  key: string;

  // Display label for column header
  label: string;

  // Column width as percentage (e.g., '40%', '20%')
  width: string;

  // Text alignment
  align?: 'left' | 'center' | 'right';

  // Data format type for rendering
  format?: 'text' | 'number' | 'percentage' | 'decimal';
}
```

**Example**:
```typescript
const columns: TableColumnDefinition[] = [
  { key: 'name', label: 'Area', width: '40%', align: 'left', format: 'text' },
  { key: 'totalWelds', label: 'Total Welds', width: '20%', align: 'right', format: 'number' },
  { key: 'ndePassRate', label: 'NDE Pass Rate', width: '20%', align: 'right', format: 'percentage' },
];
```

---

#### TableProps
```typescript
interface TableProps {
  // Column definitions
  columns: TableColumnDefinition[];

  // Data rows (generic object matching column keys)
  data: Record<string, string | number | null>[];

  // Optional grand total row
  grandTotal?: Record<string, string | number | null>;

  // Whether grand total has special styling
  highlightGrandTotal?: boolean;
}
```

**Validation Rules**:
- All `data` objects must have keys matching `columns[].key`
- `grandTotal` if provided must have keys matching `columns[].key`
- Null values are allowed and formatted as "-" or empty string

---

#### FieldWeldReportPDFProps
```typescript
interface FieldWeldReportPDFProps {
  // Report data from useFieldWeldProgressReport hook
  reportData: FieldWeldReportData;

  // Project name for header
  projectName: string;

  // Report dimension (area, system, test_package, welder)
  dimension: FieldWeldGroupingDimension;

  // Generation date as formatted string
  generatedDate: string;

  // Optional company logo (base64 encoded)
  companyLogo?: string;
}
```

**Data Source**: `useFieldWeldProgressReport` hook (existing TanStack Query hook)

**Existing Type** (from src/types/reports.ts):
```typescript
interface FieldWeldReportData {
  dimension: FieldWeldGroupingDimension;
  rows: FieldWeldProgressRow[];
  grandTotal: FieldWeldGrandTotalRow;
  generatedAt: Date;
  projectId: string;
}
```

---

### 2. PDF Export Hook State

**Purpose**: Manage PDF generation lifecycle in React hook

#### useFieldWeldPDFExportReturn
```typescript
interface useFieldWeldPDFExportReturn {
  // Function to trigger PDF generation
  generatePDF: (
    data: FieldWeldReportData,
    projectName: string,
    dimension: FieldWeldGroupingDimension,
    companyLogo?: string
  ) => Promise<Blob>;

  // Loading state during PDF generation
  isGenerating: boolean;

  // Error state if generation fails
  error: Error | null;
}
```

**State Transitions**:
```
idle → generating → (success | error) → idle
```

**Error Handling**:
- Network errors during lazy load: Show toast "Failed to load PDF library. Please check your connection and try again."
- Data errors (missing required fields): Show toast "Invalid report data. Please refresh and try again."
- Generation errors: Show toast "Failed to generate PDF. Please try again or contact support."

---

## Data Flow Diagrams

### PDF Export Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│ User clicks "Export PDF (Enhanced)" button (ReportsPage.tsx)       │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│ useFieldWeldPDFExport.generatePDF() called                         │
│ - Sets isGenerating = true                                          │
│ - Triggers button loading spinner                                   │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│ Lazy load @react-pdf/renderer (dynamic import)                     │
│ - First time: Downloads ~700KB library                              │
│ - Subsequent times: Uses cached module                              │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│ Lazy load FieldWeldReportPDF component                             │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│ Render PDF component tree:                                          │
│   <Document>                                                         │
│     <Page orientation="landscape">                                   │
│       <BrandedHeader logo={...} title={...} />                      │
│       <Table columns={...} data={...} grandTotal={...} />           │
│       <ReportFooter />                                               │
│     </Page>                                                          │
│   </Document>                                                        │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│ Generate PDF blob: pdf(<FieldWeldReportPDF ... />).toBlob()        │
│ - Converts React components to PDF primitives                       │
│ - Returns Blob object                                                │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│ Trigger browser download:                                           │
│ - Create object URL from blob                                        │
│ - Create temporary <a> element                                       │
│ - Set download attribute with filename                               │
│ - Click programmatically                                             │
│ - Clean up object URL                                                │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│ Cleanup:                                                             │
│ - Set isGenerating = false                                           │
│ - Show success toast                                                 │
│ - User sees download in browser                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Component Data Flow

```
┌────────────────────────────────────────────────────────────────┐
│ ReportsPage (src/pages/ReportsPage.tsx)                       │
│                                                                 │
│ Data Sources:                                                   │
│ - useFieldWeldProgressReport() → FieldWeldReportData           │
│ - useProject() → selectedProjectId                              │
│ - projects → currentProject.name                                │
│                                                                 │
│ State:                                                          │
│ - fieldWeldDimension: FieldWeldGroupingDimension               │
└────────────────────────────┬───────────────────────────────────┘
                             │
                             │ Pass to hook
                             ▼
┌────────────────────────────────────────────────────────────────┐
│ useFieldWeldPDFExport (src/hooks/useFieldWeldPDFExport.ts)    │
│                                                                 │
│ Input:                                                          │
│ - data: FieldWeldReportData                                     │
│ - projectName: string                                           │
│ - dimension: FieldWeldGroupingDimension                         │
│ - companyLogo?: string                                          │
│                                                                 │
│ Output:                                                         │
│ - generatePDF: async function                                   │
│ - isGenerating: boolean                                         │
│ - error: Error | null                                           │
└────────────────────────────┬───────────────────────────────────┘
                             │
                             │ Lazy load & pass props
                             ▼
┌────────────────────────────────────────────────────────────────┐
│ FieldWeldReportPDF (src/components/pdf/reports/...)           │
│                                                                 │
│ Props:                                                          │
│ - reportData: FieldWeldReportData                               │
│ - projectName: string                                           │
│ - dimension: FieldWeldGroupingDimension                         │
│ - generatedDate: string                                         │
│ - companyLogo?: string                                          │
│                                                                 │
│ Transforms:                                                     │
│ - reportData.rows → TableProps.data                             │
│ - reportData.grandTotal → TableProps.grandTotal                 │
│ - Formats dates, percentages, nulls                             │
└────────────────────────────┬───────────────────────────────────┘
                             │
                             │ Compose layout
                             ▼
┌────────────────────────────────────────────────────────────────┐
│ PageLayout (src/components/pdf/layout/PageLayout.tsx)         │
│                                                                 │
│ Children:                                                       │
│ - BrandedHeader                                                 │
│ - Table                                                         │
│ - ReportFooter                                                  │
└────────────────────────────┬───────────────────────────────────┘
                             │
                             │ Render primitives
                             ▼
┌────────────────────────────────────────────────────────────────┐
│ @react-pdf/renderer primitives                                 │
│                                                                 │
│ - Document                                                      │
│ - Page                                                          │
│ - View (flexbox containers)                                     │
│ - Text (text content)                                           │
│ - Image (logo)                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Data Transformations

### 1. Field Weld Report Data → Table Props

**Input** (from `FieldWeldReportData`):
```typescript
{
  dimension: 'area',
  rows: [
    {
      id: 'area-1',
      name: 'North Section',
      totalWelds: 150,
      fitupCount: 120,
      weldCompleteCount: 100,
      acceptedCount: 90,
      ndePassRate: 85.5,
      repairRate: 10.2,
      pctTotal: 60.0,
      // ...other fields
    }
  ],
  grandTotal: {
    name: 'Grand Total',
    totalWelds: 500,
    // ...aggregated values
  }
}
```

**Output** (TableProps):
```typescript
{
  columns: [
    { key: 'name', label: 'Area', width: '40%', align: 'left', format: 'text' },
    { key: 'totalWelds', label: 'Total Welds', width: '10%', align: 'right', format: 'number' },
    { key: 'fitupCount', label: 'Fit-up', width: '10%', align: 'right', format: 'number' },
    { key: 'weldCompleteCount', label: 'Weld Complete', width: '10%', align: 'right', format: 'number' },
    { key: 'acceptedCount', label: 'Accepted', width: '10%', align: 'right', format: 'number' },
    { key: 'ndePassRate', label: 'NDE Pass Rate', width: '10%', align: 'right', format: 'percentage' },
    { key: 'repairRate', label: 'Repair Rate', width: '10%', align: 'right', format: 'percentage' },
    { key: 'pctTotal', label: '% Complete', width: '10%', align: 'right', format: 'percentage' },
  ],
  data: [
    {
      name: 'North Section',
      totalWelds: 150,
      fitupCount: 120,
      weldCompleteCount: 100,
      acceptedCount: 90,
      ndePassRate: 85.5,
      repairRate: 10.2,
      pctTotal: 60.0,
    }
  ],
  grandTotal: {
    name: 'Grand Total',
    totalWelds: 500,
    // ...aggregated values
  },
  highlightGrandTotal: true
}
```

**Transformation Logic**:
```typescript
function transformToTableProps(
  reportData: FieldWeldReportData,
  dimension: FieldWeldGroupingDimension
): TableProps {
  const baseColumns: TableColumnDefinition[] = [
    { key: 'name', label: getDimensionLabel(dimension), width: '40%', align: 'left', format: 'text' },
    { key: 'totalWelds', label: 'Total Welds', width: '10%', align: 'right', format: 'number' },
    { key: 'fitupCount', label: 'Fit-up', width: '10%', align: 'right', format: 'number' },
    { key: 'weldCompleteCount', label: 'Weld Complete', width: '10%', align: 'right', format: 'number' },
    { key: 'acceptedCount', label: 'Accepted', width: '10%', align: 'right', format: 'number' },
    { key: 'ndePassRate', label: 'NDE Pass Rate', width: '10%', align: 'right', format: 'percentage' },
    { key: 'repairRate', label: 'Repair Rate', width: '10%', align: 'right', format: 'percentage' },
    { key: 'pctTotal', label: '% Complete', width: '10%', align: 'right', format: 'percentage' },
  ];

  // Add welder-specific columns if dimension is 'welder'
  if (dimension === 'welder') {
    baseColumns.push(
      { key: 'firstPassAcceptanceRate', label: 'First Pass Rate', width: '10%', align: 'right', format: 'percentage' },
      { key: 'avgDaysToAcceptance', label: 'Avg Days to Accept', width: '10%', align: 'right', format: 'decimal' }
    );
  }

  return {
    columns: baseColumns,
    data: reportData.rows.map(row => ({
      name: row.name,
      totalWelds: row.totalWelds,
      fitupCount: row.fitupCount,
      weldCompleteCount: row.weldCompleteCount,
      acceptedCount: row.acceptedCount,
      ndePassRate: row.ndePassRate,
      repairRate: row.repairRate,
      pctTotal: row.pctTotal,
      ...(dimension === 'welder' && {
        firstPassAcceptanceRate: row.firstPassAcceptanceRate,
        avgDaysToAcceptance: row.avgDaysToAcceptance,
      }),
    })),
    grandTotal: {
      name: reportData.grandTotal.name,
      totalWelds: reportData.grandTotal.totalWelds,
      fitupCount: reportData.grandTotal.fitupCount,
      weldCompleteCount: reportData.grandTotal.weldCompleteCount,
      acceptedCount: reportData.grandTotal.acceptedCount,
      ndePassRate: reportData.grandTotal.ndePassRate,
      repairRate: reportData.grandTotal.repairRate,
      pctTotal: reportData.grandTotal.pctTotal,
      ...(dimension === 'welder' && {
        firstPassAcceptanceRate: reportData.grandTotal.firstPassAcceptanceRate,
        avgDaysToAcceptance: reportData.grandTotal.avgDaysToAcceptance,
      }),
    },
    highlightGrandTotal: true,
  };
}
```

### 2. Data Formatting Functions

**Purpose**: Format values according to column format type

```typescript
function formatCellValue(
  value: string | number | null,
  format: 'text' | 'number' | 'percentage' | 'decimal'
): string {
  if (value === null) return '-';

  switch (format) {
    case 'text':
      return String(value);

    case 'number':
      return typeof value === 'number' ? value.toFixed(0) : String(value);

    case 'percentage':
      return typeof value === 'number' ? `${value.toFixed(1)}%` : String(value);

    case 'decimal':
      return typeof value === 'number' ? value.toFixed(1) : String(value);

    default:
      return String(value);
  }
}
```

---

## State Management

### ReportsPage Component State

**Existing State** (no changes needed):
- `selectedProjectId` - from `useProject()` context
- `fieldWeldDimension` - from URL params or useState
- `fieldWeldReportData` - from `useFieldWeldProgressReport()` hook
- `currentProject` - derived from projects array

**New State** (from useFieldWeldPDFExport hook):
- `isGenerating` - boolean, controlled by hook
- `error` - Error | null, controlled by hook

**State Updates**:
```
User Action: Click "Export PDF (Enhanced)"
└─> isGenerating: false → true
    └─> Button shows spinner, disabled
        └─> PDF generation (2-5 seconds)
            └─> Success: isGenerating: true → false
                └─> Button returns to normal, shows success toast
            OR
            └─> Error: isGenerating: true → false, error set
                └─> Button returns to normal, shows error toast
```

---

## Validation Rules

### Input Validation

1. **Report Data**:
   - Must have at least 1 row (check `reportData.rows.length > 0`)
   - All numeric fields must be finite numbers
   - Percentage fields must be 0-100 range
   - Grand total must exist

2. **Project Name**:
   - Must be non-empty string
   - Max length: 100 characters (for filename)
   - Sanitized for filename (remove / \ ? % * : | " < >)

3. **Company Logo** (optional):
   - If provided, must be valid base64 string or URL
   - Max size: 50KB recommended (check blob size)
   - Supported formats: PNG, JPG

### Error States

**Handled Errors**:
- Empty report data → Show message "No data available" in PDF
- Missing project name → Use "Unknown Project"
- Invalid logo → Skip logo rendering, continue with report
- Network error during lazy load → Show toast, retry allowed
- PDF generation error → Show toast, retry allowed

**Unhandled Errors** (fail fast):
- Malformed report data (missing required fields)
- Invalid dimension value
- Corrupt blob data

---

## Performance Considerations

### Memory Management

- **Blob cleanup**: Always call `URL.revokeObjectURL()` after download
- **Component unmount**: Cancel in-flight PDF generation if user navigates away
- **Large datasets**: Reports with 100+ rows may take 5-10 seconds, ensure loading state persists

### Caching

- **Library caching**: @react-pdf/renderer cached by browser after first load
- **No data caching**: Always use fresh data from TanStack Query
- **Logo caching**: If logo is static, consider localStorage cache (future enhancement)

---

## Next Steps

1. **Generate TypeScript interfaces** → contracts/pdf-components.ts
2. **Create quickstart guide** → quickstart.md
3. **Update agent context** → Run update-agent-context.sh
4. **Begin implementation** → tasks.md (via /speckit.tasks)

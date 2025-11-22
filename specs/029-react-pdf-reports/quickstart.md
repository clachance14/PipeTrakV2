# Quickstart: PDF Component Library

**Feature**: Advanced Report Generation with Component-Based PDF Library
**For**: Developers implementing or extending PDF generation in PipeTrak V2
**Date**: 2025-01-21

---

## Overview

This guide helps you get started with the PDF component library built on @react-pdf/renderer. You'll learn how to generate PDFs, create new report types, and extend existing components.

**What you'll learn**:
- How to export field weld reports to PDF
- How to create custom PDF reports
- How to style PDF components
- How to test PDF generation

---

## Prerequisites

- Node.js 18+ installed
- Familiarity with React 18 and TypeScript
- Understanding of existing PipeTrak report data structures (`FieldWeldReportData`)

---

## Installation

The @react-pdf/renderer library is included in package.json:

```bash
npm install
```

**Important**: @react-pdf/renderer is lazy-loaded only when users click export. It does **not** add to the initial bundle size.

---

## Basic Usage: Export Field Weld Report

### 1. Import the Hook

```typescript
import { useFieldWeldPDFExport } from '@/hooks/useFieldWeldPDFExport';
```

### 2. Use in Your Component

```typescript
function ReportsPage() {
  const { data: reportData } = useFieldWeldProgressReport({
    projectId: '123',
    dimension: 'area'
  });

  const { generatePDF, isGenerating, error } = useFieldWeldPDFExport();

  const handleExport = async () => {
    if (!reportData) return;

    try {
      await generatePDF(
        reportData,
        'My Project',
        'area',
        undefined // optional company logo (base64)
      );

      toast.success('PDF downloaded successfully');
    } catch (err) {
      toast.error('Failed to generate PDF');
    }
  };

  return (
    <div className="hidden lg:flex gap-2">
      <Button onClick={handleExport} disabled={isGenerating}>
        {isGenerating ? 'Generating...' : 'Export PDF (Enhanced)'}
      </Button>
    </div>
  );
}
```

**Key Points**:
- `generatePDF()` returns a Promise that resolves when download starts
- Hook manages loading state (`isGenerating`) and errors
- Button hidden on mobile/tablet (`hidden lg:flex`)
- PDF library loads dynamically on first export

---

## Project Structure

```text
src/components/pdf/
├── layout/
│   ├── BrandedHeader.tsx       # Company logo + report title
│   ├── ReportFooter.tsx        # Page numbers + footer text
│   └── PageLayout.tsx          # Page wrapper (header + content + footer)
├── tables/
│   ├── TableHeader.tsx         # Table header row
│   ├── TableRow.tsx            # Table body row
│   └── Table.tsx               # Complete table (header + rows + total)
├── reports/
│   └── FieldWeldReportPDF.tsx  # Field weld report document
├── styles/
│   └── commonStyles.ts         # Shared PDF styles
└── index.ts                    # Barrel exports

src/hooks/
└── useFieldWeldPDFExport.tsx   # Lazy-loading export hook

src/types/
└── pdf-components.ts           # TypeScript interfaces
```

---

## Creating a New Report Type

### Step 1: Define TypeScript Contract

Add your report props to `src/types/pdf-components.ts`:

```typescript
export interface MyCustomReportPDFProps {
  /** Your report data */
  reportData: MyReportData;

  /** Project name for header */
  projectName: string;

  /** Generation date */
  generatedDate: string;

  /** Optional company logo */
  companyLogo?: string;
}
```

### Step 2: Create Report Component

Create `src/components/pdf/reports/MyCustomReportPDF.tsx`:

```typescript
import { Document, Page, View, Text } from '@react-pdf/renderer';
import { BrandedHeader } from '../layout/BrandedHeader';
import { ReportFooter } from '../layout/ReportFooter';
import { Table } from '../tables/Table';
import { commonStyles } from '../styles/commonStyles';
import type { MyCustomReportPDFProps } from '@/types/pdf-components';

export function MyCustomReportPDF({
  reportData,
  projectName,
  generatedDate,
  companyLogo
}: MyCustomReportPDFProps) {
  return (
    <Document>
      <Page size="A4" orientation="landscape" style={commonStyles.page}>
        <BrandedHeader
          logo={companyLogo}
          title="My Custom Report"
          projectName={projectName}
          dimensionLabel="Custom Dimension"
          generatedDate={generatedDate}
        />

        <View style={{ marginTop: 20 }}>
          <Table
            columns={[
              { key: 'name', label: 'Name', width: '40%', align: 'left' },
              { key: 'value', label: 'Value', width: '30%', align: 'right', format: 'number' },
              { key: 'status', label: 'Status', width: '30%', align: 'center' }
            ]}
            data={reportData.rows}
            grandTotal={reportData.grandTotal}
          />
        </View>

        <ReportFooter showPageNumbers={true} />
      </Page>
    </Document>
  );
}
```

### Step 3: Create Export Hook

Create `src/hooks/useMyCustomPDFExport.ts`:

```typescript
import { useState } from 'react';
import type { MyReportData } from '@/types/reports';

export const useMyCustomPDFExport = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const generatePDF = async (
    data: MyReportData,
    projectName: string,
    companyLogo?: string
  ): Promise<Blob> => {
    setIsGenerating(true);
    setError(null);

    try {
      // Lazy load @react-pdf/renderer
      const { pdf } = await import('@react-pdf/renderer');
      const { MyCustomReportPDF } = await import('@/components/pdf/reports/MyCustomReportPDF');

      const generatedDate = new Date().toISOString().split('T')[0];

      // Generate PDF blob
      const blob = await pdf(
        <MyCustomReportPDF
          reportData={data}
          projectName={projectName}
          generatedDate={generatedDate}
          companyLogo={companyLogo}
        />
      ).toBlob();

      // Trigger download
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${sanitizeFilename(projectName)}_custom_report_${generatedDate}.pdf`;
      link.click();
      URL.revokeObjectURL(url);

      return blob;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      throw error;
    } finally {
      setIsGenerating(false);
    }
  };

  return { generatePDF, isGenerating, error };
};

function sanitizeFilename(name: string): string {
  return name.replace(/[/\\?%*:|"<>]/g, '_');
}
```

### Step 4: Use in Component

```typescript
import { useMyCustomPDFExport } from '@/hooks/useMyCustomPDFExport';

function MyReportPage() {
  const { generatePDF, isGenerating } = useMyCustomPDFExport();

  const handleExport = async () => {
    await generatePDF(myData, 'Project Name');
  };

  return (
    <Button onClick={handleExport} disabled={isGenerating}>
      Export Custom Report
    </Button>
  );
}
```

---

## Styling PDF Components

### Using Common Styles

Import and use shared styles from `src/components/pdf/styles/commonStyles.ts`:

```typescript
import { commonStyles } from '../styles/commonStyles';

<View style={commonStyles.headerRow}>
  <Text style={commonStyles.title}>My Title</Text>
</View>
```

### Creating Component-Specific Styles

Use @react-pdf/renderer's StyleSheet API:

```typescript
import { StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginBottom: 10,
    padding: 8,
    backgroundColor: '#f8fafc', // slate-50
    borderRadius: 4,
  },

  label: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#334155', // slate-700
    width: '40%',
  },

  value: {
    fontSize: 10,
    color: '#475569', // slate-600
    width: '60%',
    textAlign: 'right',
  }
});

<View style={styles.container}>
  <Text style={styles.label}>Total:</Text>
  <Text style={styles.value}>42</Text>
</View>
```

**Supported CSS Features**:
- ✅ Flexbox (full support)
- ✅ Colors, backgrounds, opacity
- ✅ Borders, border-radius
- ✅ Margins, padding
- ✅ Text styling (fontSize, fontWeight, textAlign, lineHeight)
- ✅ Transforms (rotate, scale, translate)
- ❌ Grid layout (use flexbox instead)
- ❌ CSS-in-JS libraries (styled-components, emotion)
- ❌ Tailwind CSS classes (use StyleSheet API)

**Project Colors** (from commonStyles.ts):
- Header background: `#334155` (slate-700)
- Header text: `#ffffff` (white)
- Body text: `#475569` (slate-600)
- Subtle text: `#64748b` (slate-500)
- Background: `#f8fafc` (slate-50)

---

## Working with Tables

### Basic Table

```typescript
import { Table } from '@/components/pdf/tables/Table';

<Table
  columns={[
    { key: 'name', label: 'Name', width: '50%', align: 'left' },
    { key: 'count', label: 'Count', width: '25%', align: 'right', format: 'number' },
    { key: 'percent', label: 'Percent', width: '25%', align: 'right', format: 'percentage' }
  ]}
  data={[
    { name: 'Row 1', count: 42, percent: 0.85 },
    { name: 'Row 2', count: 18, percent: 0.95 }
  ]}
  grandTotal={{ name: 'Total', count: 60, percent: 0.90 }}
  highlightGrandTotal={true}
/>
```

### Column Formats

- `text` (default): Plain string
- `number`: Formatted with commas (e.g., `1,234`)
- `percentage`: Multiplied by 100, 1 decimal (e.g., `85.0%`)
- `decimal`: 2 decimal places (e.g., `3.14`)

### Column Widths

Use percentage strings to ensure consistent layout:

```typescript
const columns: TableColumnDefinition[] = [
  { key: 'name', label: 'Name', width: '40%' },      // Wide column for text
  { key: 'value1', label: 'Value 1', width: '15%' }, // Narrow column for numbers
  { key: 'value2', label: 'Value 2', width: '15%' }, // Narrow column for numbers
  { key: 'value3', label: 'Value 3', width: '15%' }, // Narrow column for numbers
  { key: 'value4', label: 'Value 4', width: '15%' }  // Narrow column for numbers
];
// Total: 100%
```

**Standard Widths** (from `FIELD_WELD_COLUMN_WIDTHS`):
- Name/label column: 40%
- Numeric columns: 10%
- Welder-specific columns: 10%

---

## Testing PDF Components

### Unit Tests (Fast)

Mock @react-pdf/renderer to test component rendering without generating actual PDFs:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { MyCustomReportPDF } from '@/components/pdf/reports/MyCustomReportPDF';

vi.mock('@react-pdf/renderer', () => ({
  Document: ({ children }: any) => <div data-testid="pdf-document">{children}</div>,
  Page: ({ children }: any) => <div data-testid="pdf-page">{children}</div>,
  View: ({ children }: any) => <div data-testid="pdf-view">{children}</div>,
  Text: ({ children }: any) => <span data-testid="pdf-text">{children}</span>,
  StyleSheet: { create: (styles: any) => styles }
}));

describe('MyCustomReportPDF', () => {
  it('renders without crashing', () => {
    const { getByTestId } = render(
      <MyCustomReportPDF
        reportData={mockData}
        projectName="Test Project"
        generatedDate="2025-01-21"
      />
    );

    expect(getByTestId('pdf-document')).toBeInTheDocument();
  });

  it('displays project name in header', () => {
    const { getByText } = render(
      <MyCustomReportPDF
        reportData={mockData}
        projectName="Test Project"
        generatedDate="2025-01-21"
      />
    );

    expect(getByText('Test Project')).toBeInTheDocument();
  });
});
```

### Integration Tests (Slow)

Test actual PDF generation with real @react-pdf/renderer:

```typescript
import { describe, it, expect } from 'vitest';
import { pdf } from '@react-pdf/renderer';
import { MyCustomReportPDF } from '@/components/pdf/reports/MyCustomReportPDF';

describe('MyCustomReportPDF Integration', () => {
  it('generates a valid PDF blob', async () => {
    const blob = await pdf(
      <MyCustomReportPDF
        reportData={mockData}
        projectName="Test Project"
        generatedDate="2025-01-21"
      />
    ).toBlob();

    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe('application/pdf');
    expect(blob.size).toBeGreaterThan(0);
    expect(blob.size).toBeLessThan(500 * 1024); // <500KB
  });

  it('generates PDFs for all dimensions', async () => {
    const dimensions = ['area', 'system', 'test_package', 'welder'];

    for (const dimension of dimensions) {
      const blob = await pdf(
        <MyCustomReportPDF reportData={mockDataForDimension(dimension)} ... />
      ).toBlob();

      expect(blob.size).toBeGreaterThan(0);
    }
  });
});
```

### Hook Tests

Test the export hook behavior:

```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { useMyCustomPDFExport } from '@/hooks/useMyCustomPDFExport';

describe('useMyCustomPDFExport', () => {
  it('manages loading state during generation', async () => {
    const { result } = renderHook(() => useMyCustomPDFExport());

    expect(result.current.isGenerating).toBe(false);

    const promise = result.current.generatePDF(mockData, 'Test Project');

    expect(result.current.isGenerating).toBe(true);

    await waitFor(() => expect(result.current.isGenerating).toBe(false));
  });

  it('handles errors gracefully', async () => {
    const { result } = renderHook(() => useMyCustomPDFExport());

    await expect(
      result.current.generatePDF(null as any, 'Test')
    ).rejects.toThrow();

    expect(result.current.error).toBeDefined();
  });
});
```

---

## Performance Best Practices

### 1. Lazy Load the Library

Always use dynamic imports to avoid bundle bloat:

```typescript
// ✅ Good
const { pdf } = await import('@react-pdf/renderer');

// ❌ Bad
import { pdf } from '@react-pdf/renderer'; // Adds 700KB-1.2MB to bundle
```

### 2. Optimize Large Reports

For reports with 100+ rows, consider pagination:

```typescript
function MyLargeReportPDF({ data }: Props) {
  const ROWS_PER_PAGE = 50;
  const pages = chunk(data.rows, ROWS_PER_PAGE);

  return (
    <Document>
      {pages.map((pageRows, index) => (
        <Page key={index} size="A4" orientation="landscape">
          <BrandedHeader {...headerProps} />
          <Table columns={columns} data={pageRows} />
          <ReportFooter />
        </Page>
      ))}
    </Document>
  );
}
```

### 3. Optimize Images

Company logos should be:
- Base64 encoded (not URL)
- PNG or JPEG format
- <50KB file size (compressed)
- Max dimensions: 200x100px

```typescript
// ✅ Good
const logo = 'data:image/png;base64,iVBORw0KGgoAAAANSU...'; // <50KB

// ❌ Bad
const logo = 'https://example.com/huge-logo.png'; // External URL, slow
```

### 4. Test Performance

Verify generation time meets requirements:

```typescript
it('generates PDF in under 5 seconds', async () => {
  const start = Date.now();

  await pdf(<MyReportPDF data={largeDataset} ... />).toBlob();

  const duration = Date.now() - start;
  expect(duration).toBeLessThan(5000); // <5 seconds
});
```

---

## Common Pitfalls

### 1. Missing Read Before Edit

**Error**: `File has not been read yet`

**Fix**: Always read files before editing:

```typescript
// ✅ Good
const content = await Read({ file_path: '/path/to/file.tsx' });
await Edit({ file_path: '/path/to/file.tsx', old_string: '...', new_string: '...' });

// ❌ Bad
await Edit({ file_path: '/path/to/file.tsx', ... }); // Fails without prior Read
```

### 2. Using Tailwind Classes in PDFs

**Error**: Styles not applied in PDF

**Fix**: Use @react-pdf/renderer StyleSheet API:

```typescript
// ❌ Bad (Tailwind doesn't work in PDFs)
<View className="flex flex-col gap-2">

// ✅ Good
const styles = StyleSheet.create({
  container: { display: 'flex', flexDirection: 'column', gap: 8 }
});
<View style={styles.container}>
```

### 3. Forgetting Desktop-Only Constraint

**Error**: Export button visible on mobile

**Fix**: Hide on mobile using Tailwind responsive classes:

```typescript
// ✅ Good
<div className="hidden lg:flex gap-2">
  <Button onClick={handleExport}>Export PDF</Button>
</div>

// ❌ Bad
<Button onClick={handleExport}>Export PDF</Button>
```

### 4. Not Handling Loading States

**Error**: Button remains clickable during generation

**Fix**: Disable button and show loading indicator:

```typescript
// ✅ Good
const { generatePDF, isGenerating } = useFieldWeldPDFExport();

<Button onClick={handleExport} disabled={isGenerating}>
  {isGenerating ? 'Generating...' : 'Export PDF'}
</Button>

// ❌ Bad
<Button onClick={handleExport}>Export PDF</Button>
```

---

## Reference

### Key Files

- **Type Definitions**: `src/types/pdf-components.ts`
- **Data Model**: `specs/029-react-pdf-reports/data-model.md`
- **Research**: `specs/029-react-pdf-reports/research.md`
- **Components**: `src/components/pdf/`
- **Hooks**: `src/hooks/useFieldWeldPDFExport.tsx`
- **Utilities**: `src/lib/pdfUtils.ts`

### External Documentation

- @react-pdf/renderer API: https://react-pdf.org/components
- @react-pdf/renderer Styling: https://react-pdf.org/styling
- @react-pdf/renderer Examples: https://react-pdf.org/repl

### Coverage Targets

- Overall: ≥70%
- `src/lib/**`: ≥80%
- `src/components/**`: ≥60%

---

## Getting Help

**Common Questions**:
1. "How do I add a new column to the field weld report?"
   - See `data-model.md` for column definitions
   - Update `TableColumnDefinition` arrays
   - Regenerate types if needed

2. "How do I change the page orientation?"
   - Update `<Page orientation="landscape" | "portrait">`
   - Adjust column widths for new layout

3. "How do I test PDF generation without downloading?"
   - Use integration tests with `pdf().toBlob()`
   - Inspect blob size and type
   - No need for actual file download in tests

4. "Why is my PDF generation slow?"
   - Check report size (100+ rows may need pagination)
   - Optimize images (use compressed base64)
   - Profile with `Date.now()` timing

**Need More Help?**
- Review existing field weld report implementation: `src/components/pdf/reports/FieldWeldReportPDF.tsx`
- Check test examples: `tests/components/pdf/FieldWeldReportPDF.test.tsx`
- Consult data model: `specs/029-react-pdf-reports/data-model.md`

---

**Last Updated**: 2025-01-21
**Feature Version**: 029-react-pdf-reports
**Library Version**: @react-pdf/renderer v4.3.1

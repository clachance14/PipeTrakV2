# PDF Generation - Claude Context

Component-based PDF generation using @react-pdf/renderer for professional report export.

**Parent CLAUDE.md has**: Top 10 rules, testing patterns, and architecture overview.

---

## Component Library

```
src/components/pdf/
├── layout/
│   ├── BrandedHeader.tsx       # Company logo + report title + metadata
│   ├── ReportFooter.tsx        # Page numbers + footer text
│   └── PageLayout.tsx          # Page wrapper with header + content + footer
├── tables/
│   ├── TableHeader.tsx         # Table header row with column definitions
│   ├── TableRow.tsx            # Table body row with formatting by column type
│   └── Table.tsx               # Complete table (header + rows + grand total)
├── reports/
│   └── FieldWeldReportPDF.tsx  # Field weld report document
├── styles/
│   └── commonStyles.ts         # Shared PDF styles (colors, typography, layout)
└── index.ts                    # Barrel exports
```

---

## Critical Rules

### Lazy Loading (MANDATORY)

@react-pdf/renderer is 700KB-1.2MB. Always use dynamic imports:

```typescript
// Hook implementation uses dynamic imports:
const { pdf } = await import('@react-pdf/renderer');
const { FieldWeldReportPDF } = await import('@/components/pdf/reports/FieldWeldReportPDF');

// NEVER top-level import - breaks bundle
// import { pdf } from '@react-pdf/renderer'; // DON'T
```

### Desktop-Only

PDF export buttons must be hidden on mobile (<=1024px):

```typescript
<div className="hidden lg:flex gap-2">
  <Button onClick={handleExport}>Export PDF</Button>
</div>
```

---

## Usage

```typescript
import { useFieldWeldPDFExport } from '@/hooks/useFieldWeldPDFExport';
import { toast } from 'sonner';

const { generatePDF, isGenerating } = useFieldWeldPDFExport();

const handleExport = async () => {
  try {
    await generatePDF(reportData, 'Project Name', 'area', companyLogoBase64);
    toast.success('PDF downloaded successfully');
  } catch { toast.error('Failed to generate PDF'); }
};
```

---

## Testing

**Unit Tests** (fast - mock @react-pdf/renderer):
```typescript
vi.mock('@react-pdf/renderer', () => ({
  Document: ({ children }: any) => <div data-testid="pdf-document">{children}</div>,
  Page: ({ children }: any) => <div data-testid="pdf-page">{children}</div>,
  View: ({ children }: any) => <div data-testid="pdf-view">{children}</div>,
  Text: ({ children }: any) => <span data-testid="pdf-text">{children}</span>,
  StyleSheet: { create: (styles: any) => styles }
}));
```

**Integration Tests** (slow - real renderer):
```typescript
const blob = await pdf(<FieldWeldReportPDF {...props} />).toBlob();
expect(blob.type).toBe('application/pdf');
expect(blob.size).toBeLessThan(500 * 1024);
```

---

## Styling Rules

**DO**: Use @react-pdf/renderer StyleSheet API, flexbox, reference `commonStyles.ts`
**DON'T**: Tailwind classes, CSS-in-JS, Grid layout, top-level imports

See `specs/029-react-pdf-reports/quickstart.md` for creating new report types, custom columns, and performance tips.

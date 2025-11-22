# Phase 0: Research & Technology Decisions

**Feature**: Advanced Report Generation with Component-Based PDF Library
**Date**: 2025-01-21
**Status**: Complete

## Overview

This document consolidates research findings and technology decisions for implementing a component-based PDF generation system. All decisions documented here resolve "NEEDS CLARIFICATION" items from the Technical Context and provide rationale for chosen approaches.

---

## Decision 1: PDF Generation Library

**Decision**: Use **@react-pdf/renderer v4.3.1**

**Rationale**:
- **React-native approach**: Matches existing React 18 + TypeScript stack perfectly
- **Component-based**: Enables reusable PDF components (headers, footers, tables) that can be maintained like UI components
- **TypeScript support**: First-class TypeScript with built-in type definitions, compatible with strict mode
- **Mature ecosystem**: 15,900+ GitHub stars, 919K weekly npm downloads, actively maintained (last commit 10 days ago)
- **Lazy loading compatible**: Library can be dynamically imported to avoid bundle bloat
- **Selectable text**: Generates "real" PDF text elements (not rasterized images), meeting accessibility requirements

**Alternatives Considered**:
1. **Keep jsPDF only**:
   - ❌ Imperative API makes complex layouts harder to maintain
   - ❌ Manual positioning and styling for every report element
   - ✅ Smallest bundle (~229 KB)
   - **Rejected**: Doesn't scale well for future complex reports

2. **pdf-lib** (low-level manipulation):
   - ✅ Zero external dependencies, 1.48M weekly downloads
   - ✅ Can modify existing PDFs
   - ❌ Lower-level API requires more code
   - ❌ Not React-component-based
   - **Rejected**: Too low-level for report generation use case

3. **pdfmake** (declarative JSON):
   - ✅ Declarative approach easier than jsPDF
   - ❌ Massive bundle size (3.7 MB)
   - ❌ Not React-specific, requires integration work
   - **Rejected**: Bundle size too large even with lazy loading

4. **Puppeteer** (server-side):
   - ✅ Pixel-perfect rendering, zero client bundle impact
   - ❌ Requires server infrastructure (Supabase Edge Function)
   - ❌ Slower than client-side generation
   - ❌ Privacy concern (data leaves client)
   - **Rejected**: Adds unnecessary server complexity for this use case

**Implementation Notes**:
- Use dynamic imports: `const { pdf } = await import('@react-pdf/renderer')` to lazy load
- Bundle impact: ~700KB-1.2MB when loaded, but zero impact on initial page load
- API reference: https://react-pdf.org/components

---

## Decision 2: Component Architecture Pattern

**Decision**: **Atomic Design with Lazy Loading**

**Component Hierarchy**:
```
src/components/pdf/
├── styles/commonStyles.ts       # Atoms: Shared StyleSheet definitions
├── layout/                      # Molecules: Layout components
│   ├── BrandedHeader.tsx       #   - Logo + title + metadata
│   ├── ReportFooter.tsx        #   - Page numbers + company info
│   └── PageLayout.tsx          #   - Combines header + content + footer
├── tables/                      # Molecules: Table primitives
│   ├── TableHeader.tsx         #   - Header row with column definitions
│   ├── TableRow.tsx            #   - Body row with data cells
│   └── Table.tsx               #   - Combines header + rows + grand total
└── reports/                     # Organisms: Complete reports
    └── FieldWeldReportPDF.tsx  #   - Document with Page + Table + Layout
```

**Rationale**:
- **Separation of concerns**: Layout components (header/footer) reusable across all reports
- **Single responsibility**: Each component has one job (header, table, row, etc.)
- **Composability**: Future reports can mix and match existing components
- **Type safety**: Each component has explicit TypeScript interfaces
- **Testability**: Can unit test components in isolation

**Alternatives Considered**:
1. **Monolithic report component**:
   - ❌ Hard to test
   - ❌ Can't reuse parts for other reports
   - ❌ Difficult to maintain
   - **Rejected**: Violates single responsibility principle

2. **Flat structure (all components in one folder)**:
   - ❌ Harder to navigate as library grows
   - ❌ No clear hierarchy
   - **Rejected**: Doesn't scale for multiple report types

**Implementation Notes**:
- Export all components from `src/components/pdf/index.ts` for clean imports
- Use @react-pdf/renderer `StyleSheet.create()` for styles (not inline objects)
- Follow React naming conventions (PascalCase, .tsx extension)

---

## Decision 3: Lazy Loading Strategy

**Decision**: **Hook-based dynamic import with loading state**

**Pattern**:
```typescript
// src/hooks/useFieldWeldPDFExport.ts
export const useFieldWeldPDFExport = () => {
  const [isGenerating, setIsGenerating] = useState(false);

  const generatePDF = async (data, projectName, dimension) => {
    setIsGenerating(true);
    try {
      // Lazy load @react-pdf/renderer
      const { pdf } = await import('@react-pdf/renderer');
      const { FieldWeldReportPDF } = await import('@/components/pdf/reports/FieldWeldReportPDF');

      const blob = await pdf(<FieldWeldReportPDF data={data} ... />).toBlob();

      // Trigger download
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `filename.pdf`;
      link.click();
      URL.revokeObjectURL(url);

      return blob;
    } finally {
      setIsGenerating(false);
    }
  };

  return { generatePDF, isGenerating };
};
```

**Rationale**:
- **Zero initial bundle impact**: Library only loads when user clicks export
- **Loading state management**: Hook provides `isGenerating` for UI feedback
- **Error handling**: Try/finally ensures loading state always resets
- **Type safety**: Hook returns strongly-typed functions
- **Reusable**: Same pattern works for future report types

**Alternatives Considered**:
1. **Import at module top-level**:
   - ❌ Adds 700KB-1.2MB to initial bundle immediately
   - **Rejected**: Violates performance requirements

2. **Code splitting only (no hook)**:
   - ❌ No centralized loading state management
   - ❌ Harder to show loading indicators
   - **Rejected**: Worse developer experience

**Implementation Notes**:
- Use Vite's dynamic import for automatic code splitting
- Measure bundle impact with `npm run build` and check dist/ sizes
- Test lazy loading with network throttling to verify loading states

---

## Decision 4: Styling Approach

**Decision**: **@react-pdf/renderer StyleSheet API**

**Pattern**:
```typescript
// src/components/pdf/styles/commonStyles.ts
import { StyleSheet } from '@react-pdf/renderer';

export const commonStyles = StyleSheet.create({
  // Colors from project (slate-700, white)
  headerRow: {
    backgroundColor: '#334155', // slate-700
    color: '#ffffff',
    fontWeight: 'bold',
  },

  // Typography scale
  title: { fontSize: 24, fontWeight: 'bold' },
  subtitle: { fontSize: 12, color: '#64748b' }, // slate-500
  body: { fontSize: 10 },

  // Layout
  page: { padding: 30 },
  landscape: { orientation: 'landscape' },
});
```

**Rationale**:
- **CSS-like syntax**: Familiar to React developers (similar to React Native)
- **Type safety**: StyleSheet.create() provides TypeScript intellisense
- **Performance**: Styles are optimized by @react-pdf/renderer
- **Reusability**: Shared styles prevent duplication across components
- **Consistency**: Matches project colors (slate-700 for headers)

**Supported CSS Features** (verified from docs):
- ✅ Flexbox (full support)
- ✅ Colors, backgrounds, opacity
- ✅ Borders, border-radius
- ✅ Margins, padding
- ✅ Text styling (fontSize, fontWeight, textAlign, lineHeight)
- ✅ Transforms (rotate, scale, translate)
- ❌ Grid layout (not supported - use flexbox)
- ❌ CSS-in-JS libraries (styled-components, emotion)

**Alternatives Considered**:
1. **Inline styles (plain objects)**:
   - ❌ No TypeScript intellisense
   - ❌ Harder to reuse
   - **Rejected**: Worse developer experience

2. **Tailwind CSS**:
   - ❌ Not compatible with @react-pdf/renderer (DOM-only)
   - **Rejected**: Technical limitation

**Implementation Notes**:
- Use absolute units (pt, px, mm, cm) for PDF layouts
- Project colors: slate-700 (#334155) for headers, white (#ffffff) for header text
- Typography: 10pt body, 12pt subtitle, 18pt section headers, 24pt main title
- Test styles in Chrome PDF viewer, Firefox PDF viewer, Adobe Acrobat for consistency

---

## Decision 5: Table Layout Strategy

**Decision**: **Manual Flexbox Construction**

**Pattern**:
```typescript
// Manual table with flexbox (no built-in <table> in @react-pdf/renderer)
<View style={styles.tableRow}>
  <View style={{ width: '40%' }}>
    <Text style={styles.tableCell}>{row.name}</Text>
  </View>
  <View style={{ width: '20%' }}>
    <Text style={[styles.tableCell, styles.alignRight]}>{row.total}</Text>
  </View>
</View>
```

**Rationale**:
- **No built-in table component**: @react-pdf/renderer doesn't have `<table>`, `<tr>`, `<td>`
- **Flexbox is mature**: Well-supported in @react-pdf/renderer with good docs
- **Column width control**: Explicit percentage widths ensure consistent layout
- **Alignment options**: Can easily right-align numbers, left-align text
- **Page break control**: Can use `page-break-inside: avoid` on rows

**Alternatives Considered**:
1. **Third-party table libraries**:
   - `@david.kucsai/react-pdf-table`: Declarative table API
   - `@airthium/react-pdf-table`: More flexible
   - ❌ Additional dependencies
   - ❌ Less control over styling
   - **Rejected**: Manual approach gives more control for first implementation

2. **Grid layout**:
   - ❌ Not supported in @react-pdf/renderer
   - **Rejected**: Technical limitation

**Implementation Notes**:
- Field weld report columns (8-10 depending on dimension):
  - Standard: Name (40%), Total Welds (10%), Fit-up (10%), Weld Complete (10%), Accepted (10%), NDE Pass Rate (10%), Repair Rate (10%), % Complete (10%)
  - Welder dimension adds: First Pass Rate (10%), Avg Days to Accept (10%)
- Use `page-break-inside: avoid` on `<View>` wrapping table rows to prevent row splitting
- Grand total row: Same structure but with distinct styling (bold, slate-700 background)

---

## Decision 6: Testing Strategy

**Decision**: **Three-tier testing with mocked PDF generation**

**Test Tiers**:
1. **Unit Tests** (src/components/pdf/*.test.tsx):
   - Test individual PDF components render without errors
   - Mock @react-pdf/renderer components to avoid actual PDF generation
   - Fast execution, no file I/O

2. **Integration Tests** (tests/components/pdf/*.test.tsx):
   - Test full PDF generation flow with real @react-pdf/renderer
   - Generate PDF blob, verify it's non-empty
   - Test with all dimensions (area, system, test_package, welder)

3. **Acceptance Tests** (tests/integration/reports/*.test.tsx):
   - Map to spec acceptance scenarios (P1, P2, P3)
   - Test button visibility (desktop only)
   - Test loading states
   - Test dual export buttons

**Rationale**:
- **Fast feedback loop**: Unit tests run quickly without PDF generation
- **Comprehensive coverage**: Integration tests verify end-to-end flow
- **Spec compliance**: Acceptance tests ensure requirements are met
- **Mocking strategy**: Mock @react-pdf/renderer for unit tests, use real library for integration

**Mock Pattern**:
```typescript
// Unit test mock
vi.mock('@react-pdf/renderer', () => ({
  Document: ({ children }: any) => <div data-testid="pdf-document">{children}</div>,
  Page: ({ children }: any) => <div data-testid="pdf-page">{children}</div>,
  View: ({ children }: any) => <div data-testid="pdf-view">{children}</div>,
  Text: ({ children }: any) => <span data-testid="pdf-text">{children}</span>,
  StyleSheet: { create: (styles: any) => styles },
}));
```

**Alternatives Considered**:
1. **No mocking (always generate PDFs)**:
   - ❌ Slow tests (PDF generation takes time)
   - ❌ Harder to debug failures
   - **Rejected**: Poor developer experience

2. **E2E tests only**:
   - ❌ Slow feedback
   - ❌ Hard to test edge cases
   - **Rejected**: Doesn't meet coverage requirements

**Implementation Notes**:
- Coverage targets: ≥70% overall, ≥80% src/lib/, ≥60% src/components/
- Use Vitest + Testing Library (existing project setup)
- Test with mock data matching real field weld report structure
- Verify PDF file size is reasonable (<500KB for typical 10-50 row reports)

---

## Decision 7: Filename Strategy

**Decision**: **Descriptive filename with timestamp**

**Pattern**: `[project-name]_field_weld_[dimension]_[YYYY-MM-DD].pdf`

**Example**: `Brownfield_Project_X_field_weld_area_2025-01-21.pdf`

**Rationale**:
- **Descriptive**: Clear what the file contains
- **Sortable**: YYYY-MM-DD format sorts chronologically
- **Unique**: Timestamp prevents overwriting previous exports from same day
- **Sanitized**: Remove invalid characters (/ \ ? % * : | " < >) to prevent download errors

**Implementation**:
```typescript
const sanitizeFilename = (name: string): string => {
  return name.replace(/[/\\?%*:|"<>]/g, '_');
};

const formatDateForFilename = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const filename = `${sanitizeFilename(projectName)}_field_weld_${dimension}_${formatDateForFilename(new Date())}.pdf`;
```

**Alternatives Considered**:
1. **Generic filename** (`report.pdf`):
   - ❌ Not descriptive
   - ❌ Gets overwritten with each export
   - **Rejected**: Poor user experience

2. **UUID filename** (`a3f4d7c8-1234-5678.pdf`):
   - ❌ Not human-readable
   - ❌ Hard to find specific reports
   - **Rejected**: Users need descriptive names

**Implementation Notes**:
- Reuse existing `sanitizeFilename()` from src/lib/exportFieldWeldReport.ts
- Reuse existing `formatDateForFilename()` from src/lib/exportFieldWeldReport.ts
- Max filename length: 255 characters (browser limit)

---

## Decision 8: Desktop-Only Implementation

**Decision**: **Hide export buttons on mobile/tablet (<1024px)**

**Rationale**:
- **User clarification**: User explicitly stated "These reports will not be available in Mobile or Tablet view. These are desktop only"
- **Consistent experience**: Prevents mobile users from attempting export and encountering issues
- **Simplified implementation**: No need for responsive PDF layouts or mobile-specific considerations

**Implementation**:
```typescript
// ReportsPage.tsx
const isDesktop = window.innerWidth >= 1024;

return (
  <div>
    {isDesktop && (
      <div className="flex gap-2">
        <Button onClick={handleClassicExport}>Export PDF (Classic)</Button>
        <Button onClick={handleEnhancedExport}>Export PDF (Enhanced)</Button>
      </div>
    )}
  </div>
);
```

Or with Tailwind responsive classes:
```typescript
<div className="hidden lg:flex gap-2">
  <Button>Export PDF (Classic)</Button>
  <Button>Export PDF (Enhanced)</Button>
</div>
```

**Alternatives Considered**:
1. **Mobile-optimized PDFs**:
   - ❌ Not required per user clarification
   - ❌ Additional complexity
   - **Rejected**: Out of scope

2. **Disabled buttons on mobile**:
   - ❌ Confusing (why show disabled button?)
   - **Rejected**: Hiding is cleaner UX

**Implementation Notes**:
- Use Tailwind's `lg:` breakpoint (≥1024px) for responsive hiding
- Test on mobile devices to verify buttons are hidden
- Update spec and success criteria to reflect desktop-only constraint

---

## Summary of Research Findings

All "NEEDS CLARIFICATION" items from Technical Context have been resolved:

| Item | Decision | Rationale |
|------|----------|-----------|
| PDF Generation Library | @react-pdf/renderer v4.3.1 | React-native, component-based, TypeScript support, mature |
| Component Architecture | Atomic Design with lazy loading | Reusable, testable, composable components |
| Lazy Loading Strategy | Hook-based dynamic import | Zero bundle impact, loading state management |
| Styling Approach | @react-pdf/renderer StyleSheet API | Type-safe, CSS-like, reusable styles |
| Table Layout | Manual Flexbox construction | No built-in tables, full control over layout |
| Testing Strategy | Three-tier (unit/integration/acceptance) | Fast feedback, comprehensive coverage, spec compliance |
| Filename Strategy | Descriptive with timestamp | Sortable, unique, descriptive |
| Platform Support | Desktop-only (≥1024px) | Per user clarification, simplified implementation |

**Next Steps**: Proceed to Phase 1 (Design & Contracts) to generate data-model.md and component interface contracts.

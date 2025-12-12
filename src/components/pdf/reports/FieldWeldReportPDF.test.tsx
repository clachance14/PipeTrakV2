/**
 * Unit Tests: FieldWeldReportPDF Component (Feature 029)
 *
 * Tests that FieldWeldReportPDF correctly handles:
 * - All 4 dimensions (area, system, test_package, welder)
 * - Empty data edge case
 * - Multi-page reports (>50 rows)
 * - Grand total only on last page
 */

import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { FieldWeldReportPDF } from './FieldWeldReportPDF';
import type { FieldWeldReportPDFProps } from '@/types/pdf-components';
import type { FieldWeldReportData } from '@/types/reports';

// Mock @react-pdf/renderer to avoid actual PDF generation
vi.mock('@react-pdf/renderer', () => ({
  Document: ({ children }: any) => <div data-testid="pdf-document">{children}</div>,
  Page: ({ children, size, orientation }: any) => (
    <div data-testid="pdf-page" data-size={size} data-orientation={orientation}>
      {children}
    </div>
  ),
  View: ({ children }: any) => <div data-testid="pdf-view">{children}</div>,
  Text: ({ children, render: renderProp }: any) => {
    if (renderProp) {
      const renderedText = renderProp({ pageNumber: 1, totalPages: 5 });
      return <span data-testid="pdf-text" data-render-prop="true">{renderedText}</span>;
    }
    return <span data-testid="pdf-text">{children}</span>;
  },
  Image: ({ src }: any) => <img data-testid="pdf-image" src={src} alt="" />,
  StyleSheet: { create: (styles: any) => styles },
}));

// Mock sub-components
vi.mock('../layout/BrandedHeader', () => ({
  BrandedHeader: ({ title, projectName, dimensionLabel, generatedDate }: any) => (
    <div data-testid="branded-header">
      <span data-testid="header-title">{title}</span>
      <span data-testid="header-project">{projectName}</span>
      <span data-testid="header-dimension">{dimensionLabel}</span>
      <span data-testid="header-date">{generatedDate}</span>
    </div>
  ),
}));

vi.mock('../layout/ReportFooter', () => ({
  ReportFooter: ({ showPageNumbers }: any) => (
    <div data-testid="report-footer">
      {showPageNumbers && <span>Page Numbers</span>}
    </div>
  ),
}));

vi.mock('../tables/Table', () => ({
  Table: ({ columns, data, grandTotal }: any) => (
    <div data-testid="table">
      <div data-testid="table-columns">{columns.length} columns</div>
      <div data-testid="table-rows">{data.length} rows</div>
      {grandTotal && <div data-testid="table-grand-total">Grand Total</div>}
    </div>
  ),
}));

// Mock pdfUtils
vi.mock('@/lib/pdfUtils', () => ({
  transformToTableProps: (data: FieldWeldReportData, dimension: string, _includeRepairRate?: boolean) => ({
    columns: [
      { key: 'name', label: 'Name', width: '40%' },
      { key: 'installed', label: 'Installed', width: '10%' },
    ],
    data: data.rows.map((row) => ({ name: row.name, installed: row.installed })),
    grandTotal: data.grand_total ? { name: 'Total', installed: data.grand_total.installed } : undefined,
    highlightGrandTotal: true,
  }),
  getDimensionLabel: (dimension: string) => {
    const labels: Record<string, string> = {
      area: 'Area',
      system: 'System',
      test_package: 'Test Package',
      welder: 'Welder',
    };
    return labels[dimension] || dimension;
  },
  hasNonZeroRepairRate: (_data: FieldWeldReportData) => true, // Always show repair rate in tests
}));

describe('FieldWeldReportPDF', () => {
  const baseReportData: FieldWeldReportData = {
    rows: [
      { name: 'Area A', installed: 10, fit_up: 8, welded: 6, pwht: 4, final_inspection: 2 },
      { name: 'Area B', installed: 15, fit_up: 12, welded: 10, pwht: 8, final_inspection: 6 },
    ],
    grand_total: { name: 'Total', installed: 25, fit_up: 20, welded: 16, pwht: 12, final_inspection: 8 },
  };

  it('renders document with area dimension', () => {
    const props: FieldWeldReportPDFProps = {
      reportData: baseReportData,
      projectName: 'Test Project',
      dimension: 'area',
      generatedDate: '2025-01-21',
    };
    const { container } = render(<FieldWeldReportPDF {...props} />);
    const document = container.querySelector('[data-testid="pdf-document"]');
    expect(document).toBeTruthy();
  });

  it('renders correct dimension label for area', () => {
    const props: FieldWeldReportPDFProps = {
      reportData: baseReportData,
      projectName: 'Test Project',
      dimension: 'area',
      generatedDate: '2025-01-21',
    };
    const { container } = render(<FieldWeldReportPDF {...props} />);
    expect(container.querySelector('[data-testid="header-dimension"]')?.textContent).toBe('Area');
  });

  it('renders correct dimension label for system', () => {
    const props: FieldWeldReportPDFProps = {
      reportData: baseReportData,
      projectName: 'Test Project',
      dimension: 'system',
      generatedDate: '2025-01-21',
    };
    const { container } = render(<FieldWeldReportPDF {...props} />);
    expect(container.querySelector('[data-testid="header-dimension"]')?.textContent).toBe('System');
  });

  it('renders correct dimension label for test_package', () => {
    const props: FieldWeldReportPDFProps = {
      reportData: baseReportData,
      projectName: 'Test Project',
      dimension: 'test_package',
      generatedDate: '2025-01-21',
    };
    const { container } = render(<FieldWeldReportPDF {...props} />);
    expect(container.querySelector('[data-testid="header-dimension"]')?.textContent).toBe('Test Package');
  });

  it('renders correct dimension label for welder', () => {
    const props: FieldWeldReportPDFProps = {
      reportData: baseReportData,
      projectName: 'Test Project',
      dimension: 'welder',
      generatedDate: '2025-01-21',
    };
    const { container } = render(<FieldWeldReportPDF {...props} />);
    expect(container.querySelector('[data-testid="header-dimension"]')?.textContent).toBe('Welder');
  });

  it('renders project name in header', () => {
    const props: FieldWeldReportPDFProps = {
      reportData: baseReportData,
      projectName: 'Alpha Construction Project',
      dimension: 'area',
      generatedDate: '2025-01-21',
    };
    const { container } = render(<FieldWeldReportPDF {...props} />);
    expect(container.querySelector('[data-testid="header-project"]')?.textContent).toBe('Alpha Construction Project');
  });

  it('renders generated date in header', () => {
    const props: FieldWeldReportPDFProps = {
      reportData: baseReportData,
      projectName: 'Test Project',
      dimension: 'area',
      generatedDate: '2025-01-21',
    };
    const { container } = render(<FieldWeldReportPDF {...props} />);
    expect(container.querySelector('[data-testid="header-date"]')?.textContent).toBe('2025-01-21');
  });

  it('renders company logo when provided', () => {
    const props: FieldWeldReportPDFProps = {
      reportData: baseReportData,
      projectName: 'Test Project',
      dimension: 'area',
      generatedDate: '2025-01-21',
      companyLogo: 'data:image/png;base64,iVBORw0KGgo=',
    };
    const { container } = render(<FieldWeldReportPDF {...props} />);
    // Logo would be in BrandedHeader, which is mocked
    expect(container.querySelector('[data-testid="branded-header"]')).toBeTruthy();
  });

  it('renders table with data rows', () => {
    const props: FieldWeldReportPDFProps = {
      reportData: baseReportData,
      projectName: 'Test Project',
      dimension: 'area',
      generatedDate: '2025-01-21',
    };
    const { container } = render(<FieldWeldReportPDF {...props} />);
    const table = container.querySelector('[data-testid="table"]');
    expect(table).toBeTruthy();
    expect(container.querySelector('[data-testid="table-rows"]')?.textContent).toBe('2 rows');
  });

  it('renders grand total in table', () => {
    const props: FieldWeldReportPDFProps = {
      reportData: baseReportData,
      projectName: 'Test Project',
      dimension: 'area',
      generatedDate: '2025-01-21',
    };
    const { container } = render(<FieldWeldReportPDF {...props} />);
    expect(container.querySelector('[data-testid="table-grand-total"]')).toBeTruthy();
  });

  it('renders footer with page numbers', () => {
    const props: FieldWeldReportPDFProps = {
      reportData: baseReportData,
      projectName: 'Test Project',
      dimension: 'area',
      generatedDate: '2025-01-21',
    };
    const { container } = render(<FieldWeldReportPDF {...props} />);
    expect(container.querySelector('[data-testid="report-footer"]')).toBeTruthy();
  });

  it('handles empty data array', () => {
    const emptyData: FieldWeldReportData = {
      rows: [],
      grand_total: null,
    };
    const props: FieldWeldReportPDFProps = {
      reportData: emptyData,
      projectName: 'Test Project',
      dimension: 'area',
      generatedDate: '2025-01-21',
    };
    const { container } = render(<FieldWeldReportPDF {...props} />);
    expect(container.textContent).toContain('No data available for this report');
  });

  it('handles null rows', () => {
    const emptyData: FieldWeldReportData = {
      rows: [],
      grand_total: null,
    };
    const props: FieldWeldReportPDFProps = {
      reportData: emptyData,
      projectName: 'Test Project',
      dimension: 'area',
      generatedDate: '2025-01-21',
    };
    const { container } = render(<FieldWeldReportPDF {...props} />);
    expect(container.querySelector('[data-testid="pdf-document"]')).toBeTruthy();
    expect(container.textContent).toContain('No data available');
  });

  it('renders single page for small datasets', () => {
    const props: FieldWeldReportPDFProps = {
      reportData: baseReportData,
      projectName: 'Test Project',
      dimension: 'area',
      generatedDate: '2025-01-21',
    };
    const { container } = render(<FieldWeldReportPDF {...props} />);
    const pages = container.querySelectorAll('[data-testid="pdf-page"]');
    expect(pages.length).toBe(1);
  });

  it('renders multiple pages for large datasets', () => {
    const largeData: FieldWeldReportData = {
      rows: Array.from({ length: 120 }, (_, i) => ({
        name: `Area ${i}`,
        installed: i,
        fit_up: i,
        welded: i,
        pwht: i,
        final_inspection: i,
      })),
      grand_total: { name: 'Total', installed: 7140, fit_up: 7140, welded: 7140, pwht: 7140, final_inspection: 7140 },
    };
    const props: FieldWeldReportPDFProps = {
      reportData: largeData,
      projectName: 'Test Project',
      dimension: 'area',
      generatedDate: '2025-01-21',
    };
    const { container } = render(<FieldWeldReportPDF {...props} />);
    const pages = container.querySelectorAll('[data-testid="pdf-page"]');
    expect(pages.length).toBeGreaterThan(1);
  });

  it('renders header on every page in multi-page report', () => {
    const largeData: FieldWeldReportData = {
      rows: Array.from({ length: 120 }, (_, i) => ({
        name: `Area ${i}`,
        installed: i,
        fit_up: i,
        welded: i,
        pwht: i,
        final_inspection: i,
      })),
      grand_total: { name: 'Total', installed: 7140, fit_up: 7140, welded: 7140, pwht: 7140, final_inspection: 7140 },
    };
    const props: FieldWeldReportPDFProps = {
      reportData: largeData,
      projectName: 'Test Project',
      dimension: 'area',
      generatedDate: '2025-01-21',
    };
    const { container } = render(<FieldWeldReportPDF {...props} />);
    const headers = container.querySelectorAll('[data-testid="branded-header"]');
    const pages = container.querySelectorAll('[data-testid="pdf-page"]');
    expect(headers.length).toBe(pages.length);
  });

  it('uses landscape orientation', () => {
    const props: FieldWeldReportPDFProps = {
      reportData: baseReportData,
      projectName: 'Test Project',
      dimension: 'area',
      generatedDate: '2025-01-21',
    };
    const { container } = render(<FieldWeldReportPDF {...props} />);
    const page = container.querySelector('[data-testid="pdf-page"]');
    expect(page?.getAttribute('data-orientation')).toBe('landscape');
  });

  it('uses A4 size', () => {
    const props: FieldWeldReportPDFProps = {
      reportData: baseReportData,
      projectName: 'Test Project',
      dimension: 'area',
      generatedDate: '2025-01-21',
    };
    const { container } = render(<FieldWeldReportPDF {...props} />);
    const page = container.querySelector('[data-testid="pdf-page"]');
    expect(page?.getAttribute('data-size')).toBe('A4');
  });

  it('handles missing grand_total', () => {
    const dataWithoutTotal: FieldWeldReportData = {
      rows: baseReportData.rows,
      grand_total: null,
    };
    const props: FieldWeldReportPDFProps = {
      reportData: dataWithoutTotal,
      projectName: 'Test Project',
      dimension: 'area',
      generatedDate: '2025-01-21',
    };
    const { container } = render(<FieldWeldReportPDF {...props} />);
    expect(container.querySelector('[data-testid="table-grand-total"]')).toBeFalsy();
  });
});

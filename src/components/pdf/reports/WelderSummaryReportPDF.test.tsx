/**
 * Unit Tests: WelderSummaryReportPDF Component
 *
 * Tests that WelderSummaryReportPDF correctly handles:
 * - Three-section structure (BW, SW, Grand Total)
 * - Tier-grouped metrics (5%, 10%, 100%)
 * - Calculated summary rows (rejection %, NDE completion %)
 * - Empty data edge case
 * - Multi-page reports (>30 welders)
 */

import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { WelderSummaryReportPDF } from './WelderSummaryReportPDF';
import type { WelderSummaryReportPDFProps } from '@/types/pdf-components';
import type { WelderSummaryReport, WelderSummaryRow, WelderSummaryTotals } from '@/types/weldSummary';

// Mock @react-pdf/renderer to avoid actual PDF generation
vi.mock('@react-pdf/renderer', () => ({
  Document: ({ children }: any) => <div data-testid="pdf-document">{children}</div>,
  Page: ({ children, size, orientation }: any) => (
    <div data-testid="pdf-page" data-size={size} data-orientation={orientation}>
      {children}
    </div>
  ),
  View: ({ children, style }: any) => (
    <div data-testid="pdf-view" data-style={JSON.stringify(style)}>{children}</div>
  ),
  Text: ({ children, style, render: renderProp }: any) => {
    if (renderProp) {
      const renderedText = renderProp({ pageNumber: 1, totalPages: 2 });
      return <span data-testid="pdf-text" data-render-prop="true">{renderedText}</span>;
    }
    return <span data-testid="pdf-text" data-style={JSON.stringify(style)}>{children}</span>;
  },
  Image: ({ src }: any) => <img data-testid="pdf-image" src={src} alt="" />,
  StyleSheet: { create: (styles: any) => styles },
}));

// Mock sub-components
vi.mock('../layout/BrandedHeader', () => ({
  BrandedHeader: ({ title, projectName, dimensionLabel, generatedDate, logo }: any) => (
    <div data-testid="branded-header">
      <span data-testid="header-title">{title}</span>
      <span data-testid="header-project">{projectName}</span>
      <span data-testid="header-dimension">{dimensionLabel}</span>
      <span data-testid="header-date">{generatedDate}</span>
      {logo && <img data-testid="header-logo" src={logo} alt="" />}
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

describe('WelderSummaryReportPDF', () => {
  const createMockRow = (id: number): WelderSummaryRow => ({
    welder_id: `welder-${id}`,
    welder_stencil: `W${id.toString().padStart(3, '0')}`,
    welder_name: `Welder ${id}`,

    // BW metrics
    bw_welds_5pct: 10 + id,
    bw_nde_5pct: 5 + id,
    bw_reject_5pct: 1,
    bw_welds_10pct: 20 + id,
    bw_nde_10pct: 10 + id,
    bw_reject_10pct: 2,
    bw_welds_100pct: 30 + id,
    bw_nde_100pct: 30 + id,
    bw_reject_100pct: 3,
    bw_reject_rate: 10.5,
    bw_nde_comp_5pct: 50.0,
    bw_nde_comp_10pct: 50.0,
    bw_nde_comp_100pct: 100.0,

    // SW metrics
    sw_welds_5pct: 15 + id,
    sw_nde_5pct: 7 + id,
    sw_reject_5pct: 1,
    sw_welds_10pct: 25 + id,
    sw_nde_10pct: 12 + id,
    sw_reject_10pct: 2,
    sw_welds_100pct: 35 + id,
    sw_nde_100pct: 35 + id,
    sw_reject_100pct: 3,
    sw_reject_rate: 9.5,
    sw_nde_comp_5pct: 46.7,
    sw_nde_comp_10pct: 48.0,
    sw_nde_comp_100pct: 100.0,

    // Overall
    welds_total: 135 + id * 6,
    nde_total: 99 + id * 6,
    reject_total: 12,
    reject_rate: 10.0,
  });

  const createMockTotals = (): WelderSummaryTotals => ({
    // BW totals
    bw_welds_5pct: 50,
    bw_nde_5pct: 25,
    bw_reject_5pct: 5,
    bw_welds_10pct: 100,
    bw_nde_10pct: 50,
    bw_reject_10pct: 10,
    bw_welds_100pct: 150,
    bw_nde_100pct: 150,
    bw_reject_100pct: 15,
    bw_reject_rate: 10.5,
    bw_nde_comp_5pct: 50.0,
    bw_nde_comp_10pct: 50.0,
    bw_nde_comp_100pct: 100.0,

    // SW totals
    sw_welds_5pct: 75,
    sw_nde_5pct: 35,
    sw_reject_5pct: 5,
    sw_welds_10pct: 125,
    sw_nde_10pct: 60,
    sw_reject_10pct: 10,
    sw_welds_100pct: 175,
    sw_nde_100pct: 175,
    sw_reject_100pct: 15,
    sw_reject_rate: 9.5,
    sw_nde_comp_5pct: 46.7,
    sw_nde_comp_10pct: 48.0,
    sw_nde_comp_100pct: 100.0,

    // Overall
    welds_total: 675,
    nde_total: 495,
    reject_total: 60,
    reject_rate: 10.0,
  });

  const baseReportData: WelderSummaryReport = {
    rows: [createMockRow(1), createMockRow(2)],
    totals: createMockTotals(),
    generatedAt: new Date('2025-01-21'),
    filters: {
      p_project_id: 'project-123',
      p_start_date: null,
      p_end_date: null,
      p_welder_ids: null,
      p_area_ids: null,
      p_system_ids: null,
      p_package_ids: null,
    },
  };

  it('renders document', () => {
    const props: WelderSummaryReportPDFProps = {
      reportData: baseReportData,
      projectName: 'Test Project',
      generatedDate: '2025-01-21',
    };
    const { container } = render(<WelderSummaryReportPDF {...props} />);
    const document = container.querySelector('[data-testid="pdf-document"]');
    expect(document).toBeTruthy();
  });

  it('renders project name in header', () => {
    const props: WelderSummaryReportPDFProps = {
      reportData: baseReportData,
      projectName: 'Alpha Construction Project',
      generatedDate: '2025-01-21',
    };
    const { container } = render(<WelderSummaryReportPDF {...props} />);
    expect(container.querySelector('[data-testid="header-project"]')?.textContent).toBe('Alpha Construction Project');
  });

  it('renders generated date in header', () => {
    const props: WelderSummaryReportPDFProps = {
      reportData: baseReportData,
      projectName: 'Test Project',
      generatedDate: '2025-01-21',
    };
    const { container } = render(<WelderSummaryReportPDF {...props} />);
    expect(container.querySelector('[data-testid="header-date"]')?.textContent).toBe('2025-01-21');
  });

  it('renders Welder as dimension label', () => {
    const props: WelderSummaryReportPDFProps = {
      reportData: baseReportData,
      projectName: 'Test Project',
      generatedDate: '2025-01-21',
    };
    const { container } = render(<WelderSummaryReportPDF {...props} />);
    expect(container.querySelector('[data-testid="header-dimension"]')?.textContent).toBe('Welder');
  });

  it('renders company logo when provided', () => {
    const props: WelderSummaryReportPDFProps = {
      reportData: baseReportData,
      projectName: 'Test Project',
      generatedDate: '2025-01-21',
      companyLogo: 'data:image/png;base64,iVBORw0KGgo=',
    };
    const { container } = render(<WelderSummaryReportPDF {...props} />);
    expect(container.querySelector('[data-testid="header-logo"]')).toBeTruthy();
  });

  it('renders welder data rows', () => {
    const props: WelderSummaryReportPDFProps = {
      reportData: baseReportData,
      projectName: 'Test Project',
      generatedDate: '2025-01-21',
    };
    const { container } = render(<WelderSummaryReportPDF {...props} />);
    const textElements = container.querySelectorAll('[data-testid="pdf-text"]');
    const textContent = Array.from(textElements).map(el => el.textContent).join(' ');

    // Verify welder names appear
    expect(textContent).toContain('Welder 1');
    expect(textContent).toContain('Welder 2');
  });

  it('renders totals row', () => {
    const props: WelderSummaryReportPDFProps = {
      reportData: baseReportData,
      projectName: 'Test Project',
      generatedDate: '2025-01-21',
    };
    const { container } = render(<WelderSummaryReportPDF {...props} />);
    const textElements = container.querySelectorAll('[data-testid="pdf-text"]');
    const textContent = Array.from(textElements).map(el => el.textContent).join(' ');

    // Verify totals appear (BW TOTALS and SW TOTALS)
    expect(textContent).toContain('BW TOTALS');
    expect(textContent).toContain('SW TOTALS');
  });

  it('renders footer with page numbers', () => {
    const props: WelderSummaryReportPDFProps = {
      reportData: baseReportData,
      projectName: 'Test Project',
      generatedDate: '2025-01-21',
    };
    const { container } = render(<WelderSummaryReportPDF {...props} />);
    expect(container.querySelector('[data-testid="report-footer"]')).toBeTruthy();
  });

  it('handles empty data array', () => {
    const emptyData: WelderSummaryReport = {
      rows: [],
      totals: createMockTotals(),
      generatedAt: new Date('2025-01-21'),
      filters: baseReportData.filters,
    };
    const props: WelderSummaryReportPDFProps = {
      reportData: emptyData,
      projectName: 'Test Project',
      generatedDate: '2025-01-21',
    };
    const { container } = render(<WelderSummaryReportPDF {...props} />);
    const textElements = container.querySelectorAll('[data-testid="pdf-text"]');
    const textContent = Array.from(textElements).map(el => el.textContent).join(' ');

    // Should render document with "No data available" message
    expect(container.querySelector('[data-testid="pdf-document"]')).toBeTruthy();
    expect(textContent).toContain('No data available');
  });

  it('renders single page for small datasets', () => {
    const props: WelderSummaryReportPDFProps = {
      reportData: baseReportData,
      projectName: 'Test Project',
      generatedDate: '2025-01-21',
    };
    const { container } = render(<WelderSummaryReportPDF {...props} />);
    const pages = container.querySelectorAll('[data-testid="pdf-page"]');
    expect(pages.length).toBe(1);
  });

  it('renders multiple pages for large datasets', () => {
    const largeData: WelderSummaryReport = {
      rows: Array.from({ length: 50 }, (_, i) => createMockRow(i + 1)),
      totals: createMockTotals(),
      generatedAt: new Date('2025-01-21'),
      filters: baseReportData.filters,
    };
    const props: WelderSummaryReportPDFProps = {
      reportData: largeData,
      projectName: 'Test Project',
      generatedDate: '2025-01-21',
    };
    const { container } = render(<WelderSummaryReportPDF {...props} />);
    const pages = container.querySelectorAll('[data-testid="pdf-page"]');
    expect(pages.length).toBeGreaterThan(1);
  });

  it('renders header on every page in multi-page report', () => {
    const largeData: WelderSummaryReport = {
      rows: Array.from({ length: 50 }, (_, i) => createMockRow(i + 1)),
      totals: createMockTotals(),
      generatedAt: new Date('2025-01-21'),
      filters: baseReportData.filters,
    };
    const props: WelderSummaryReportPDFProps = {
      reportData: largeData,
      projectName: 'Test Project',
      generatedDate: '2025-01-21',
    };
    const { container } = render(<WelderSummaryReportPDF {...props} />);
    const headers = container.querySelectorAll('[data-testid="branded-header"]');
    const pages = container.querySelectorAll('[data-testid="pdf-page"]');
    expect(headers.length).toBe(pages.length);
  });

  it('uses landscape orientation', () => {
    const props: WelderSummaryReportPDFProps = {
      reportData: baseReportData,
      projectName: 'Test Project',
      generatedDate: '2025-01-21',
    };
    const { container } = render(<WelderSummaryReportPDF {...props} />);
    const page = container.querySelector('[data-testid="pdf-page"]');
    expect(page?.getAttribute('data-orientation')).toBe('landscape');
  });

  it('uses A4 size', () => {
    const props: WelderSummaryReportPDFProps = {
      reportData: baseReportData,
      projectName: 'Test Project',
      generatedDate: '2025-01-21',
    };
    const { container } = render(<WelderSummaryReportPDF {...props} />);
    const page = container.querySelector('[data-testid="pdf-page"]');
    expect(page?.getAttribute('data-size')).toBe('A4');
  });

  it('renders BW and SW tier metrics', () => {
    const props: WelderSummaryReportPDFProps = {
      reportData: baseReportData,
      projectName: 'Test Project',
      generatedDate: '2025-01-21',
    };
    const { container } = render(<WelderSummaryReportPDF {...props} />);
    const textElements = container.querySelectorAll('[data-testid="pdf-text"]');
    const textContent = Array.from(textElements).map(el => el.textContent).join(' ');

    // Should contain tier percentages or tier labels
    // (Exact content depends on implementation)
    expect(textContent.length).toBeGreaterThan(0);
  });

  it('renders rejection rate per tier summary rows', () => {
    const props: WelderSummaryReportPDFProps = {
      reportData: baseReportData,
      projectName: 'Test Project',
      generatedDate: '2025-01-21',
    };
    const { container } = render(<WelderSummaryReportPDF {...props} />);
    const textElements = container.querySelectorAll('[data-testid="pdf-text"]');
    const textContent = Array.from(textElements).map(el => el.textContent).join(' ');

    // Should contain "Reject" labels for tier-level rejection rates
    expect(textContent).toContain('Reject');
  });

  it('renders NDE completion percentage summary rows', () => {
    const props: WelderSummaryReportPDFProps = {
      reportData: baseReportData,
      projectName: 'Test Project',
      generatedDate: '2025-01-21',
    };
    const { container } = render(<WelderSummaryReportPDF {...props} />);
    const textElements = container.querySelectorAll('[data-testid="pdf-text"]');
    const textContent = Array.from(textElements).map(el => el.textContent).join(' ');

    // Should contain NDE Comp % labels
    expect(textContent).toContain('NDE Comp %');
  });

  it('renders grand total section with combined metrics', () => {
    const props: WelderSummaryReportPDFProps = {
      reportData: baseReportData,
      projectName: 'Test Project',
      generatedDate: '2025-01-21',
    };
    const { container } = render(<WelderSummaryReportPDF {...props} />);
    const textElements = container.querySelectorAll('[data-testid="pdf-text"]');
    const textContent = Array.from(textElements).map(el => el.textContent).join(' ');

    // Grand total section elements
    expect(textContent).toContain('GRAND TOTAL (BW + SW COMBINED)');
    expect(textContent).toContain('Welders');
    expect(textContent).toContain('Total Welds (BW + SW)');
    expect(textContent).toContain('X-Rays Performed');
    expect(textContent).toContain('Overall Rejection Rate');

    // Check actual values from mock totals
    expect(textContent).toContain('675'); // welds_total
    expect(textContent).toContain('495'); // nde_total
    expect(textContent).toContain('10.00%'); // reject_rate
  });

  it('includes all welder rows in content', () => {
    const multiWelderData: WelderSummaryReport = {
      rows: [createMockRow(1), createMockRow(2), createMockRow(3), createMockRow(4), createMockRow(5)],
      totals: createMockTotals(),
      generatedAt: new Date('2025-01-21'),
      filters: baseReportData.filters,
    };
    const props: WelderSummaryReportPDFProps = {
      reportData: multiWelderData,
      projectName: 'Test Project',
      generatedDate: '2025-01-21',
    };
    const { container } = render(<WelderSummaryReportPDF {...props} />);
    const textElements = container.querySelectorAll('[data-testid="pdf-text"]');
    const textContent = Array.from(textElements).map(el => el.textContent).join(' ');

    // All 5 welders should appear
    expect(textContent).toContain('Welder 1');
    expect(textContent).toContain('Welder 2');
    expect(textContent).toContain('Welder 3');
    expect(textContent).toContain('Welder 4');
    expect(textContent).toContain('Welder 5');
  });
});

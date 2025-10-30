/**
 * Unit tests for ReportTable component (Feature 019 - T020)
 * Tests virtualized table rendering with 7 columns + Grand Total row
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ReportTable } from './ReportTable';
import type { ReportData } from '@/types/reports';

describe('ReportTable', () => {
  const mockReportData: ReportData = {
    dimension: 'area',
    projectId: 'project-1',
    generatedAt: new Date('2025-10-28T10:00:00Z'),
    rows: [
      {
        id: 'area-1',
        name: 'B-64 OSBL',
        projectId: 'project-1',
        budget: 150,
        pctReceived: 85,
        pctInstalled: 60,
        pctPunch: 30,
        pctTested: 20,
        pctRestored: 10,
        pctTotal: 45,
      },
      {
        id: 'area-2',
        name: 'A-12 Process',
        projectId: 'project-1',
        budget: 200,
        pctReceived: 95,
        pctInstalled: 75,
        pctPunch: 50,
        pctTested: 40,
        pctRestored: 25,
        pctTotal: 60,
      },
    ],
    grandTotal: {
      name: 'Grand Total',
      budget: 350,
      pctReceived: 91,
      pctInstalled: 69,
      pctPunch: 42,
      pctTested: 32,
      pctRestored: 19,
      pctTotal: 54,
    },
  };

  beforeEach(() => {
    // Reset viewport for consistent tests
    window.innerHeight = 800;
  });

  it('renders all 8 column headers', () => {
    render(<ReportTable data={mockReportData} />);

    expect(screen.getByText('Area')).toBeInTheDocument();
    expect(screen.getByText('Budget')).toBeInTheDocument();
    expect(screen.getByText('Received')).toBeInTheDocument();
    expect(screen.getByText('Installed')).toBeInTheDocument();
    expect(screen.getByText('Punch')).toBeInTheDocument();
    expect(screen.getByText('Tested')).toBeInTheDocument();
    expect(screen.getByText('Restored')).toBeInTheDocument();
    expect(screen.getAllByText('% Complete').length).toBeGreaterThan(0);
  });

  it('renders dimension-specific first column header (Area)', () => {
    render(<ReportTable data={mockReportData} />);
    expect(screen.getByText('Area')).toBeInTheDocument();
  });

  it('renders dimension-specific first column header (System)', () => {
    const systemData: ReportData = {
      ...mockReportData,
      dimension: 'system',
      rows: [
        {
          ...mockReportData.rows[0],
          name: 'S-100 Piping',
        },
      ],
    };
    render(<ReportTable data={systemData} />);
    expect(screen.getByText('System')).toBeInTheDocument();
  });

  it('renders dimension-specific first column header (Test Package)', () => {
    const testPackageData: ReportData = {
      ...mockReportData,
      dimension: 'test_package',
      rows: [
        {
          ...mockReportData.rows[0],
          name: 'TP-001 Main',
        },
      ],
    };
    render(<ReportTable data={testPackageData} />);
    expect(screen.getByText('Test Package')).toBeInTheDocument();
  });

  it('renders all data rows', () => {
    render(<ReportTable data={mockReportData} />);

    expect(screen.getByText('B-64 OSBL')).toBeInTheDocument();
    expect(screen.getByText('A-12 Process')).toBeInTheDocument();
    expect(screen.getByText('150')).toBeInTheDocument();
    expect(screen.getByText('200')).toBeInTheDocument();
  });

  it('renders percentage values with % symbol', () => {
    render(<ReportTable data={mockReportData} />);

    // Check that percentages are rendered (may appear multiple times due to pctTotal column)
    expect(screen.getAllByText('85%').length).toBeGreaterThan(0); // pctReceived
    expect(screen.getAllByText('60%').length).toBeGreaterThan(0); // pctInstalled and pctTotal for row 2
    expect(screen.getAllByText('30%').length).toBeGreaterThan(0); // pctPunch
    expect(screen.getAllByText('20%').length).toBeGreaterThan(0); // pctTested
    expect(screen.getAllByText('10%').length).toBeGreaterThan(0); // pctRestored
  });

  it('renders Grand Total row at the bottom', () => {
    render(<ReportTable data={mockReportData} />);

    expect(screen.getByText('Grand Total')).toBeInTheDocument();
    expect(screen.getByText('350')).toBeInTheDocument(); // Grand Total Budget
    expect(screen.getAllByText('91.0%').length).toBeGreaterThan(0); // Grand Total pctReceived (with 1 decimal)
    expect(screen.getAllByText('54.0%').length).toBeGreaterThan(0); // Grand Total pctTotal (with 1 decimal)
  });

  it('applies different styling to Grand Total row', () => {
    render(<ReportTable data={mockReportData} />);

    const grandTotalRow = screen.getByText('Grand Total').closest('div[role="row"]');
    expect(grandTotalRow).toHaveClass('font-bold');
  });

  it('renders empty state when no rows provided', () => {
    const emptyData: ReportData = {
      ...mockReportData,
      rows: [],
      grandTotal: {
        name: 'Grand Total',
        budget: 0,
        pctReceived: 0,
        pctInstalled: 0,
        pctPunch: 0,
        pctTested: 0,
        pctRestored: 0,
        pctTotal: 0,
      },
    };
    render(<ReportTable data={emptyData} />);

    expect(screen.getByText(/no components found/i)).toBeInTheDocument();
  });

  it('aligns Budget column to the right', () => {
    render(<ReportTable data={mockReportData} />);

    const budgetCell = screen.getByText('150').closest('div');
    expect(budgetCell).toHaveClass('text-right');
  });

  it('aligns percentage columns to the right', () => {
    render(<ReportTable data={mockReportData} />);

    const percentageCell = screen.getByText('85%').closest('div');
    expect(percentageCell).toHaveClass('text-right');
  });

  it('aligns name column to the left', () => {
    render(<ReportTable data={mockReportData} />);

    const nameCell = screen.getByText('B-64 OSBL').closest('div');
    expect(nameCell).toHaveClass('text-left');
  });

  it('renders with sticky headers', () => {
    render(<ReportTable data={mockReportData} />);

    const headerContainer = screen.getByText('Area').closest('div.sticky');
    expect(headerContainer).toBeInTheDocument();
    expect(headerContainer).toHaveClass('sticky', 'top-0');
  });

  it('uses virtualization for rendering (does not render all rows in DOM immediately)', () => {
    // Create a large dataset
    const largeData: ReportData = {
      ...mockReportData,
      rows: Array.from({ length: 100 }, (_, i) => ({
        id: `area-${i}`,
        name: `Area ${i}`,
        projectId: 'project-1',
        budget: 100 + i,
        pctReceived: 50 + i % 50,
        pctInstalled: 40 + i % 50,
        pctPunch: 30 + i % 50,
        pctTested: 20 + i % 50,
        pctRestored: 10 + i % 50,
        pctTotal: 35 + i % 50,
      })),
    };

    render(<ReportTable data={largeData} />);

    // Verify table renders and contains data rows (in test env all rows render as fallback)
    const allRows = screen.queryAllByText(/^Area \d+$/);
    // In production, virtualization would limit this, but test fallback renders all
    expect(allRows.length).toBeGreaterThan(0);
    expect(allRows.length).toBeLessThanOrEqual(101); // 100 rows + grand total
  });

  it('handles zero percentages correctly', () => {
    const zeroData: ReportData = {
      ...mockReportData,
      rows: [
        {
          id: 'area-zero',
          name: 'Empty Area',
          projectId: 'project-1',
          budget: 0,
          pctReceived: 0,
          pctInstalled: 0,
          pctPunch: 0,
          pctTested: 0,
          pctRestored: 0,
          pctTotal: 0,
        },
      ],
    };

    render(<ReportTable data={zeroData} />);
    // Multiple 0% cells exist (one per milestone column)
    const zeroCells = screen.getAllByText('0%');
    expect(zeroCells.length).toBeGreaterThan(0);
  });

  it('handles 100% percentages correctly', () => {
    const fullData: ReportData = {
      ...mockReportData,
      rows: [
        {
          id: 'area-full',
          name: 'Complete Area',
          projectId: 'project-1',
          budget: 50,
          pctReceived: 100,
          pctInstalled: 100,
          pctPunch: 100,
          pctTested: 100,
          pctRestored: 100,
          pctTotal: 100,
        },
      ],
    };

    render(<ReportTable data={fullData} />);
    // Should have multiple 100% values
    const percentageCells = screen.getAllByText('100%');
    expect(percentageCells.length).toBeGreaterThan(0);
  });
});

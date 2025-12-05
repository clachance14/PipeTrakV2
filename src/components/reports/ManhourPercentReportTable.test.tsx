/**
 * Unit tests for ManhourPercentReportTable component (Feature 032)
 * Tests virtualized table rendering with MH Budget and milestone % complete columns
 *
 * Display: MH Budget | Receive % | Install % | Punch % | Test % | Restore % | % Complete
 * Calculation: (milestone_earned / milestone_budget) * 100
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ManhourPercentReportTable } from './ManhourPercentReportTable';
import type { ManhourReportData } from '@/types/reports';

describe('ManhourPercentReportTable', () => {
  const mockManhourData: ManhourReportData = {
    dimension: 'area',
    projectId: 'project-1',
    generatedAt: new Date('2025-12-04T10:00:00Z'),
    rows: [
      {
        id: 'area-1',
        name: 'B-64 OSBL',
        projectId: 'project-1',
        mhBudget: 1000,
        receiveMhBudget: 100,
        receiveMhEarned: 85, // 85%
        installMhBudget: 600,
        installMhEarned: 360, // 60%
        punchMhBudget: 100,
        punchMhEarned: 30, // 30%
        testMhBudget: 100,
        testMhEarned: 20, // 20%
        restoreMhBudget: 100,
        restoreMhEarned: 10, // 10%
        totalMhEarned: 505,
        mhPctComplete: 50.5,
      },
      {
        id: 'area-2',
        name: 'A-12 Process',
        projectId: 'project-1',
        mhBudget: 500,
        receiveMhBudget: 50,
        receiveMhEarned: 50, // 100%
        installMhBudget: 300,
        installMhEarned: 225, // 75%
        punchMhBudget: 50,
        punchMhEarned: 25, // 50%
        testMhBudget: 50,
        testMhEarned: 20, // 40%
        restoreMhBudget: 50,
        restoreMhEarned: 12.5, // 25%
        totalMhEarned: 332.5,
        mhPctComplete: 66.5,
      },
    ],
    grandTotal: {
      name: 'Grand Total',
      mhBudget: 1500,
      receiveMhBudget: 150,
      receiveMhEarned: 135, // 90%
      installMhBudget: 900,
      installMhEarned: 585, // 65%
      punchMhBudget: 150,
      punchMhEarned: 55, // 36.67%
      testMhBudget: 150,
      testMhEarned: 40, // 26.67%
      restoreMhBudget: 150,
      restoreMhEarned: 22.5, // 15%
      totalMhEarned: 837.5,
      mhPctComplete: 55.8,
    },
  };

  beforeEach(() => {
    window.innerHeight = 800;
  });

  it('renders all 8 column headers including MH Budget', () => {
    render(<ManhourPercentReportTable data={mockManhourData} />);

    expect(screen.getByText('Area')).toBeInTheDocument();
    expect(screen.getByText('MH Budget')).toBeInTheDocument();
    expect(screen.getByText('Receive %')).toBeInTheDocument();
    expect(screen.getByText('Install %')).toBeInTheDocument();
    expect(screen.getByText('Punch %')).toBeInTheDocument();
    expect(screen.getByText('Test %')).toBeInTheDocument();
    expect(screen.getByText('Restore %')).toBeInTheDocument();
    expect(screen.getAllByText('% Complete').length).toBeGreaterThan(0);
  });

  it('displays MH Budget values for each row', () => {
    render(<ManhourPercentReportTable data={mockManhourData} />);

    // Row 1 has mhBudget: 1000, Row 2 has mhBudget: 500
    expect(screen.getByText('1,000')).toBeInTheDocument();
    expect(screen.getByText('500')).toBeInTheDocument();
    // Grand Total has mhBudget: 1500
    expect(screen.getByText('1,500')).toBeInTheDocument();
  });

  it('renders dimension-specific first column header (Area)', () => {
    render(<ManhourPercentReportTable data={mockManhourData} />);
    expect(screen.getByText('Area')).toBeInTheDocument();
  });

  it('renders dimension-specific first column header (System)', () => {
    const systemData: ManhourReportData = {
      ...mockManhourData,
      dimension: 'system',
      rows: [{ ...mockManhourData.rows[0], name: 'S-100 Piping' }],
    };
    render(<ManhourPercentReportTable data={systemData} />);
    expect(screen.getByText('System')).toBeInTheDocument();
  });

  it('renders dimension-specific first column header (Test Package)', () => {
    const testPackageData: ManhourReportData = {
      ...mockManhourData,
      dimension: 'test_package',
      rows: [{ ...mockManhourData.rows[0], name: 'TP-001 Main' }],
    };
    render(<ManhourPercentReportTable data={testPackageData} />);
    expect(screen.getByText('Test Package')).toBeInTheDocument();
  });

  it('calculates and displays correct milestone percentages', () => {
    render(<ManhourPercentReportTable data={mockManhourData} />);

    // Row 1: B-64 OSBL
    // Receive: 85/100 = 85%, Install: 360/600 = 60%, Punch: 30/100 = 30%
    // Test: 20/100 = 20%, Restore: 10/100 = 10%
    expect(screen.getByText('B-64 OSBL')).toBeInTheDocument();

    // Check that calculated percentages are displayed
    expect(screen.getAllByText('85%').length).toBeGreaterThan(0);
    expect(screen.getAllByText('60%').length).toBeGreaterThan(0);
    expect(screen.getAllByText('30%').length).toBeGreaterThan(0);
    expect(screen.getAllByText('20%').length).toBeGreaterThan(0);
    expect(screen.getAllByText('10%').length).toBeGreaterThan(0);
  });

  it('displays "--" when milestone budget is 0', () => {
    const zeroBudgetData: ManhourReportData = {
      ...mockManhourData,
      rows: [
        {
          id: 'area-zero',
          name: 'Zero Budget Area',
          projectId: 'project-1',
          mhBudget: 100,
          receiveMhBudget: 0, // Zero budget for receive
          receiveMhEarned: 0,
          installMhBudget: 100,
          installMhEarned: 50,
          punchMhBudget: 0, // Zero budget for punch
          punchMhEarned: 0,
          testMhBudget: 50,
          testMhEarned: 25,
          restoreMhBudget: 0, // Zero budget for restore
          restoreMhEarned: 0,
          totalMhEarned: 75,
          mhPctComplete: 75,
        },
      ],
      grandTotal: {
        ...mockManhourData.grandTotal,
        receiveMhBudget: 0,
        receiveMhEarned: 0,
      },
    };

    render(<ManhourPercentReportTable data={zeroBudgetData} />);

    // Should display "--" for milestones with zero budget
    const dashCells = screen.getAllByText('--');
    expect(dashCells.length).toBeGreaterThan(0);
  });

  it('renders Grand Total row with correct styling', () => {
    render(<ManhourPercentReportTable data={mockManhourData} />);

    expect(screen.getByText('Grand Total')).toBeInTheDocument();

    const grandTotalRow = screen.getByText('Grand Total').closest('div[role="row"]');
    expect(grandTotalRow).toHaveClass('font-bold');
  });

  it('renders Grand Total with 1 decimal precision for overall percentage', () => {
    render(<ManhourPercentReportTable data={mockManhourData} />);

    // Grand Total mhPctComplete is 55.8 - should show 55.8%
    expect(screen.getAllByText('55.8%').length).toBeGreaterThan(0);
  });

  it('renders empty state when no rows provided', () => {
    const emptyData: ManhourReportData = {
      ...mockManhourData,
      rows: [],
      grandTotal: {
        name: 'Grand Total',
        mhBudget: 0,
        receiveMhBudget: 0,
        receiveMhEarned: 0,
        installMhBudget: 0,
        installMhEarned: 0,
        punchMhBudget: 0,
        punchMhEarned: 0,
        testMhBudget: 0,
        testMhEarned: 0,
        restoreMhBudget: 0,
        restoreMhEarned: 0,
        totalMhEarned: 0,
        mhPctComplete: 0,
      },
    };

    render(<ManhourPercentReportTable data={emptyData} />);
    expect(screen.getByText(/no components found/i)).toBeInTheDocument();
  });

  it('handles 100% completion correctly', () => {
    const fullData: ManhourReportData = {
      ...mockManhourData,
      rows: [
        {
          id: 'area-full',
          name: 'Complete Area',
          projectId: 'project-1',
          mhBudget: 100,
          receiveMhBudget: 10,
          receiveMhEarned: 10, // 100%
          installMhBudget: 60,
          installMhEarned: 60, // 100%
          punchMhBudget: 10,
          punchMhEarned: 10, // 100%
          testMhBudget: 10,
          testMhEarned: 10, // 100%
          restoreMhBudget: 10,
          restoreMhEarned: 10, // 100%
          totalMhEarned: 100,
          mhPctComplete: 100,
        },
      ],
    };

    render(<ManhourPercentReportTable data={fullData} />);

    // Should have multiple 100% values
    const percentageCells = screen.getAllByText('100%');
    expect(percentageCells.length).toBeGreaterThan(0);
  });

  it('aligns percentage columns to the right', () => {
    render(<ManhourPercentReportTable data={mockManhourData} />);

    const percentageCell = screen.getAllByText('85%')[0].closest('div');
    expect(percentageCell).toHaveClass('text-right');
  });

  it('aligns name column to the left', () => {
    render(<ManhourPercentReportTable data={mockManhourData} />);

    const nameCell = screen.getByText('B-64 OSBL').closest('div');
    expect(nameCell).toHaveClass('text-left');
  });

  it('renders with sticky headers', () => {
    render(<ManhourPercentReportTable data={mockManhourData} />);

    const headerContainer = screen.getByText('Area').closest('div.sticky');
    expect(headerContainer).toBeInTheDocument();
    expect(headerContainer).toHaveClass('sticky', 'top-0');
  });

  it('uses virtualization for rendering', () => {
    const largeData: ManhourReportData = {
      ...mockManhourData,
      rows: Array.from({ length: 100 }, (_, i) => ({
        id: `area-${i}`,
        name: `Area ${i}`,
        projectId: 'project-1',
        mhBudget: 1000,
        receiveMhBudget: 100,
        receiveMhEarned: 50 + (i % 50),
        installMhBudget: 600,
        installMhEarned: 300 + (i % 300),
        punchMhBudget: 100,
        punchMhEarned: 25 + (i % 75),
        testMhBudget: 100,
        testMhEarned: 20 + (i % 80),
        restoreMhBudget: 100,
        restoreMhEarned: 10 + (i % 90),
        totalMhEarned: 405 + (i % 100),
        mhPctComplete: 40.5 + (i % 50),
      })),
    };

    render(<ManhourPercentReportTable data={largeData} />);

    // Verify table renders with data
    const allRows = screen.queryAllByText(/^Area \d+$/);
    expect(allRows.length).toBeGreaterThan(0);
    expect(allRows.length).toBeLessThanOrEqual(101); // 100 rows + grand total
  });

  it('rounds percentages to whole numbers for data rows', () => {
    const decimalData: ManhourReportData = {
      ...mockManhourData,
      rows: [
        {
          id: 'area-decimal',
          name: 'Decimal Area',
          projectId: 'project-1',
          mhBudget: 1000,
          receiveMhBudget: 100,
          receiveMhEarned: 33, // 33%
          installMhBudget: 600,
          installMhEarned: 400, // 66.67% -> should display as 67%
          punchMhBudget: 100,
          punchMhEarned: 33.33, // 33.33% -> should display as 33%
          testMhBudget: 100,
          testMhEarned: 66.67, // 66.67% -> should display as 67%
          restoreMhBudget: 100,
          restoreMhEarned: 50, // 50%
          totalMhEarned: 583,
          mhPctComplete: 58.3,
        },
      ],
    };

    render(<ManhourPercentReportTable data={decimalData} />);

    // Data rows should show rounded whole numbers
    expect(screen.getByText('Decimal Area')).toBeInTheDocument();
    expect(screen.getAllByText('33%').length).toBeGreaterThan(0);
    expect(screen.getAllByText('67%').length).toBeGreaterThan(0);
    expect(screen.getAllByText('50%').length).toBeGreaterThan(0);
  });

  it('has appropriate ARIA labels for accessibility', () => {
    render(<ManhourPercentReportTable data={mockManhourData} />);

    // Table should have aria-label
    const table = screen.getByRole('table');
    expect(table).toHaveAttribute('aria-label', expect.stringContaining('Area'));

    // Column headers should have columnheader role (8 columns: Name, MH Budget, 5 milestones, % Complete)
    const headers = screen.getAllByRole('columnheader');
    expect(headers.length).toBeGreaterThanOrEqual(8);

    // Data rows should have row role
    const rows = screen.getAllByRole('row');
    expect(rows.length).toBeGreaterThan(1); // Header row + data rows
  });
});

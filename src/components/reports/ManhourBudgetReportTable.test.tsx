/**
 * ManhourBudgetReportTable Component Tests
 * Tests for budget-only manhour report table
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ManhourBudgetReportTable } from './ManhourBudgetReportTable';
import type { ManhourReportData } from '@/types/reports';

// Mock the report preferences store
const mockToggleManhourBudgetSort = vi.fn();
vi.mock('@/stores/useReportPreferencesStore', () => ({
  useReportPreferencesStore: () => ({
    manhourBudgetReport: {
      sortColumn: 'name',
      sortDirection: 'asc',
    },
    toggleManhourBudgetSort: mockToggleManhourBudgetSort,
  }),
}));

describe('ManhourBudgetReportTable', () => {
  const mockData: ManhourReportData = {
    dimension: 'area',
    projectId: 'test-project',
    generatedAt: new Date('2026-02-17'),
    rows: [
      {
        id: '1',
        name: 'Area A',
        projectId: 'test-project',
        mhBudget: 1000,
        receiveMhBudget: 100,
        receiveMhEarned: 50,
        installMhBudget: 400,
        installMhEarned: 200,
        punchMhBudget: 200,
        punchMhEarned: 100,
        testMhBudget: 200,
        testMhEarned: 100,
        restoreMhBudget: 100,
        restoreMhEarned: 50,
        totalMhEarned: 500,
        mhPctComplete: 50,
      },
      {
        id: '2',
        name: 'Area B',
        projectId: 'test-project',
        mhBudget: 500,
        receiveMhBudget: 50,
        receiveMhEarned: 25,
        installMhBudget: 200,
        installMhEarned: 100,
        punchMhBudget: 100,
        punchMhEarned: 50,
        testMhBudget: 100,
        testMhEarned: 50,
        restoreMhBudget: 50,
        restoreMhEarned: 25,
        totalMhEarned: 250,
        mhPctComplete: 50,
      },
    ],
    grandTotal: {
      name: 'Grand Total',
      mhBudget: 1500,
      receiveMhBudget: 150,
      receiveMhEarned: 75,
      installMhBudget: 600,
      installMhEarned: 300,
      punchMhBudget: 300,
      punchMhEarned: 150,
      testMhBudget: 300,
      testMhEarned: 150,
      restoreMhBudget: 150,
      restoreMhEarned: 75,
      totalMhEarned: 750,
      mhPctComplete: 50,
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders budget columns correctly', () => {
    render(<ManhourBudgetReportTable data={mockData} />);

    // Check header columns
    expect(screen.getByRole('columnheader', { name: /area/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /mh budget/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /receive/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /install/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /punch/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /test/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /restore/i })).toBeInTheDocument();
  });

  it('renders data rows with budget values', () => {
    render(<ManhourBudgetReportTable data={mockData} />);

    // Check data values - budget columns should show budget values, not earned
    expect(screen.getByText('Area A')).toBeInTheDocument();
    expect(screen.getByText('1,000')).toBeInTheDocument(); // mhBudget for Area A
    expect(screen.getByText('Area B')).toBeInTheDocument();
    expect(screen.getByText('500')).toBeInTheDocument(); // mhBudget for Area B
  });

  it('renders Grand Total row', () => {
    render(<ManhourBudgetReportTable data={mockData} />);

    expect(screen.getByText('Grand Total')).toBeInTheDocument();
    expect(screen.getByText('1,500')).toBeInTheDocument(); // Grand total mhBudget
  });

  it('shows empty state when no data', () => {
    const emptyData: ManhourReportData = {
      ...mockData,
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

    render(<ManhourBudgetReportTable data={emptyData} />);

    expect(screen.getByText(/no components found/i)).toBeInTheDocument();
  });

  it('calls toggleManhourBudgetSort when column header is clicked', async () => {
    const user = userEvent.setup();
    render(<ManhourBudgetReportTable data={mockData} />);

    const mhBudgetHeader = screen.getByRole('columnheader', { name: /mh budget/i });
    await user.click(mhBudgetHeader);

    expect(mockToggleManhourBudgetSort).toHaveBeenCalledWith('mhBudget');
  });
});

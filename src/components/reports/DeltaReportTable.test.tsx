/**
 * DeltaReportTable Component Tests (Feature 033 - Timeline Report Filter)
 * Tests rendering, delta formatting, color coding, and responsive layouts
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DeltaReportTable } from './DeltaReportTable';
import type { ProgressDeltaReportData } from '@/types/reports';

describe('DeltaReportTable', () => {
  // Mock data now uses manhourRows (MH Budget instead of Active Components)
  const mockDataWithVariedDeltas: ProgressDeltaReportData = {
    dimension: 'area',
    rows: [
      {
        id: '1',
        name: 'Area A',
        componentsWithActivity: 5,
        deltaReceived: 10.5,
        deltaInstalled: -5.0,
        deltaPunch: 0,
        deltaTested: 2.5,
        deltaRestored: -1.2,
        deltaTotal: 8.2,
      },
      {
        id: '2',
        name: 'Area B',
        componentsWithActivity: 3,
        deltaReceived: -2.3,
        deltaInstalled: 15.7,
        deltaPunch: 0,
        deltaTested: 0,
        deltaRestored: 3.1,
        deltaTotal: 12.5,
      },
    ],
    grandTotal: {
      name: 'Grand Total',
      componentsWithActivity: 8,
      deltaReceived: 8.2,
      deltaInstalled: 10.7,
      deltaPunch: 0,
      deltaTested: 2.5,
      deltaRestored: 1.9,
      deltaTotal: 20.7,
    },
    dateRange: { preset: 'last_7_days', startDate: null, endDate: null },
    generatedAt: new Date('2025-01-15T12:00:00Z'),
    projectId: 'project-1',
    manhourRows: [
      {
        id: '1',
        name: 'Area A',
        componentsWithActivity: 5,
        mhBudget: 1000,
        deltaReceiveMhEarned: 105,   // 10.5% of 1000
        deltaInstallMhEarned: -50,   // -5.0% of 1000
        deltaPunchMhEarned: 0,       // 0% of 1000
        deltaTestMhEarned: 25,       // 2.5% of 1000
        deltaRestoreMhEarned: -12,   // -1.2% of 1000
        deltaTotalMhEarned: 82,
        deltaMhPctComplete: 8.2,
      },
      {
        id: '2',
        name: 'Area B',
        componentsWithActivity: 3,
        mhBudget: 500,
        deltaReceiveMhEarned: -11.5, // -2.3% of 500
        deltaInstallMhEarned: 78.5,  // 15.7% of 500
        deltaPunchMhEarned: 0,
        deltaTestMhEarned: 0,
        deltaRestoreMhEarned: 15.5,  // 3.1% of 500
        deltaTotalMhEarned: 62.5,
        deltaMhPctComplete: 12.5,
      },
    ],
    manhourGrandTotal: {
      name: 'Grand Total',
      componentsWithActivity: 8,
      mhBudget: 1500,
      deltaReceiveMhEarned: 93.5,    // ~6.2% overall
      deltaInstallMhEarned: 28.5,    // ~1.9% overall
      deltaPunchMhEarned: 0,
      deltaTestMhEarned: 25,
      deltaRestoreMhEarned: 3.5,
      deltaTotalMhEarned: 144.5,
      deltaMhPctComplete: 9.6,       // ~9.6% overall
    },
  };

  const emptyData: ProgressDeltaReportData = {
    dimension: 'area',
    rows: [],
    grandTotal: {
      name: 'Grand Total',
      componentsWithActivity: 0,
      deltaReceived: 0,
      deltaInstalled: 0,
      deltaPunch: 0,
      deltaTested: 0,
      deltaRestored: 0,
      deltaTotal: 0,
    },
    dateRange: { preset: 'last_7_days', startDate: null, endDate: null },
    generatedAt: new Date(),
    projectId: 'project-1',
    manhourRows: [],
    manhourGrandTotal: {
      name: 'Grand Total',
      componentsWithActivity: 0,
      mhBudget: 0,
      deltaReceiveMhEarned: 0,
      deltaInstallMhEarned: 0,
      deltaPunchMhEarned: 0,
      deltaTestMhEarned: 0,
      deltaRestoreMhEarned: 0,
      deltaTotalMhEarned: 0,
      deltaMhPctComplete: 0,
    },
  };

  describe('Table Header', () => {
    it('renders correct column headers for desktop layout', () => {
      render(<DeltaReportTable data={mockDataWithVariedDeltas} />);

      // Check dimension column (always visible) - text content
      expect(screen.getByText('Area')).toBeInTheDocument();

      // Check MH Budget column (always visible) - text content
      expect(screen.getByRole('columnheader', { name: /manhour budget/i })).toBeInTheDocument();

      // Check desktop-only columns (use aria-labels since they have text inside divs)
      expect(screen.getByRole('columnheader', { name: /change in received percentage/i })).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: /change in installed percentage/i })).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: /change in punch percentage/i })).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: /change in tested percentage/i })).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: /change in restored percentage/i })).toBeInTheDocument();

      // Check total column (appears twice: mobile + desktop)
      const totalColumns = screen.getAllByRole('columnheader', { name: /change in total percentage complete/i });
      expect(totalColumns).toHaveLength(2); // Mobile + Desktop versions
    });

    it('renders correct dimension label based on dimension prop', () => {
      const systemData = { ...mockDataWithVariedDeltas, dimension: 'system' as const };
      render(<DeltaReportTable data={systemData} />);

      expect(screen.getByText('System')).toBeInTheDocument();
    });

    it('uses correct ARIA labels for columns', () => {
      render(<DeltaReportTable data={mockDataWithVariedDeltas} />);

      expect(screen.getByRole('columnheader', { name: /change in received percentage/i })).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: /change in installed percentage/i })).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: /change in punch percentage/i })).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: /change in tested percentage/i })).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: /change in restored percentage/i })).toBeInTheDocument();

      // Total column appears twice (mobile + desktop)
      const totalColumns = screen.getAllByRole('columnheader', { name: /change in total percentage complete/i });
      expect(totalColumns).toHaveLength(2);
    });
  });

  describe('Data Rows', () => {
    it('renders all data rows with correct content', () => {
      render(<DeltaReportTable data={mockDataWithVariedDeltas} />);

      // Check row names
      expect(screen.getByText('Area A')).toBeInTheDocument();
      expect(screen.getByText('Area B')).toBeInTheDocument();

      // Check rows exist with correct aria-labels
      expect(screen.getByRole('row', { name: /Area A progress delta data/i })).toBeInTheDocument();
      expect(screen.getByRole('row', { name: /Area B progress delta data/i })).toBeInTheDocument();
    });

    it('renders correct number of rows', () => {
      render(<DeltaReportTable data={mockDataWithVariedDeltas} />);

      // 2 data rows + 1 grand total row = 3 rows total
      const dataRows = screen.getAllByTestId(/^delta-report-row-/);
      expect(dataRows).toHaveLength(3); // 2 data rows + 1 grand total
    });
  });

  describe('Delta Value Formatting', () => {
    it('formats positive delta values with + prefix and green color', () => {
      render(<DeltaReportTable data={mockDataWithVariedDeltas} />);

      // Check for positive deltas in Area A (105 / 1000 * 100 = 10.5%)
      const positiveDelta = screen.getByRole('cell', { name: /Received delta \+10\.5%/i });
      expect(positiveDelta).toHaveTextContent('+10.5%');
      expect(positiveDelta).toHaveClass('text-green-600');
    });

    it('formats negative delta values without + prefix and red color', () => {
      render(<DeltaReportTable data={mockDataWithVariedDeltas} />);

      // Check for negative deltas in Area A (-50 / 1000 * 100 = -5.0%)
      const negativeDelta = screen.getByRole('cell', { name: /Installed delta -5\.0%/i });
      expect(negativeDelta).toHaveTextContent('-5.0%');
      expect(negativeDelta).toHaveClass('text-red-600');
    });

    it('formats zero delta values with neutral styling', () => {
      render(<DeltaReportTable data={mockDataWithVariedDeltas} />);

      // Check for zero deltas (Punch - multiple instances exist)
      const zeroDelta = screen.getAllByRole('cell', { name: /Punch delta 0\.0%/i })[0];
      expect(zeroDelta).toHaveTextContent('0.0%');
      expect(zeroDelta).toHaveClass('text-muted-foreground');
    });

    it('formats delta values to 1 decimal place', () => {
      render(<DeltaReportTable data={mockDataWithVariedDeltas} />);

      // Check decimal formatting (calculated from manhour earned / budget)
      // Area A: 105 / 1000 * 100 = 10.5%
      expect(screen.getByRole('cell', { name: /Received delta \+10\.5%/i })).toHaveTextContent('+10.5%');
      // Area A: -50 / 1000 * 100 = -5.0%
      expect(screen.getByRole('cell', { name: /Installed delta -5\.0%/i })).toHaveTextContent('-5.0%');

      // Tested delta appears in multiple rows, check first instance (Area A: 25 / 1000 * 100 = 2.5%)
      const testedDelta = screen.getAllByRole('cell', { name: /Tested delta \+2\.5%/i })[0];
      expect(testedDelta).toHaveTextContent('+2.5%');
    });
  });

  describe('Grand Total Row', () => {
    it('renders grand total row at the bottom', () => {
      render(<DeltaReportTable data={mockDataWithVariedDeltas} />);

      const grandTotalRow = screen.getByRole('row', { name: /grand total summary row/i });
      expect(grandTotalRow).toBeInTheDocument();
      expect(grandTotalRow).toHaveTextContent('Grand Total');
    });

    it('applies bold styling to grand total row', () => {
      render(<DeltaReportTable data={mockDataWithVariedDeltas} />);

      const grandTotalRow = screen.getByRole('row', { name: /grand total summary row/i });
      expect(grandTotalRow).toHaveClass('font-bold');
      expect(grandTotalRow).toHaveClass('bg-slate-700');
    });

    it('displays correct grand total values', () => {
      render(<DeltaReportTable data={mockDataWithVariedDeltas} />);

      const grandTotalRow = screen.getByRole('row', { name: /grand total summary row/i });

      // Check MH Budget (formatted - 1500 shows as "1,500")
      expect(grandTotalRow).toHaveTextContent('1,500');

      // Check formatted deltas (calculated from mhEarned / budget * 100)
      // deltaReceiveMhEarned: 93.5 / 1500 * 100 = 6.2%
      expect(grandTotalRow).toHaveTextContent('+6.2%');
      // deltaMhPctComplete: 9.6%
      expect(grandTotalRow).toHaveTextContent('+9.6%');
    });
  });

  describe('Empty State', () => {
    it('renders empty state message when no rows', () => {
      render(<DeltaReportTable data={emptyData} />);

      expect(
        screen.getByText(/no component activity found for the selected time period/i)
      ).toBeInTheDocument();
    });

    it('does not render table when no rows', () => {
      render(<DeltaReportTable data={emptyData} />);

      expect(screen.queryByRole('table')).not.toBeInTheDocument();
      expect(screen.queryByRole('columnheader')).not.toBeInTheDocument();
    });

    it('does not render grand total when no rows', () => {
      render(<DeltaReportTable data={emptyData} />);

      expect(screen.queryByText('Grand Total')).not.toBeInTheDocument();
    });
  });

  describe('Responsive Layout', () => {
    it('renders mobile layout columns (3 columns)', () => {
      render(<DeltaReportTable data={mockDataWithVariedDeltas} />);

      // Mobile shows: Name, MH Budget, Δ % Complete (total)
      // Check for mobile-specific total column
      const mobileColumns = screen.getAllByRole('columnheader').filter((header) => {
        return header.classList.contains('lg:hidden');
      });
      expect(mobileColumns.length).toBeGreaterThanOrEqual(1);
    });

    it('renders desktop layout columns (8 columns)', () => {
      render(<DeltaReportTable data={mockDataWithVariedDeltas} />);

      // Desktop shows all 8 columns
      // Check for desktop-only columns
      const desktopColumns = screen.getAllByRole('columnheader').filter((header) => {
        return header.classList.contains('hidden') && header.classList.contains('lg:block');
      });
      expect(desktopColumns.length).toBeGreaterThanOrEqual(6); // 6 desktop-only milestone columns
    });

    it('applies correct grid layout classes for mobile', () => {
      const { container } = render(<DeltaReportTable data={mockDataWithVariedDeltas} />);

      // Check for mobile grid layout
      const gridElements = container.querySelectorAll('.grid-cols-\\[2fr_1fr_1fr\\]');
      expect(gridElements.length).toBeGreaterThan(0);
    });

    it('applies correct grid layout classes for desktop', () => {
      const { container } = render(<DeltaReportTable data={mockDataWithVariedDeltas} />);

      // Check for desktop grid layout
      const gridElements = container.querySelectorAll('.lg\\:grid-cols-\\[2fr_1fr_1fr_1fr_1fr_1fr_1fr_1fr\\]');
      expect(gridElements.length).toBeGreaterThan(0);
    });
  });

  describe('Accessibility', () => {
    it('has correct ARIA table role', () => {
      render(<DeltaReportTable data={mockDataWithVariedDeltas} />);

      expect(screen.getByRole('table')).toBeInTheDocument();
    });

    it('has descriptive aria-label for table', () => {
      render(<DeltaReportTable data={mockDataWithVariedDeltas} />);

      expect(
        screen.getByRole('table', { name: /progress delta report grouped by area/i })
      ).toBeInTheDocument();
    });

    it('has correct row and cell roles', () => {
      render(<DeltaReportTable data={mockDataWithVariedDeltas} />);

      expect(screen.getAllByRole('row').length).toBeGreaterThan(0);
      expect(screen.getAllByRole('cell').length).toBeGreaterThan(0);
    });

    it('has descriptive aria-labels for data rows', () => {
      render(<DeltaReportTable data={mockDataWithVariedDeltas} />);

      expect(screen.getByRole('row', { name: /area a progress delta data/i })).toBeInTheDocument();
      expect(screen.getByRole('row', { name: /area b progress delta data/i })).toBeInTheDocument();
    });

    it('has descriptive aria-labels for delta cells', () => {
      render(<DeltaReportTable data={mockDataWithVariedDeltas} />);

      expect(screen.getByRole('cell', { name: /received delta \+10\.5%/i })).toBeInTheDocument();
      expect(screen.getByRole('cell', { name: /installed delta -5\.0%/i })).toBeInTheDocument();

      // Punch delta appears in multiple rows (Area A, Area B, Grand Total)
      const punchCells = screen.getAllByRole('cell', { name: /punch delta 0\.0%/i });
      expect(punchCells.length).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    it('handles single row correctly', () => {
      const singleRowData = {
        ...mockDataWithVariedDeltas,
        rows: [mockDataWithVariedDeltas.rows[0]],
        manhourRows: [mockDataWithVariedDeltas.manhourRows[0]],
      };
      render(<DeltaReportTable data={singleRowData} />);

      expect(screen.getByText('Area A')).toBeInTheDocument();
      expect(screen.getByText('Grand Total')).toBeInTheDocument();
    });

    it('handles very large delta values', () => {
      const largeValuesData = {
        ...mockDataWithVariedDeltas,
        rows: [mockDataWithVariedDeltas.rows[0]],
        manhourRows: [
          {
            ...mockDataWithVariedDeltas.manhourRows[0],
            deltaMhPctComplete: 999.9,
          },
        ],
        manhourGrandTotal: {
          ...mockDataWithVariedDeltas.manhourGrandTotal,
          deltaMhPctComplete: 999.9,
        },
      };
      render(<DeltaReportTable data={largeValuesData} />);

      // Should appear at least once (in the data row)
      const largeDelta = screen.getAllByText('+999.9%');
      expect(largeDelta.length).toBeGreaterThan(0);
    });

    it('handles very small negative delta values', () => {
      const smallNegativeData = {
        ...mockDataWithVariedDeltas,
        rows: [mockDataWithVariedDeltas.rows[0]],
        manhourRows: [
          {
            ...mockDataWithVariedDeltas.manhourRows[0],
            deltaMhPctComplete: -0.1,
          },
        ],
        manhourGrandTotal: {
          ...mockDataWithVariedDeltas.manhourGrandTotal,
          deltaMhPctComplete: -0.1,
        },
      };
      render(<DeltaReportTable data={smallNegativeData} />);

      // Should appear at least once (in the data row)
      const smallDelta = screen.getAllByText('-0.1%');
      expect(smallDelta.length).toBeGreaterThan(0);
    });

    it('truncates long dimension names', () => {
      const longNameData = {
        ...mockDataWithVariedDeltas,
        rows: [mockDataWithVariedDeltas.rows[0]],
        manhourRows: [
          {
            ...mockDataWithVariedDeltas.manhourRows[0],
            name: 'Very Long Area Name That Should Be Truncated With Ellipsis',
          },
        ],
      };
      const { container } = render(<DeltaReportTable data={longNameData} />);

      const nameCell = container.querySelector('.truncate');
      expect(nameCell).toBeInTheDocument();
      expect(nameCell).toHaveTextContent('Very Long Area Name That Should Be Truncated With Ellipsis');
    });

    it('handles dimension change from area to system', () => {
      const systemData = {
        ...mockDataWithVariedDeltas,
        dimension: 'system' as const,
      };
      render(<DeltaReportTable data={systemData} />);

      expect(screen.getByRole('columnheader', { name: /system/i })).toBeInTheDocument();
      expect(
        screen.getByRole('table', { name: /progress delta report grouped by system/i })
      ).toBeInTheDocument();
    });

    it('handles dimension change from area to test_package', () => {
      const testPackageData = {
        ...mockDataWithVariedDeltas,
        dimension: 'test_package' as const,
      };
      render(<DeltaReportTable data={testPackageData} />);

      expect(screen.getByText('Test Package')).toBeInTheDocument();
    });
  });

  describe('Virtualization', () => {
    it('renders virtualized table body container', () => {
      render(<DeltaReportTable data={mockDataWithVariedDeltas} />);

      const tableBody = screen.getByTestId('delta-report-table-body');
      expect(tableBody).toBeInTheDocument();
      expect(tableBody).toHaveAttribute('role', 'rowgroup');
    });

    it('applies correct height to virtualized container', () => {
      render(<DeltaReportTable data={mockDataWithVariedDeltas} />);

      const tableBody = screen.getByTestId('delta-report-table-body');
      expect(tableBody).toHaveStyle({ height: '500px' });
    });

    it('renders all rows in test environment', () => {
      render(<DeltaReportTable data={mockDataWithVariedDeltas} />);

      // In test environment, virtualizer returns 0 items, so fallback renders all rows
      const dataRows = screen.getAllByTestId(/^delta-report-row-/);
      expect(dataRows).toHaveLength(3); // 2 data rows + 1 grand total
    });
  });
});

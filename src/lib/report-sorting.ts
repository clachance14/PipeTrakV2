/**
 * Sorting utilities for Report Tables
 * Used by ReportTable and FieldWeldReportTable components
 * Feature: Report Column Sorting
 */

import type {
  ProgressRow,
  FieldWeldProgressRow,
  ManhourProgressRow,
  ManhourDeltaRow,
  FieldWeldDeltaRow,
} from '@/types/reports';
import type {
  ComponentReportSortColumn,
  FieldWeldReportSortColumn,
  ManhourReportSortColumn,
  DeltaReportSortColumn,
  FieldWeldDeltaReportSortColumn,
  ManhourDeltaReportSortColumn,
  ManhourBudgetReportSortColumn,
} from '@/stores/useReportPreferencesStore';

/**
 * Sort component progress report rows by the specified column and direction
 *
 * @param rows - Array of progress rows to sort
 * @param sortColumn - Column to sort by
 * @param sortDirection - Sort direction ('asc' or 'desc')
 * @returns Sorted array of rows (original array is not mutated)
 */
export function sortComponentReportRows(
  rows: ProgressRow[],
  sortColumn: ComponentReportSortColumn,
  sortDirection: 'asc' | 'desc'
): ProgressRow[] {
  const multiplier = sortDirection === 'asc' ? 1 : -1;

  return [...rows].sort((a, b) => {
    if (sortColumn === 'name') {
      // Alphabetical sorting for name column
      return multiplier * a.name.localeCompare(b.name);
    }

    // Numeric sorting for all other columns
    const valueA = a[sortColumn];
    const valueB = b[sortColumn];

    return multiplier * (valueA - valueB);
  });
}

/**
 * Sort field weld progress report rows by the specified column and direction
 *
 * Handles:
 * - Name column: alphabetical sorting
 * - Numeric columns: totalWelds, weldCompleteCount, acceptedCount, etc.
 * - Nullable columns: ndePassRate, avgDaysToAcceptance (null values sort last)
 * - Welder-specific columns: firstPassRate, avgDaysToAcceptance
 * - X-ray tier columns: xray5Count, xray5PassRate, etc.
 *
 * @param rows - Array of field weld progress rows to sort
 * @param sortColumn - Column to sort by
 * @param sortDirection - Sort direction ('asc' or 'desc')
 * @returns Sorted array of rows (original array is not mutated)
 */
export function sortFieldWeldReportRows(
  rows: FieldWeldProgressRow[],
  sortColumn: FieldWeldReportSortColumn,
  sortDirection: 'asc' | 'desc'
): FieldWeldProgressRow[] {
  const multiplier = sortDirection === 'asc' ? 1 : -1;

  return [...rows].sort((a, b) => {
    // Map sort column to actual field name
    const fieldMapping: Record<FieldWeldReportSortColumn, keyof FieldWeldProgressRow> = {
      name: 'name',
      totalWelds: 'totalWelds',
      weldCompleteCount: 'weldCompleteCount',
      acceptedCount: 'acceptedCount',
      ndePassRate: 'ndePassRate',
      repairRate: 'repairRate',
      pctTotal: 'pctTotal',
      firstPassRate: 'firstPassAcceptanceRate',
      avgDaysToAcceptance: 'avgDaysToAcceptance',
      xray5Count: 'xray5pctCount',
      xray10Count: 'xray10pctCount',
      xray100Count: 'xray100pctCount',
      xray5PassRate: 'xray5pctPassRate',
      xray10PassRate: 'xray10pctPassRate',
      xray100PassRate: 'xray100pctPassRate',
    };

    const field = fieldMapping[sortColumn];

    if (sortColumn === 'name') {
      // Alphabetical sorting for name column
      return multiplier * a.name.localeCompare(b.name);
    }

    // Get values, handling potential undefined/null
    const valueA = a[field];
    const valueB = b[field];

    // Handle null/undefined values - sort them last regardless of direction
    const aIsNull = valueA === null || valueA === undefined;
    const bIsNull = valueB === null || valueB === undefined;

    if (aIsNull && bIsNull) return 0;
    if (aIsNull) return 1; // a goes last
    if (bIsNull) return -1; // b goes last

    // Numeric comparison
    return multiplier * ((valueA as number) - (valueB as number));
  });
}

/**
 * Sort manhour progress report rows by the specified column and direction
 *
 * @param rows - Array of manhour progress rows to sort
 * @param sortColumn - Column to sort by
 * @param sortDirection - Sort direction ('asc' or 'desc')
 * @returns Sorted array of rows (original array is not mutated)
 */
export function sortManhourReportRows(
  rows: ManhourProgressRow[],
  sortColumn: ManhourReportSortColumn,
  sortDirection: 'asc' | 'desc'
): ManhourProgressRow[] {
  const multiplier = sortDirection === 'asc' ? 1 : -1;

  return [...rows].sort((a, b) => {
    if (sortColumn === 'name') {
      return multiplier * a.name.localeCompare(b.name);
    }

    // Numeric sorting for all other columns
    const valueA = a[sortColumn];
    const valueB = b[sortColumn];

    return multiplier * (valueA - valueB);
  });
}

/**
 * Sort delta report rows (component progress delta) by the specified column and direction
 *
 * @param rows - Array of manhour delta rows to sort
 * @param sortColumn - Column to sort by
 * @param sortDirection - Sort direction ('asc' or 'desc')
 * @returns Sorted array of rows (original array is not mutated)
 */
export function sortDeltaReportRows(
  rows: ManhourDeltaRow[],
  sortColumn: DeltaReportSortColumn,
  sortDirection: 'asc' | 'desc'
): ManhourDeltaRow[] {
  const multiplier = sortDirection === 'asc' ? 1 : -1;

  return [...rows].sort((a, b) => {
    if (sortColumn === 'name') {
      return multiplier * a.name.localeCompare(b.name);
    }

    // Numeric sorting for all other columns
    const valueA = a[sortColumn];
    const valueB = b[sortColumn];

    return multiplier * (valueA - valueB);
  });
}

/**
 * Sort field weld delta report rows by the specified column and direction
 *
 * @param rows - Array of field weld delta rows to sort
 * @param sortColumn - Column to sort by
 * @param sortDirection - Sort direction ('asc' or 'desc')
 * @returns Sorted array of rows (original array is not mutated)
 */
export function sortFieldWeldDeltaReportRows(
  rows: FieldWeldDeltaRow[],
  sortColumn: FieldWeldDeltaReportSortColumn,
  sortDirection: 'asc' | 'desc'
): FieldWeldDeltaRow[] {
  const multiplier = sortDirection === 'asc' ? 1 : -1;

  return [...rows].sort((a, b) => {
    if (sortColumn === 'name') {
      return multiplier * a.name.localeCompare(b.name);
    }

    // Numeric sorting for all other columns
    const valueA = a[sortColumn];
    const valueB = b[sortColumn];

    return multiplier * (valueA - valueB);
  });
}

/**
 * Sort manhour delta report rows by the specified column and direction
 *
 * @param rows - Array of manhour delta rows to sort
 * @param sortColumn - Column to sort by
 * @param sortDirection - Sort direction ('asc' or 'desc')
 * @returns Sorted array of rows (original array is not mutated)
 */
export function sortManhourDeltaReportRows(
  rows: ManhourDeltaRow[],
  sortColumn: ManhourDeltaReportSortColumn,
  sortDirection: 'asc' | 'desc'
): ManhourDeltaRow[] {
  const multiplier = sortDirection === 'asc' ? 1 : -1;

  return [...rows].sort((a, b) => {
    if (sortColumn === 'name') {
      return multiplier * a.name.localeCompare(b.name);
    }

    // Numeric sorting for all other columns
    const valueA = a[sortColumn];
    const valueB = b[sortColumn];

    return multiplier * (valueA - valueB);
  });
}

/**
 * Sort manhour budget report rows by the specified column and direction
 *
 * @param rows - Array of manhour progress rows to sort (uses same type as manhour report)
 * @param sortColumn - Column to sort by (budget columns only)
 * @param sortDirection - Sort direction ('asc' or 'desc')
 * @returns Sorted array of rows (original array is not mutated)
 */
export function sortManhourBudgetReportRows(
  rows: ManhourProgressRow[],
  sortColumn: ManhourBudgetReportSortColumn,
  sortDirection: 'asc' | 'desc'
): ManhourProgressRow[] {
  const multiplier = sortDirection === 'asc' ? 1 : -1;

  return [...rows].sort((a, b) => {
    if (sortColumn === 'name') {
      return multiplier * a.name.localeCompare(b.name);
    }

    // Numeric sorting for all other columns
    const valueA = a[sortColumn];
    const valueB = b[sortColumn];

    return multiplier * (valueA - valueB);
  });
}

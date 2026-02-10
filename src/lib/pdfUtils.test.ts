/**
 * Unit Tests: pdfUtils — transformToTableProps inline delta support
 *
 * Tests that transformToTableProps correctly:
 * - Shows inline deltas within existing cells (e.g., "136 (+5)")
 * - Formats delta values with +/- prefix
 * - Matches delta rows to base rows by id
 * - Leaves output unchanged when deltaData is undefined
 * - Merges grand total inline delta values
 * - Does NOT add extra columns for deltas
 */

import { describe, it, expect } from 'vitest';
import {
  transformToTableProps,
  formatDeltaForPDF,
  buildPDFSubtitle,
} from './pdfUtils';
import type { FieldWeldReportData, FieldWeldDeltaReportData, ReportDateRange } from '@/types/reports';

// Minimal FieldWeldProgressRow factory
function makeRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'area-1',
    name: 'Area A',
    stencil: undefined,
    projectId: 'proj-1',
    totalWelds: 50,
    activeCount: 10,
    acceptedCount: 30,
    rejectedCount: 2,
    pctFitup: 80,
    pctWeldComplete: 60,
    pctAccepted: 50,
    ndeRequiredCount: 40,
    ndePassCount: 38,
    ndeFailCount: 2,
    ndePendingCount: 0,
    ndePassRate: 95,
    repairCount: 1,
    repairRate: 2,
    avgDaysToNDE: 3,
    avgDaysToAcceptance: 5,
    pctTotal: 55.5,
    fitupCount: 40,
    weldCompleteCount: 30,
    remainingCount: 20,
    ...overrides,
  };
}

function makeGrandTotal(overrides: Record<string, unknown> = {}) {
  return {
    ...makeRow({ id: '__grand_total__', name: 'Grand Total' }),
    totalWelds: 100,
    acceptedCount: 60,
    weldCompleteCount: 70,
    pctTotal: 65.0,
    ndePassRate: 92,
    repairRate: 3,
    remainingCount: 30,
    ...overrides,
  };
}

const baseReportData: FieldWeldReportData = {
  dimension: 'area',
  rows: [
    makeRow({ id: 'area-1', name: 'Area A', totalWelds: 50, weldCompleteCount: 30, acceptedCount: 20, pctTotal: 55.5 }),
    makeRow({ id: 'area-2', name: 'Area B', totalWelds: 80, weldCompleteCount: 60, acceptedCount: 50, pctTotal: 72.3 }),
  ] as FieldWeldReportData['rows'],
  grandTotal: makeGrandTotal() as FieldWeldReportData['grandTotal'],
  generatedAt: new Date('2026-02-10'),
  projectId: 'proj-1',
};

const baseDeltaData: FieldWeldDeltaReportData = {
  dimension: 'area',
  rows: [
    {
      id: 'area-1',
      name: 'Area A',
      weldsWithActivity: 5,
      deltaFitupCount: 2,
      deltaWeldCompleteCount: 3,
      deltaAcceptedCount: 1,
      deltaPctTotal: 2.5,
      deltaNewWelds: 4,
    },
    {
      id: 'area-2',
      name: 'Area B',
      weldsWithActivity: 8,
      deltaFitupCount: 5,
      deltaWeldCompleteCount: -2,
      deltaAcceptedCount: 0,
      deltaPctTotal: -1.3,
      deltaNewWelds: 0,
    },
  ],
  grandTotal: {
    name: 'Grand Total',
    weldsWithActivity: 13,
    deltaFitupCount: 7,
    deltaWeldCompleteCount: 1,
    deltaAcceptedCount: 1,
    deltaPctTotal: 1.2,
    deltaNewWelds: 4,
  },
  dateRange: { startDate: '2026-02-03', endDate: '2026-02-10' },
  generatedAt: new Date('2026-02-10'),
  projectId: 'proj-1',
};

describe('formatDeltaForPDF', () => {
  it('formats positive count with + prefix', () => {
    expect(formatDeltaForPDF(5, false)).toBe('+5');
  });

  it('formats negative count without prefix', () => {
    expect(formatDeltaForPDF(-3, false)).toBe('-3');
  });

  it('formats zero count as "0"', () => {
    expect(formatDeltaForPDF(0, false)).toBe('0');
  });

  it('formats positive percent with + prefix and % suffix', () => {
    expect(formatDeltaForPDF(2.5, true)).toBe('+2.5%');
  });

  it('formats negative percent with % suffix', () => {
    expect(formatDeltaForPDF(-1.3, true)).toBe('-1.3%');
  });

  it('formats zero percent as "0.0%"', () => {
    expect(formatDeltaForPDF(0, true)).toBe('0.0%');
  });
});

describe('transformToTableProps with inline deltaData', () => {
  it('does NOT add extra columns when deltaData is provided', () => {
    const withDelta = transformToTableProps(baseReportData, 'area', true, baseDeltaData);
    const without = transformToTableProps(baseReportData, 'area', true);
    expect(withDelta.columns.length).toBe(without.columns.length);
    expect(withDelta.columns.map(c => c.key)).toEqual(without.columns.map(c => c.key));
  });

  it('returns numeric values when deltaData is undefined', () => {
    const result = transformToTableProps(baseReportData, 'area', true);
    expect(result.data[0]!['totalWelds']).toBe(50);
    expect(result.data[0]!['pctTotal']).toBe(55.5);
    expect(typeof result.data[0]!['totalWelds']).toBe('number');
  });

  it('converts affected cells to inline strings with positive delta', () => {
    const result = transformToTableProps(baseReportData, 'area', true, baseDeltaData);
    const areaA = result.data[0]!;
    // totalWelds 50 with deltaNewWelds +4
    expect(areaA['totalWelds']).toBe('50 (+4)');
    // weldCompleteCount 30 with deltaWeldCompleteCount +3
    expect(areaA['weldCompleteCount']).toBe('30 (+3)');
    // acceptedCount 20 with deltaAcceptedCount +1
    expect(areaA['acceptedCount']).toBe('20 (+1)');
    // pctTotal 55.5 with deltaPctTotal +2.5
    expect(areaA['pctTotal']).toBe('55.5% (+2.5%)');
  });

  it('converts affected cells to inline strings with negative/zero delta', () => {
    const result = transformToTableProps(baseReportData, 'area', true, baseDeltaData);
    const areaB = result.data[1]!;
    // totalWelds 80 with deltaNewWelds 0
    expect(areaB['totalWelds']).toBe('80 (0)');
    // weldCompleteCount 60 with deltaWeldCompleteCount -2
    expect(areaB['weldCompleteCount']).toBe('60 (-2)');
    // acceptedCount 50 with deltaAcceptedCount 0
    expect(areaB['acceptedCount']).toBe('50 (0)');
    // pctTotal 72.3 with deltaPctTotal -1.3
    expect(areaB['pctTotal']).toBe('72.3% (-1.3%)');
  });

  it('merges inline delta values into grand total', () => {
    const result = transformToTableProps(baseReportData, 'area', true, baseDeltaData);
    const gt = result.grandTotal!;
    expect(gt['totalWelds']).toBe('100 (+4)');
    expect(gt['weldCompleteCount']).toBe('70 (+1)');
    expect(gt['acceptedCount']).toBe('60 (+1)');
    expect(gt['pctTotal']).toBe('65.0% (+1.2%)');
  });

  it('leaves unmatched rows as numeric values (no delta row found)', () => {
    const partialDelta: FieldWeldDeltaReportData = {
      ...baseDeltaData,
      rows: [baseDeltaData.rows[0]!], // Only Area A, no Area B
    };
    const result = transformToTableProps(baseReportData, 'area', true, partialDelta);

    // Area A should have inline deltas
    expect(result.data[0]!['totalWelds']).toBe('50 (+4)');

    // Area B should stay as plain numbers (no matching delta row)
    expect(result.data[1]!['totalWelds']).toBe(80);
    expect(result.data[1]!['pctTotal']).toBe(72.3);
    expect(typeof result.data[1]!['totalWelds']).toBe('number');
  });

  it('does not affect columns without delta mapping (name, remaining, ndePassRate, repairRate)', () => {
    const result = transformToTableProps(baseReportData, 'area', true, baseDeltaData);
    const areaA = result.data[0]!;
    // name stays as text
    expect(areaA['name']).toBe('Area A');
    // remainingCount stays numeric
    expect(typeof areaA['remainingCount']).toBe('number');
    // ndePassRate stays numeric
    expect(typeof areaA['ndePassRate']).toBe('number');
    // repairRate stays numeric
    expect(typeof areaA['repairRate']).toBe('number');
  });
});

describe('buildPDFSubtitle', () => {
  it('returns sort info only when no date range is provided', () => {
    expect(buildPDFSubtitle('% Complete', 'desc')).toBe('Sorted by: % Complete (desc)');
  });

  it('returns sort info only when date range is all_time', () => {
    const dateRange: ReportDateRange = { preset: 'all_time', startDate: null, endDate: null };
    expect(buildPDFSubtitle('Name', 'asc', dateRange)).toBe('Sorted by: Name (asc)');
  });

  it('includes preset label when date range is a preset (not all_time)', () => {
    const dateRange: ReportDateRange = { preset: 'last_7_days', startDate: null, endDate: null };
    expect(buildPDFSubtitle('Total Welds', 'desc', dateRange)).toBe(
      'Sorted by: Total Welds (desc)  |  Period: Last 7 Days'
    );
  });

  it('includes custom date range with start and end dates', () => {
    const dateRange: ReportDateRange = { preset: 'custom', startDate: '2026-01-01', endDate: '2026-01-31' };
    expect(buildPDFSubtitle('Budget', 'asc', dateRange)).toBe(
      'Sorted by: Budget (asc)  |  Period: 2026-01-01 to 2026-01-31'
    );
  });

  it('uses preset label for custom without dates', () => {
    const dateRange: ReportDateRange = { preset: 'last_90_days', startDate: null, endDate: null };
    expect(buildPDFSubtitle('Accepted', 'desc', dateRange)).toBe(
      'Sorted by: Accepted (desc)  |  Period: Last 90 Days'
    );
  });
});

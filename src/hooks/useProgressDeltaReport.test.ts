/**
 * Unit tests for useProgressDeltaReport hook (Feature 033 - Timeline Report Filter)
 * Tests resolveDateRange utility function and delta row filtering logic
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { resolveDateRange } from './useProgressDeltaReport';
import type { ReportDateRange } from '@/types/reports';

describe('resolveDateRange', () => {
  beforeEach(() => {
    // Mock current time to December 5, 2025 at 12:00 PM UTC
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-12-05T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('all_time preset', () => {
    it('returns null for all_time preset', () => {
      const dateRange: ReportDateRange = {
        preset: 'all_time',
        startDate: null,
        endDate: null,
      };

      const result = resolveDateRange(dateRange);

      expect(result).toBeNull();
    });

    it('returns null for all_time even if custom dates are provided', () => {
      const dateRange: ReportDateRange = {
        preset: 'all_time',
        startDate: '2025-01-01',
        endDate: '2025-12-31',
      };

      const result = resolveDateRange(dateRange);

      expect(result).toBeNull();
    });
  });

  describe('last_7_days preset', () => {
    it('returns correct start (7 days ago) and end (tomorrow midnight)', () => {
      const dateRange: ReportDateRange = {
        preset: 'last_7_days',
        startDate: null,
        endDate: null,
      };

      const result = resolveDateRange(dateRange);

      expect(result).not.toBeNull();
      // Check date components (year, month, day) since function uses local timezone
      expect(result?.start.getFullYear()).toBe(2025);
      expect(result?.start.getMonth()).toBe(10); // November (0-indexed)
      expect(result?.start.getDate()).toBe(29); // 7 days before Dec 6

      expect(result?.end.getFullYear()).toBe(2025);
      expect(result?.end.getMonth()).toBe(11); // December (0-indexed)
      expect(result?.end.getDate()).toBe(6); // Tomorrow
    });
  });

  describe('last_30_days preset', () => {
    it('returns correct start (30 days ago) and end (tomorrow midnight)', () => {
      const dateRange: ReportDateRange = {
        preset: 'last_30_days',
        startDate: null,
        endDate: null,
      };

      const result = resolveDateRange(dateRange);

      expect(result).not.toBeNull();
      // Check date components (year, month, day) since function uses local timezone
      expect(result?.start.getFullYear()).toBe(2025);
      expect(result?.start.getMonth()).toBe(10); // November (0-indexed)
      expect(result?.start.getDate()).toBe(6); // 30 days before Dec 6

      expect(result?.end.getFullYear()).toBe(2025);
      expect(result?.end.getMonth()).toBe(11); // December (0-indexed)
      expect(result?.end.getDate()).toBe(6); // Tomorrow
    });
  });

  describe('last_90_days preset', () => {
    it('returns correct start (90 days ago) and end (tomorrow midnight)', () => {
      const dateRange: ReportDateRange = {
        preset: 'last_90_days',
        startDate: null,
        endDate: null,
      };

      const result = resolveDateRange(dateRange);

      expect(result).not.toBeNull();
      // Check date components (year, month, day) since function uses local timezone
      expect(result?.start.getFullYear()).toBe(2025);
      expect(result?.start.getMonth()).toBe(8); // September (0-indexed)
      expect(result?.start.getDate()).toBe(7); // 90 days before Dec 6

      expect(result?.end.getFullYear()).toBe(2025);
      expect(result?.end.getMonth()).toBe(11); // December (0-indexed)
      expect(result?.end.getDate()).toBe(6); // Tomorrow
    });
  });

  describe('ytd preset', () => {
    it('returns January 1st of current year to tomorrow midnight', () => {
      const dateRange: ReportDateRange = {
        preset: 'ytd',
        startDate: null,
        endDate: null,
      };

      const result = resolveDateRange(dateRange);

      expect(result).not.toBeNull();
      // Check date components (year, month, day) since function uses local timezone
      expect(result?.start.getFullYear()).toBe(2025);
      expect(result?.start.getMonth()).toBe(0); // January (0-indexed)
      expect(result?.start.getDate()).toBe(1);

      expect(result?.end.getFullYear()).toBe(2025);
      expect(result?.end.getMonth()).toBe(11); // December (0-indexed)
      expect(result?.end.getDate()).toBe(6); // Tomorrow
    });

    it('handles year boundaries correctly when mocked to January', () => {
      vi.setSystemTime(new Date('2025-01-15T12:00:00Z'));

      const dateRange: ReportDateRange = {
        preset: 'ytd',
        startDate: null,
        endDate: null,
      };

      const result = resolveDateRange(dateRange);

      expect(result).not.toBeNull();
      // Check date components (year, month, day) since function uses local timezone
      expect(result?.start.getFullYear()).toBe(2025);
      expect(result?.start.getMonth()).toBe(0); // January (0-indexed)
      expect(result?.start.getDate()).toBe(1);

      expect(result?.end.getFullYear()).toBe(2025);
      expect(result?.end.getMonth()).toBe(0); // January (0-indexed)
      expect(result?.end.getDate()).toBe(16); // Tomorrow
    });
  });

  describe('custom preset', () => {
    it('returns correct range with valid start and end dates', () => {
      const dateRange: ReportDateRange = {
        preset: 'custom',
        startDate: '2025-11-01',
        endDate: '2025-11-30',
      };

      const result = resolveDateRange(dateRange);

      expect(result).not.toBeNull();
      expect(result?.start).toEqual(new Date('2025-11-01T00:00:00Z'));
      // End date should be inclusive (add 1 day)
      expect(result?.end).toEqual(new Date('2025-12-01T00:00:00Z'));
    });

    it('returns null when start date is missing', () => {
      const dateRange: ReportDateRange = {
        preset: 'custom',
        startDate: null,
        endDate: '2025-11-30',
      };

      const result = resolveDateRange(dateRange);

      expect(result).toBeNull();
    });

    it('returns null when end date is missing', () => {
      const dateRange: ReportDateRange = {
        preset: 'custom',
        startDate: '2025-11-01',
        endDate: null,
      };

      const result = resolveDateRange(dateRange);

      expect(result).toBeNull();
    });

    it('returns null when both dates are missing', () => {
      const dateRange: ReportDateRange = {
        preset: 'custom',
        startDate: null,
        endDate: null,
      };

      const result = resolveDateRange(dateRange);

      expect(result).toBeNull();
    });

    it('handles date strings in ISO 8601 format', () => {
      const dateRange: ReportDateRange = {
        preset: 'custom',
        startDate: '2025-01-15',
        endDate: '2025-03-20',
      };

      const result = resolveDateRange(dateRange);

      expect(result).not.toBeNull();
      expect(result?.start).toEqual(new Date('2025-01-15T00:00:00Z'));
      expect(result?.end).toEqual(new Date('2025-03-21T00:00:00Z')); // Inclusive
    });

    it('handles single-day range correctly', () => {
      const dateRange: ReportDateRange = {
        preset: 'custom',
        startDate: '2025-11-15',
        endDate: '2025-11-15',
      };

      const result = resolveDateRange(dateRange);

      expect(result).not.toBeNull();
      expect(result?.start).toEqual(new Date('2025-11-15T00:00:00Z'));
      // End should be next day to include the full day
      expect(result?.end).toEqual(new Date('2025-11-16T00:00:00Z'));
    });
  });

  describe('edge cases', () => {
    it('handles leap year correctly for last_90_days', () => {
      // Mock to March 5, 2024 (leap year)
      vi.setSystemTime(new Date('2024-03-05T12:00:00Z'));

      const dateRange: ReportDateRange = {
        preset: 'last_90_days',
        startDate: null,
        endDate: null,
      };

      const result = resolveDateRange(dateRange);

      expect(result).not.toBeNull();
      // Check date components (year, month, day) since function uses local timezone
      expect(result?.start.getFullYear()).toBe(2023);
      expect(result?.start.getMonth()).toBe(11); // December (0-indexed)
      expect(result?.start.getDate()).toBe(7); // 90 days before Mar 6

      expect(result?.end.getFullYear()).toBe(2024);
      expect(result?.end.getMonth()).toBe(2); // March (0-indexed)
      expect(result?.end.getDate()).toBe(6); // Tomorrow
    });

    it('handles year boundary for last_30_days', () => {
      // Mock to January 15, 2025
      vi.setSystemTime(new Date('2025-01-15T12:00:00Z'));

      const dateRange: ReportDateRange = {
        preset: 'last_30_days',
        startDate: null,
        endDate: null,
      };

      const result = resolveDateRange(dateRange);

      expect(result).not.toBeNull();
      // Check date components (year, month, day) since function uses local timezone
      expect(result?.start.getFullYear()).toBe(2024);
      expect(result?.start.getMonth()).toBe(11); // December (0-indexed)
      expect(result?.start.getDate()).toBe(17); // 30 days before Jan 16

      expect(result?.end.getFullYear()).toBe(2025);
      expect(result?.end.getMonth()).toBe(0); // January (0-indexed)
      expect(result?.end.getDate()).toBe(16); // Tomorrow
    });

    it('handles month boundary correctly for last_7_days', () => {
      // Mock to December 1, 2025
      vi.setSystemTime(new Date('2025-12-01T12:00:00Z'));

      const dateRange: ReportDateRange = {
        preset: 'last_7_days',
        startDate: null,
        endDate: null,
      };

      const result = resolveDateRange(dateRange);

      expect(result).not.toBeNull();
      // Check date components (year, month, day) since function uses local timezone
      expect(result?.start.getFullYear()).toBe(2025);
      expect(result?.start.getMonth()).toBe(10); // November (0-indexed)
      expect(result?.start.getDate()).toBe(25); // 7 days before Dec 2

      expect(result?.end.getFullYear()).toBe(2025);
      expect(result?.end.getMonth()).toBe(11); // December (0-indexed)
      expect(result?.end.getDate()).toBe(2); // Tomorrow
    });

    it('handles time of day correctly (always uses midnight)', () => {
      // Mock to 11:59 PM
      vi.setSystemTime(new Date('2025-12-05T23:59:59Z'));

      const dateRange: ReportDateRange = {
        preset: 'last_7_days',
        startDate: null,
        endDate: null,
      };

      const result = resolveDateRange(dateRange);

      expect(result).not.toBeNull();
      // Should still use tomorrow midnight, not affected by current time
      // Check date components (year, month, day) since function uses local timezone
      expect(result?.end.getFullYear()).toBe(2025);
      expect(result?.end.getMonth()).toBe(11); // December (0-indexed)
      expect(result?.end.getDate()).toBe(6); // Tomorrow
    });
  });
});

/**
 * NOTE: Delta row filtering logic is tested indirectly through the hook's query function.
 * The filtering occurs at lines 289-291 in useProgressDeltaReport.ts:
 *
 * const filteredRows = allRows.filter(
 *   (row) => row.components_with_activity > 0
 * );
 *
 * This ensures rows with components_with_activity === 0 are excluded from:
 * - progressRows (count-based deltas)
 * - manhourRows (manhour deltas)
 * - grandTotal calculations (both types)
 *
 * Integration tests should verify this behavior with actual data.
 */

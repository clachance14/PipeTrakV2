/**
 * Zustand store for Report preferences
 * Manages view mode (count vs manhour) and date range filter with localStorage persistence
 * Features: 032-manhour-earned-value, 033-timeline-report-filter
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ReportViewMode, ReportDateRange } from '@/types/reports';
import type { DateRangePreset } from '@/types/weldSummary';
import { DEFAULT_DATE_RANGE } from '@/types/reports';

interface ReportPreferencesStore {
  // View mode state
  viewMode: ReportViewMode;
  setViewMode: (mode: ReportViewMode) => void;

  // Date range state (Feature 033)
  dateRange: ReportDateRange;
  setDateRangePreset: (preset: DateRangePreset) => void;
  setCustomDateRange: (startDate: string, endDate: string) => void;
  resetDateRange: () => void;
}

/**
 * Global report preferences store
 * Persists to localStorage for cross-session consistency
 */
export const useReportPreferencesStore = create<ReportPreferencesStore>()(
  persist(
    (set) => ({
      // Default to count view
      viewMode: 'count',

      setViewMode: (mode: ReportViewMode) => {
        set({ viewMode: mode });
      },

      // Date range state (default to "All Time")
      dateRange: DEFAULT_DATE_RANGE,

      setDateRangePreset: (preset: DateRangePreset) => {
        set({
          dateRange: { preset, startDate: null, endDate: null },
        });
      },

      setCustomDateRange: (startDate: string, endDate: string) => {
        set({
          dateRange: { preset: 'custom', startDate, endDate },
        });
      },

      resetDateRange: () => {
        set({ dateRange: DEFAULT_DATE_RANGE });
      },
    }),
    {
      name: 'pipetrak:report-preferences', // localStorage key
    }
  )
);

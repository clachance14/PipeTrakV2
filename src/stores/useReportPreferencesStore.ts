/**
 * Zustand store for Report preferences
 * Manages view mode (count vs manhour), date range filter, and column sorting with localStorage persistence
 * Features: 032-manhour-earned-value, 033-timeline-report-filter, report-column-sorting
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ReportViewMode, ReportDateRange } from '@/types/reports';
import type { DateRangePreset } from '@/types/weldSummary';
import { DEFAULT_DATE_RANGE } from '@/types/reports';

// Component Progress Report sortable columns
export type ComponentReportSortColumn =
  | 'name'
  | 'budget'
  | 'pctReceived'
  | 'pctInstalled'
  | 'pctPunch'
  | 'pctTested'
  | 'pctRestored'
  | 'pctTotal';

// Field Weld Progress Report sortable columns (base + welder-specific + x-ray tiers)
export type FieldWeldReportSortColumn =
  | 'name'
  | 'totalWelds'
  | 'weldCompleteCount'
  | 'acceptedCount'
  | 'ndePassRate'
  | 'repairRate'
  | 'pctTotal'
  // Welder-specific columns
  | 'firstPassRate'
  | 'avgDaysToAcceptance'
  // X-ray tier columns
  | 'xray5Count'
  | 'xray10Count'
  | 'xray100Count'
  | 'xray5PassRate'
  | 'xray10PassRate'
  | 'xray100PassRate';

// Manhour Progress Report sortable columns (used by ManhourReportTable + ManhourPercentReportTable)
export type ManhourReportSortColumn =
  | 'name'
  | 'mhBudget'
  | 'receiveMhEarned'
  | 'installMhEarned'
  | 'punchMhEarned'
  | 'testMhEarned'
  | 'restoreMhEarned'
  | 'totalMhEarned'
  | 'mhPctComplete';

// Component Delta Report sortable columns (used by DeltaReportTable)
export type DeltaReportSortColumn =
  | 'name'
  | 'mhBudget'
  | 'deltaReceiveMhEarned'
  | 'deltaInstallMhEarned'
  | 'deltaPunchMhEarned'
  | 'deltaTestMhEarned'
  | 'deltaRestoreMhEarned'
  | 'deltaTotalMhEarned'
  | 'deltaMhPctComplete';

// Field Weld Delta Report sortable columns
export type FieldWeldDeltaReportSortColumn =
  | 'name'
  | 'weldsWithActivity'
  | 'deltaFitupCount'
  | 'deltaWeldCompleteCount'
  | 'deltaAcceptedCount'
  | 'deltaPctTotal';

// Manhour Delta Report sortable columns (used by ManhourDeltaReportTable + ManhourPercentDeltaReportTable)
export type ManhourDeltaReportSortColumn =
  | 'name'
  | 'componentsWithActivity'
  | 'mhBudget'
  | 'deltaReceiveMhEarned'
  | 'deltaInstallMhEarned'
  | 'deltaPunchMhEarned'
  | 'deltaTestMhEarned'
  | 'deltaRestoreMhEarned'
  | 'deltaTotalMhEarned'
  | 'deltaMhPctComplete';

// Manhour Budget Report sortable columns (budget-only columns)
export type ManhourBudgetReportSortColumn =
  | 'name'
  | 'mhBudget'
  | 'receiveMhBudget'
  | 'installMhBudget'
  | 'punchMhBudget'
  | 'testMhBudget'
  | 'restoreMhBudget';

interface ReportPreferencesStore {
  // View mode state
  viewMode: ReportViewMode;
  setViewMode: (mode: ReportViewMode) => void;

  // Date range state (Feature 033)
  dateRange: ReportDateRange;
  setDateRangePreset: (preset: DateRangePreset) => void;
  setCustomDateRange: (startDate: string, endDate: string) => void;
  resetDateRange: () => void;

  // Column sorting state
  componentReport: {
    sortColumn: ComponentReportSortColumn;
    sortDirection: 'asc' | 'desc';
  };
  fieldWeldReport: {
    sortColumn: FieldWeldReportSortColumn;
    sortDirection: 'asc' | 'desc';
  };
  manhourReport: {
    sortColumn: ManhourReportSortColumn;
    sortDirection: 'asc' | 'desc';
  };
  deltaReport: {
    sortColumn: DeltaReportSortColumn;
    sortDirection: 'asc' | 'desc';
  };
  fieldWeldDeltaReport: {
    sortColumn: FieldWeldDeltaReportSortColumn;
    sortDirection: 'asc' | 'desc';
  };
  manhourDeltaReport: {
    sortColumn: ManhourDeltaReportSortColumn;
    sortDirection: 'asc' | 'desc';
  };
  manhourBudgetReport: {
    sortColumn: ManhourBudgetReportSortColumn;
    sortDirection: 'asc' | 'desc';
  };
  toggleComponentSort: (column: ComponentReportSortColumn) => void;
  toggleFieldWeldSort: (column: FieldWeldReportSortColumn) => void;
  toggleManhourSort: (column: ManhourReportSortColumn) => void;
  toggleDeltaSort: (column: DeltaReportSortColumn) => void;
  toggleFieldWeldDeltaSort: (column: FieldWeldDeltaReportSortColumn) => void;
  toggleManhourDeltaSort: (column: ManhourDeltaReportSortColumn) => void;
  toggleManhourBudgetSort: (column: ManhourBudgetReportSortColumn) => void;
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

      // Column sorting state - defaults to name ascending (matches current fixed behavior)
      componentReport: {
        sortColumn: 'name',
        sortDirection: 'asc',
      },
      fieldWeldReport: {
        sortColumn: 'name',
        sortDirection: 'asc',
      },
      manhourReport: {
        sortColumn: 'name',
        sortDirection: 'asc',
      },
      deltaReport: {
        sortColumn: 'name',
        sortDirection: 'asc',
      },
      fieldWeldDeltaReport: {
        sortColumn: 'name',
        sortDirection: 'asc',
      },
      manhourDeltaReport: {
        sortColumn: 'name',
        sortDirection: 'asc',
      },
      manhourBudgetReport: {
        sortColumn: 'name',
        sortDirection: 'asc',
      },

      toggleComponentSort: (column: ComponentReportSortColumn) => {
        set((state) => {
          if (state.componentReport.sortColumn === column) {
            // Same column - flip direction
            return {
              componentReport: {
                sortColumn: column,
                sortDirection: state.componentReport.sortDirection === 'asc' ? 'desc' : 'asc',
              },
            };
          } else {
            // New column - set to asc
            return {
              componentReport: {
                sortColumn: column,
                sortDirection: 'asc',
              },
            };
          }
        });
      },

      toggleFieldWeldSort: (column: FieldWeldReportSortColumn) => {
        set((state) => {
          if (state.fieldWeldReport.sortColumn === column) {
            // Same column - flip direction
            return {
              fieldWeldReport: {
                sortColumn: column,
                sortDirection: state.fieldWeldReport.sortDirection === 'asc' ? 'desc' : 'asc',
              },
            };
          } else {
            // New column - set to asc
            return {
              fieldWeldReport: {
                sortColumn: column,
                sortDirection: 'asc',
              },
            };
          }
        });
      },

      toggleManhourSort: (column: ManhourReportSortColumn) => {
        set((state) => {
          if (state.manhourReport.sortColumn === column) {
            return {
              manhourReport: {
                sortColumn: column,
                sortDirection: state.manhourReport.sortDirection === 'asc' ? 'desc' : 'asc',
              },
            };
          } else {
            return {
              manhourReport: {
                sortColumn: column,
                sortDirection: 'asc',
              },
            };
          }
        });
      },

      toggleDeltaSort: (column: DeltaReportSortColumn) => {
        set((state) => {
          if (state.deltaReport.sortColumn === column) {
            return {
              deltaReport: {
                sortColumn: column,
                sortDirection: state.deltaReport.sortDirection === 'asc' ? 'desc' : 'asc',
              },
            };
          } else {
            return {
              deltaReport: {
                sortColumn: column,
                sortDirection: 'asc',
              },
            };
          }
        });
      },

      toggleFieldWeldDeltaSort: (column: FieldWeldDeltaReportSortColumn) => {
        set((state) => {
          if (state.fieldWeldDeltaReport.sortColumn === column) {
            return {
              fieldWeldDeltaReport: {
                sortColumn: column,
                sortDirection: state.fieldWeldDeltaReport.sortDirection === 'asc' ? 'desc' : 'asc',
              },
            };
          } else {
            return {
              fieldWeldDeltaReport: {
                sortColumn: column,
                sortDirection: 'asc',
              },
            };
          }
        });
      },

      toggleManhourDeltaSort: (column: ManhourDeltaReportSortColumn) => {
        set((state) => {
          if (state.manhourDeltaReport.sortColumn === column) {
            return {
              manhourDeltaReport: {
                sortColumn: column,
                sortDirection: state.manhourDeltaReport.sortDirection === 'asc' ? 'desc' : 'asc',
              },
            };
          } else {
            return {
              manhourDeltaReport: {
                sortColumn: column,
                sortDirection: 'asc',
              },
            };
          }
        });
      },

      toggleManhourBudgetSort: (column: ManhourBudgetReportSortColumn) => {
        set((state) => {
          if (state.manhourBudgetReport.sortColumn === column) {
            return {
              manhourBudgetReport: {
                sortColumn: column,
                sortDirection: state.manhourBudgetReport.sortDirection === 'asc' ? 'desc' : 'asc',
              },
            };
          } else {
            return {
              manhourBudgetReport: {
                sortColumn: column,
                sortDirection: 'asc',
              },
            };
          }
        });
      },
    }),
    {
      name: 'pipetrak:report-preferences', // localStorage key
      // Merge function to handle migration when new properties are added
      merge: (persistedState, currentState) => {
        const state = persistedState as Partial<ReportPreferencesStore> | undefined;
        return {
          ...currentState,
          ...state,
          // Ensure componentReport has defaults even if localStorage is old
          componentReport: {
            sortColumn: state?.componentReport?.sortColumn ?? 'name',
            sortDirection: state?.componentReport?.sortDirection ?? 'asc',
          },
          // Ensure fieldWeldReport has defaults even if localStorage is old
          fieldWeldReport: {
            sortColumn: state?.fieldWeldReport?.sortColumn ?? 'name',
            sortDirection: state?.fieldWeldReport?.sortDirection ?? 'asc',
          },
          // Ensure manhourReport has defaults even if localStorage is old
          manhourReport: {
            sortColumn: state?.manhourReport?.sortColumn ?? 'name',
            sortDirection: state?.manhourReport?.sortDirection ?? 'asc',
          },
          // Ensure deltaReport has defaults even if localStorage is old
          deltaReport: {
            sortColumn: state?.deltaReport?.sortColumn ?? 'name',
            sortDirection: state?.deltaReport?.sortDirection ?? 'asc',
          },
          // Ensure fieldWeldDeltaReport has defaults even if localStorage is old
          fieldWeldDeltaReport: {
            sortColumn: state?.fieldWeldDeltaReport?.sortColumn ?? 'name',
            sortDirection: state?.fieldWeldDeltaReport?.sortDirection ?? 'asc',
          },
          // Ensure manhourDeltaReport has defaults even if localStorage is old
          manhourDeltaReport: {
            sortColumn: state?.manhourDeltaReport?.sortColumn ?? 'name',
            sortDirection: state?.manhourDeltaReport?.sortDirection ?? 'asc',
          },
          // Ensure manhourBudgetReport has defaults even if localStorage is old
          manhourBudgetReport: {
            sortColumn: state?.manhourBudgetReport?.sortColumn ?? 'name',
            sortDirection: state?.manhourBudgetReport?.sortDirection ?? 'asc',
          },
        };
      },
    }
  )
);

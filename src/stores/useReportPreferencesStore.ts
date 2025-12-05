/**
 * Zustand store for Report preferences
 * Manages view mode (count vs manhour) with localStorage persistence
 * Feature: 032-manhour-earned-value
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ReportViewMode } from '@/types/reports';

interface ReportPreferencesStore {
  // View mode state
  viewMode: ReportViewMode;
  setViewMode: (mode: ReportViewMode) => void;
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
    }),
    {
      name: 'pipetrak:report-preferences', // localStorage key
    }
  )
);

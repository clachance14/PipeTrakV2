/**
 * Tests for Report Preferences Store - Column Sorting
 * TDD: Tests for sort column toggle functionality
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useReportPreferencesStore } from './useReportPreferencesStore';

describe('useReportPreferencesStore - Column Sorting', () => {
  beforeEach(() => {
    // Reset sort state before each test (preserve other store state)
    const state = useReportPreferencesStore.getState();
    useReportPreferencesStore.setState({
      ...state,
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
    });
  });

  describe('Component Report Sorting', () => {
    it('should have default sort by name ascending', () => {
      const { componentReport } = useReportPreferencesStore.getState();
      expect(componentReport.sortColumn).toBe('name');
      expect(componentReport.sortDirection).toBe('asc');
    });

    it('should toggle to descending when clicking same column', () => {
      const store = useReportPreferencesStore.getState();
      store.toggleComponentSort('name');

      const { componentReport } = useReportPreferencesStore.getState();
      expect(componentReport.sortColumn).toBe('name');
      expect(componentReport.sortDirection).toBe('desc');
    });

    it('should toggle back to ascending when clicking same column again', () => {
      const store = useReportPreferencesStore.getState();
      store.toggleComponentSort('name'); // asc -> desc
      store.toggleComponentSort('name'); // desc -> asc

      const { componentReport } = useReportPreferencesStore.getState();
      expect(componentReport.sortColumn).toBe('name');
      expect(componentReport.sortDirection).toBe('asc');
    });

    it('should set ascending when clicking different column', () => {
      const store = useReportPreferencesStore.getState();
      store.toggleComponentSort('name'); // asc -> desc
      store.toggleComponentSort('budget'); // switch to budget, asc

      const { componentReport } = useReportPreferencesStore.getState();
      expect(componentReport.sortColumn).toBe('budget');
      expect(componentReport.sortDirection).toBe('asc');
    });

    it('should support all component report columns', () => {
      const columns = ['name', 'budget', 'pctReceived', 'pctInstalled', 'pctPunch', 'pctTested', 'pctRestored', 'pctTotal'] as const;

      for (const column of columns) {
        useReportPreferencesStore.getState().toggleComponentSort(column);
        const { componentReport } = useReportPreferencesStore.getState();
        expect(componentReport.sortColumn).toBe(column);
      }
    });
  });

  describe('Field Weld Report Sorting', () => {
    it('should have default sort by name ascending', () => {
      const { fieldWeldReport } = useReportPreferencesStore.getState();
      expect(fieldWeldReport.sortColumn).toBe('name');
      expect(fieldWeldReport.sortDirection).toBe('asc');
    });

    it('should toggle to descending when clicking same column', () => {
      const store = useReportPreferencesStore.getState();
      store.toggleFieldWeldSort('name');

      const { fieldWeldReport } = useReportPreferencesStore.getState();
      expect(fieldWeldReport.sortColumn).toBe('name');
      expect(fieldWeldReport.sortDirection).toBe('desc');
    });

    it('should set ascending when clicking different column', () => {
      const store = useReportPreferencesStore.getState();
      store.toggleFieldWeldSort('name'); // asc -> desc
      store.toggleFieldWeldSort('totalWelds'); // switch to totalWelds, asc

      const { fieldWeldReport } = useReportPreferencesStore.getState();
      expect(fieldWeldReport.sortColumn).toBe('totalWelds');
      expect(fieldWeldReport.sortDirection).toBe('asc');
    });

    it('should support all base field weld report columns', () => {
      const columns = ['name', 'totalWelds', 'weldCompleteCount', 'acceptedCount', 'ndePassRate', 'repairRate', 'pctTotal'] as const;

      for (const column of columns) {
        useReportPreferencesStore.getState().toggleFieldWeldSort(column);
        const { fieldWeldReport } = useReportPreferencesStore.getState();
        expect(fieldWeldReport.sortColumn).toBe(column);
      }
    });

    it('should support welder-specific columns', () => {
      const welderColumns = ['firstPassRate', 'avgDaysToAcceptance'] as const;

      for (const column of welderColumns) {
        useReportPreferencesStore.getState().toggleFieldWeldSort(column);
        const { fieldWeldReport } = useReportPreferencesStore.getState();
        expect(fieldWeldReport.sortColumn).toBe(column);
      }
    });

    it('should support x-ray tier columns', () => {
      const xrayColumns = ['xray5Count', 'xray10Count', 'xray100Count', 'xray5PassRate', 'xray10PassRate', 'xray100PassRate'] as const;

      for (const column of xrayColumns) {
        useReportPreferencesStore.getState().toggleFieldWeldSort(column);
        const { fieldWeldReport } = useReportPreferencesStore.getState();
        expect(fieldWeldReport.sortColumn).toBe(column);
      }
    });
  });

  describe('Manhour Report Sorting', () => {
    it('should have default sort by name ascending', () => {
      const { manhourReport } = useReportPreferencesStore.getState();
      expect(manhourReport.sortColumn).toBe('name');
      expect(manhourReport.sortDirection).toBe('asc');
    });

    it('should toggle to descending when clicking same column', () => {
      const store = useReportPreferencesStore.getState();
      store.toggleManhourSort('name');

      const { manhourReport } = useReportPreferencesStore.getState();
      expect(manhourReport.sortColumn).toBe('name');
      expect(manhourReport.sortDirection).toBe('desc');
    });

    it('should set ascending when clicking different column', () => {
      const store = useReportPreferencesStore.getState();
      store.toggleManhourSort('name'); // asc -> desc
      store.toggleManhourSort('mhBudget'); // switch to mhBudget, asc

      const { manhourReport } = useReportPreferencesStore.getState();
      expect(manhourReport.sortColumn).toBe('mhBudget');
      expect(manhourReport.sortDirection).toBe('asc');
    });

    it('should support all manhour report columns', () => {
      const columns = [
        'name',
        'mhBudget',
        'receiveMhEarned',
        'installMhEarned',
        'punchMhEarned',
        'testMhEarned',
        'restoreMhEarned',
        'totalMhEarned',
        'mhPctComplete',
      ] as const;

      for (const column of columns) {
        useReportPreferencesStore.getState().toggleManhourSort(column);
        const { manhourReport } = useReportPreferencesStore.getState();
        expect(manhourReport.sortColumn).toBe(column);
      }
    });
  });

  describe('Delta Report Sorting', () => {
    it('should have default sort by name ascending', () => {
      const { deltaReport } = useReportPreferencesStore.getState();
      expect(deltaReport.sortColumn).toBe('name');
      expect(deltaReport.sortDirection).toBe('asc');
    });

    it('should toggle to descending when clicking same column', () => {
      const store = useReportPreferencesStore.getState();
      store.toggleDeltaSort('name');

      const { deltaReport } = useReportPreferencesStore.getState();
      expect(deltaReport.sortColumn).toBe('name');
      expect(deltaReport.sortDirection).toBe('desc');
    });

    it('should set ascending when clicking different column', () => {
      const store = useReportPreferencesStore.getState();
      store.toggleDeltaSort('name'); // asc -> desc
      store.toggleDeltaSort('mhBudget'); // switch to mhBudget, asc

      const { deltaReport } = useReportPreferencesStore.getState();
      expect(deltaReport.sortColumn).toBe('mhBudget');
      expect(deltaReport.sortDirection).toBe('asc');
    });

    it('should support all delta report columns', () => {
      const columns = [
        'name',
        'mhBudget',
        'deltaReceiveMhEarned',
        'deltaInstallMhEarned',
        'deltaPunchMhEarned',
        'deltaTestMhEarned',
        'deltaRestoreMhEarned',
        'deltaTotalMhEarned',
        'deltaMhPctComplete',
      ] as const;

      for (const column of columns) {
        useReportPreferencesStore.getState().toggleDeltaSort(column);
        const { deltaReport } = useReportPreferencesStore.getState();
        expect(deltaReport.sortColumn).toBe(column);
      }
    });
  });

  describe('Field Weld Delta Report Sorting', () => {
    it('should have default sort by name ascending', () => {
      const { fieldWeldDeltaReport } = useReportPreferencesStore.getState();
      expect(fieldWeldDeltaReport.sortColumn).toBe('name');
      expect(fieldWeldDeltaReport.sortDirection).toBe('asc');
    });

    it('should toggle to descending when clicking same column', () => {
      const store = useReportPreferencesStore.getState();
      store.toggleFieldWeldDeltaSort('name');

      const { fieldWeldDeltaReport } = useReportPreferencesStore.getState();
      expect(fieldWeldDeltaReport.sortColumn).toBe('name');
      expect(fieldWeldDeltaReport.sortDirection).toBe('desc');
    });

    it('should set ascending when clicking different column', () => {
      const store = useReportPreferencesStore.getState();
      store.toggleFieldWeldDeltaSort('name'); // asc -> desc
      store.toggleFieldWeldDeltaSort('weldsWithActivity'); // switch, asc

      const { fieldWeldDeltaReport } = useReportPreferencesStore.getState();
      expect(fieldWeldDeltaReport.sortColumn).toBe('weldsWithActivity');
      expect(fieldWeldDeltaReport.sortDirection).toBe('asc');
    });

    it('should support all field weld delta report columns', () => {
      const columns = [
        'name',
        'weldsWithActivity',
        'deltaFitupCount',
        'deltaWeldCompleteCount',
        'deltaAcceptedCount',
        'deltaPctTotal',
      ] as const;

      for (const column of columns) {
        useReportPreferencesStore.getState().toggleFieldWeldDeltaSort(column);
        const { fieldWeldDeltaReport } = useReportPreferencesStore.getState();
        expect(fieldWeldDeltaReport.sortColumn).toBe(column);
      }
    });
  });

  describe('Manhour Delta Report Sorting', () => {
    it('should have default sort by name ascending', () => {
      const { manhourDeltaReport } = useReportPreferencesStore.getState();
      expect(manhourDeltaReport.sortColumn).toBe('name');
      expect(manhourDeltaReport.sortDirection).toBe('asc');
    });

    it('should toggle to descending when clicking same column', () => {
      const store = useReportPreferencesStore.getState();
      store.toggleManhourDeltaSort('name');

      const { manhourDeltaReport } = useReportPreferencesStore.getState();
      expect(manhourDeltaReport.sortColumn).toBe('name');
      expect(manhourDeltaReport.sortDirection).toBe('desc');
    });

    it('should set ascending when clicking different column', () => {
      const store = useReportPreferencesStore.getState();
      store.toggleManhourDeltaSort('name'); // asc -> desc
      store.toggleManhourDeltaSort('componentsWithActivity'); // switch, asc

      const { manhourDeltaReport } = useReportPreferencesStore.getState();
      expect(manhourDeltaReport.sortColumn).toBe('componentsWithActivity');
      expect(manhourDeltaReport.sortDirection).toBe('asc');
    });

    it('should support all manhour delta report columns', () => {
      const columns = [
        'name',
        'componentsWithActivity',
        'mhBudget',
        'deltaReceiveMhEarned',
        'deltaInstallMhEarned',
        'deltaPunchMhEarned',
        'deltaTestMhEarned',
        'deltaRestoreMhEarned',
        'deltaTotalMhEarned',
        'deltaMhPctComplete',
      ] as const;

      for (const column of columns) {
        useReportPreferencesStore.getState().toggleManhourDeltaSort(column);
        const { manhourDeltaReport } = useReportPreferencesStore.getState();
        expect(manhourDeltaReport.sortColumn).toBe(column);
      }
    });
  });

  describe('Independence', () => {
    it('should not affect field weld sorting when toggling component sort', () => {
      const store = useReportPreferencesStore.getState();
      store.toggleFieldWeldSort('totalWelds'); // Change field weld sort
      store.toggleComponentSort('budget'); // Change component sort

      const { componentReport, fieldWeldReport } = useReportPreferencesStore.getState();
      expect(componentReport.sortColumn).toBe('budget');
      expect(fieldWeldReport.sortColumn).toBe('totalWelds');
    });

    it('should not affect other report sorting when toggling manhour sort', () => {
      const store = useReportPreferencesStore.getState();
      store.toggleManhourSort('mhBudget');
      store.toggleDeltaSort('deltaTotalMhEarned');
      store.toggleFieldWeldDeltaSort('deltaPctTotal');
      store.toggleManhourDeltaSort('componentsWithActivity');

      const state = useReportPreferencesStore.getState();
      expect(state.manhourReport.sortColumn).toBe('mhBudget');
      expect(state.deltaReport.sortColumn).toBe('deltaTotalMhEarned');
      expect(state.fieldWeldDeltaReport.sortColumn).toBe('deltaPctTotal');
      expect(state.manhourDeltaReport.sortColumn).toBe('componentsWithActivity');
    });
  });
});

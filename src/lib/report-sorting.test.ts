/**
 * Tests for Report Sorting Utilities
 * TDD: Write tests first for sorting functions
 */

import { describe, it, expect } from 'vitest';
import {
  sortComponentReportRows,
  sortFieldWeldReportRows,
  sortManhourReportRows,
  sortDeltaReportRows,
  sortFieldWeldDeltaReportRows,
  sortManhourDeltaReportRows,
} from './report-sorting';
import type {
  ProgressRow,
  FieldWeldProgressRow,
  ManhourProgressRow,
  ManhourDeltaRow,
  FieldWeldDeltaRow,
} from '@/types/reports';

// Sample component progress data
const createProgressRow = (overrides: Partial<ProgressRow>): ProgressRow => ({
  id: '1',
  name: 'Test Area',
  projectId: 'proj-1',
  budget: 100,
  pctReceived: 50,
  pctInstalled: 40,
  pctPunch: 30,
  pctTested: 20,
  pctRestored: 10,
  pctTotal: 25,
  ...overrides,
});

// Sample field weld progress data
const createFieldWeldRow = (overrides: Partial<FieldWeldProgressRow>): FieldWeldProgressRow => ({
  id: '1',
  name: 'Test Area',
  projectId: 'proj-1',
  totalWelds: 100,
  activeCount: 50,
  acceptedCount: 30,
  rejectedCount: 5,
  pctFitup: 80,
  pctWeldComplete: 60,
  pctAccepted: 30,
  ndeRequiredCount: 80,
  ndePassCount: 70,
  ndeFailCount: 5,
  ndePendingCount: 5,
  ndePassRate: 87.5,
  repairCount: 10,
  repairRate: 10,
  avgDaysToNDE: 5,
  avgDaysToAcceptance: 10,
  pctTotal: 50,
  fitupCount: 80,
  weldCompleteCount: 60,
  ...overrides,
});

describe('sortComponentReportRows', () => {
  describe('name column sorting', () => {
    it('should sort alphabetically ascending', () => {
      const rows = [
        createProgressRow({ name: 'Charlie' }),
        createProgressRow({ name: 'Alpha' }),
        createProgressRow({ name: 'Bravo' }),
      ];

      const sorted = sortComponentReportRows(rows, 'name', 'asc');

      expect(sorted.map(r => r.name)).toEqual(['Alpha', 'Bravo', 'Charlie']);
    });

    it('should sort alphabetically descending', () => {
      const rows = [
        createProgressRow({ name: 'Alpha' }),
        createProgressRow({ name: 'Charlie' }),
        createProgressRow({ name: 'Bravo' }),
      ];

      const sorted = sortComponentReportRows(rows, 'name', 'desc');

      expect(sorted.map(r => r.name)).toEqual(['Charlie', 'Bravo', 'Alpha']);
    });
  });

  describe('numeric column sorting', () => {
    it('should sort budget ascending', () => {
      const rows = [
        createProgressRow({ budget: 300 }),
        createProgressRow({ budget: 100 }),
        createProgressRow({ budget: 200 }),
      ];

      const sorted = sortComponentReportRows(rows, 'budget', 'asc');

      expect(sorted.map(r => r.budget)).toEqual([100, 200, 300]);
    });

    it('should sort budget descending', () => {
      const rows = [
        createProgressRow({ budget: 100 }),
        createProgressRow({ budget: 300 }),
        createProgressRow({ budget: 200 }),
      ];

      const sorted = sortComponentReportRows(rows, 'budget', 'desc');

      expect(sorted.map(r => r.budget)).toEqual([300, 200, 100]);
    });

    it('should sort pctReceived ascending', () => {
      const rows = [
        createProgressRow({ pctReceived: 75 }),
        createProgressRow({ pctReceived: 25 }),
        createProgressRow({ pctReceived: 50 }),
      ];

      const sorted = sortComponentReportRows(rows, 'pctReceived', 'asc');

      expect(sorted.map(r => r.pctReceived)).toEqual([25, 50, 75]);
    });

    it('should sort pctTotal descending', () => {
      const rows = [
        createProgressRow({ pctTotal: 25 }),
        createProgressRow({ pctTotal: 75 }),
        createProgressRow({ pctTotal: 50 }),
      ];

      const sorted = sortComponentReportRows(rows, 'pctTotal', 'desc');

      expect(sorted.map(r => r.pctTotal)).toEqual([75, 50, 25]);
    });
  });

  describe('all percentage columns', () => {
    it('should sort all percentage columns correctly', () => {
      const columns = ['pctReceived', 'pctInstalled', 'pctPunch', 'pctTested', 'pctRestored', 'pctTotal'] as const;

      for (const column of columns) {
        const rows = [
          createProgressRow({ [column]: 75 }),
          createProgressRow({ [column]: 25 }),
          createProgressRow({ [column]: 50 }),
        ];

        const sorted = sortComponentReportRows(rows, column, 'asc');
        expect(sorted.map(r => r[column])).toEqual([25, 50, 75]);
      }
    });
  });

  describe('immutability', () => {
    it('should not mutate the original array', () => {
      const rows = [
        createProgressRow({ name: 'Charlie' }),
        createProgressRow({ name: 'Alpha' }),
      ];
      const originalOrder = rows.map(r => r.name);

      sortComponentReportRows(rows, 'name', 'asc');

      expect(rows.map(r => r.name)).toEqual(originalOrder);
    });
  });

  describe('empty array', () => {
    it('should handle empty array', () => {
      const sorted = sortComponentReportRows([], 'name', 'asc');
      expect(sorted).toEqual([]);
    });
  });

  describe('single item', () => {
    it('should handle single item array', () => {
      const rows = [createProgressRow({ name: 'Only One' })];
      const sorted = sortComponentReportRows(rows, 'name', 'asc');
      expect(sorted).toHaveLength(1);
      expect(sorted[0]?.name).toBe('Only One');
    });
  });
});

describe('sortFieldWeldReportRows', () => {
  describe('name column sorting', () => {
    it('should sort alphabetically ascending', () => {
      const rows = [
        createFieldWeldRow({ name: 'Charlie' }),
        createFieldWeldRow({ name: 'Alpha' }),
        createFieldWeldRow({ name: 'Bravo' }),
      ];

      const sorted = sortFieldWeldReportRows(rows, 'name', 'asc');

      expect(sorted.map(r => r.name)).toEqual(['Alpha', 'Bravo', 'Charlie']);
    });

    it('should sort alphabetically descending', () => {
      const rows = [
        createFieldWeldRow({ name: 'Alpha' }),
        createFieldWeldRow({ name: 'Charlie' }),
        createFieldWeldRow({ name: 'Bravo' }),
      ];

      const sorted = sortFieldWeldReportRows(rows, 'name', 'desc');

      expect(sorted.map(r => r.name)).toEqual(['Charlie', 'Bravo', 'Alpha']);
    });
  });

  describe('numeric column sorting', () => {
    it('should sort totalWelds ascending', () => {
      const rows = [
        createFieldWeldRow({ totalWelds: 300 }),
        createFieldWeldRow({ totalWelds: 100 }),
        createFieldWeldRow({ totalWelds: 200 }),
      ];

      const sorted = sortFieldWeldReportRows(rows, 'totalWelds', 'asc');

      expect(sorted.map(r => r.totalWelds)).toEqual([100, 200, 300]);
    });

    it('should sort totalWelds descending', () => {
      const rows = [
        createFieldWeldRow({ totalWelds: 100 }),
        createFieldWeldRow({ totalWelds: 300 }),
        createFieldWeldRow({ totalWelds: 200 }),
      ];

      const sorted = sortFieldWeldReportRows(rows, 'totalWelds', 'desc');

      expect(sorted.map(r => r.totalWelds)).toEqual([300, 200, 100]);
    });

    it('should sort weldCompleteCount ascending', () => {
      const rows = [
        createFieldWeldRow({ weldCompleteCount: 75 }),
        createFieldWeldRow({ weldCompleteCount: 25 }),
        createFieldWeldRow({ weldCompleteCount: 50 }),
      ];

      const sorted = sortFieldWeldReportRows(rows, 'weldCompleteCount', 'asc');

      expect(sorted.map(r => r.weldCompleteCount)).toEqual([25, 50, 75]);
    });

    it('should sort acceptedCount descending', () => {
      const rows = [
        createFieldWeldRow({ acceptedCount: 25 }),
        createFieldWeldRow({ acceptedCount: 75 }),
        createFieldWeldRow({ acceptedCount: 50 }),
      ];

      const sorted = sortFieldWeldReportRows(rows, 'acceptedCount', 'desc');

      expect(sorted.map(r => r.acceptedCount)).toEqual([75, 50, 25]);
    });
  });

  describe('nullable column sorting', () => {
    it('should sort ndePassRate with null values last when ascending', () => {
      const rows = [
        createFieldWeldRow({ name: 'A', ndePassRate: null }),
        createFieldWeldRow({ name: 'B', ndePassRate: 50 }),
        createFieldWeldRow({ name: 'C', ndePassRate: 80 }),
      ];

      const sorted = sortFieldWeldReportRows(rows, 'ndePassRate', 'asc');

      expect(sorted.map(r => r.ndePassRate)).toEqual([50, 80, null]);
    });

    it('should sort ndePassRate with null values last when descending', () => {
      const rows = [
        createFieldWeldRow({ name: 'A', ndePassRate: 50 }),
        createFieldWeldRow({ name: 'B', ndePassRate: null }),
        createFieldWeldRow({ name: 'C', ndePassRate: 80 }),
      ];

      const sorted = sortFieldWeldReportRows(rows, 'ndePassRate', 'desc');

      expect(sorted.map(r => r.ndePassRate)).toEqual([80, 50, null]);
    });
  });

  describe('welder-specific columns', () => {
    it('should sort firstPassRate ascending', () => {
      const rows = [
        createFieldWeldRow({ firstPassAcceptanceRate: 90 }),
        createFieldWeldRow({ firstPassAcceptanceRate: 70 }),
        createFieldWeldRow({ firstPassAcceptanceRate: 80 }),
      ];

      const sorted = sortFieldWeldReportRows(rows, 'firstPassRate', 'asc');

      expect(sorted.map(r => r.firstPassAcceptanceRate)).toEqual([70, 80, 90]);
    });

    it('should sort avgDaysToAcceptance ascending with null values last', () => {
      const rows = [
        createFieldWeldRow({ avgDaysToAcceptance: null }),
        createFieldWeldRow({ avgDaysToAcceptance: 10 }),
        createFieldWeldRow({ avgDaysToAcceptance: 5 }),
      ];

      const sorted = sortFieldWeldReportRows(rows, 'avgDaysToAcceptance', 'asc');

      expect(sorted.map(r => r.avgDaysToAcceptance)).toEqual([5, 10, null]);
    });
  });

  describe('x-ray tier columns', () => {
    it('should sort xray5Count ascending', () => {
      const rows = [
        createFieldWeldRow({ xray5pctCount: 30 }),
        createFieldWeldRow({ xray5pctCount: 10 }),
        createFieldWeldRow({ xray5pctCount: 20 }),
      ];

      const sorted = sortFieldWeldReportRows(rows, 'xray5Count', 'asc');

      expect(sorted.map(r => r.xray5pctCount)).toEqual([10, 20, 30]);
    });

    it('should sort xray5PassRate with undefined values last', () => {
      const rows = [
        createFieldWeldRow({ xray5pctPassRate: undefined }),
        createFieldWeldRow({ xray5pctPassRate: 80 }),
        createFieldWeldRow({ xray5pctPassRate: 90 }),
      ];

      const sorted = sortFieldWeldReportRows(rows, 'xray5PassRate', 'asc');

      expect(sorted.map(r => r.xray5pctPassRate)).toEqual([80, 90, undefined]);
    });
  });

  describe('immutability', () => {
    it('should not mutate the original array', () => {
      const rows = [
        createFieldWeldRow({ name: 'Charlie' }),
        createFieldWeldRow({ name: 'Alpha' }),
      ];
      const originalOrder = rows.map(r => r.name);

      sortFieldWeldReportRows(rows, 'name', 'asc');

      expect(rows.map(r => r.name)).toEqual(originalOrder);
    });
  });

  describe('empty array', () => {
    it('should handle empty array', () => {
      const sorted = sortFieldWeldReportRows([], 'name', 'asc');
      expect(sorted).toEqual([]);
    });
  });
});

// Sample manhour progress data
const createManhourRow = (overrides: Partial<ManhourProgressRow>): ManhourProgressRow => ({
  id: '1',
  name: 'Test Area',
  projectId: 'proj-1',
  mhBudget: 1000,
  receiveMhBudget: 100,
  receiveMhEarned: 50,
  installMhBudget: 200,
  installMhEarned: 100,
  punchMhBudget: 150,
  punchMhEarned: 75,
  testMhBudget: 100,
  testMhEarned: 50,
  restoreMhBudget: 450,
  restoreMhEarned: 225,
  totalMhEarned: 500,
  mhPctComplete: 50,
  ...overrides,
});

// Sample manhour delta data
const createManhourDeltaRow = (overrides: Partial<ManhourDeltaRow>): ManhourDeltaRow => ({
  id: '1',
  name: 'Test Area',
  componentsWithActivity: 10,
  mhBudget: 1000,
  receiveMhBudget: 100,
  installMhBudget: 200,
  punchMhBudget: 150,
  testMhBudget: 100,
  restoreMhBudget: 450,
  deltaReceiveMhEarned: 10,
  deltaInstallMhEarned: 20,
  deltaPunchMhEarned: 15,
  deltaTestMhEarned: 5,
  deltaRestoreMhEarned: 50,
  deltaTotalMhEarned: 100,
  deltaMhPctComplete: 10,
  ...overrides,
});

// Sample field weld delta data
const createFieldWeldDeltaRow = (overrides: Partial<FieldWeldDeltaRow>): FieldWeldDeltaRow => ({
  id: '1',
  name: 'Test Area',
  weldsWithActivity: 10,
  deltaFitupCount: 5,
  deltaWeldCompleteCount: 8,
  deltaAcceptedCount: 3,
  deltaPctTotal: 5.5,
  deltaNewWelds: 0,
  ...overrides,
});

describe('sortManhourReportRows', () => {
  describe('name column sorting', () => {
    it('should sort alphabetically ascending', () => {
      const rows = [
        createManhourRow({ name: 'Charlie' }),
        createManhourRow({ name: 'Alpha' }),
        createManhourRow({ name: 'Bravo' }),
      ];

      const sorted = sortManhourReportRows(rows, 'name', 'asc');

      expect(sorted.map(r => r.name)).toEqual(['Alpha', 'Bravo', 'Charlie']);
    });

    it('should sort alphabetically descending', () => {
      const rows = [
        createManhourRow({ name: 'Alpha' }),
        createManhourRow({ name: 'Charlie' }),
        createManhourRow({ name: 'Bravo' }),
      ];

      const sorted = sortManhourReportRows(rows, 'name', 'desc');

      expect(sorted.map(r => r.name)).toEqual(['Charlie', 'Bravo', 'Alpha']);
    });
  });

  describe('numeric column sorting', () => {
    it('should sort mhBudget ascending', () => {
      const rows = [
        createManhourRow({ mhBudget: 3000 }),
        createManhourRow({ mhBudget: 1000 }),
        createManhourRow({ mhBudget: 2000 }),
      ];

      const sorted = sortManhourReportRows(rows, 'mhBudget', 'asc');

      expect(sorted.map(r => r.mhBudget)).toEqual([1000, 2000, 3000]);
    });

    it('should sort totalMhEarned descending', () => {
      const rows = [
        createManhourRow({ totalMhEarned: 100 }),
        createManhourRow({ totalMhEarned: 300 }),
        createManhourRow({ totalMhEarned: 200 }),
      ];

      const sorted = sortManhourReportRows(rows, 'totalMhEarned', 'desc');

      expect(sorted.map(r => r.totalMhEarned)).toEqual([300, 200, 100]);
    });

    it('should sort all earned columns correctly', () => {
      const columns = ['receiveMhEarned', 'installMhEarned', 'punchMhEarned', 'testMhEarned', 'restoreMhEarned'] as const;

      for (const column of columns) {
        const rows = [
          createManhourRow({ [column]: 75 }),
          createManhourRow({ [column]: 25 }),
          createManhourRow({ [column]: 50 }),
        ];

        const sorted = sortManhourReportRows(rows, column, 'asc');
        expect(sorted.map(r => r[column])).toEqual([25, 50, 75]);
      }
    });
  });

  describe('immutability', () => {
    it('should not mutate the original array', () => {
      const rows = [
        createManhourRow({ name: 'Charlie' }),
        createManhourRow({ name: 'Alpha' }),
      ];
      const originalOrder = rows.map(r => r.name);

      sortManhourReportRows(rows, 'name', 'asc');

      expect(rows.map(r => r.name)).toEqual(originalOrder);
    });
  });

  describe('empty array', () => {
    it('should handle empty array', () => {
      const sorted = sortManhourReportRows([], 'name', 'asc');
      expect(sorted).toEqual([]);
    });
  });
});

describe('sortDeltaReportRows', () => {
  describe('name column sorting', () => {
    it('should sort alphabetically ascending', () => {
      const rows = [
        createManhourDeltaRow({ name: 'Charlie' }),
        createManhourDeltaRow({ name: 'Alpha' }),
        createManhourDeltaRow({ name: 'Bravo' }),
      ];

      const sorted = sortDeltaReportRows(rows, 'name', 'asc');

      expect(sorted.map(r => r.name)).toEqual(['Alpha', 'Bravo', 'Charlie']);
    });

    it('should sort alphabetically descending', () => {
      const rows = [
        createManhourDeltaRow({ name: 'Alpha' }),
        createManhourDeltaRow({ name: 'Charlie' }),
        createManhourDeltaRow({ name: 'Bravo' }),
      ];

      const sorted = sortDeltaReportRows(rows, 'name', 'desc');

      expect(sorted.map(r => r.name)).toEqual(['Charlie', 'Bravo', 'Alpha']);
    });
  });

  describe('numeric column sorting', () => {
    it('should sort mhBudget ascending', () => {
      const rows = [
        createManhourDeltaRow({ mhBudget: 3000 }),
        createManhourDeltaRow({ mhBudget: 1000 }),
        createManhourDeltaRow({ mhBudget: 2000 }),
      ];

      const sorted = sortDeltaReportRows(rows, 'mhBudget', 'asc');

      expect(sorted.map(r => r.mhBudget)).toEqual([1000, 2000, 3000]);
    });

    it('should sort deltaTotalMhEarned descending', () => {
      const rows = [
        createManhourDeltaRow({ deltaTotalMhEarned: 10 }),
        createManhourDeltaRow({ deltaTotalMhEarned: 30 }),
        createManhourDeltaRow({ deltaTotalMhEarned: 20 }),
      ];

      const sorted = sortDeltaReportRows(rows, 'deltaTotalMhEarned', 'desc');

      expect(sorted.map(r => r.deltaTotalMhEarned)).toEqual([30, 20, 10]);
    });

    it('should sort all delta columns correctly', () => {
      const columns = [
        'deltaReceiveMhEarned',
        'deltaInstallMhEarned',
        'deltaPunchMhEarned',
        'deltaTestMhEarned',
        'deltaRestoreMhEarned',
        'deltaMhPctComplete',
      ] as const;

      for (const column of columns) {
        const rows = [
          createManhourDeltaRow({ [column]: 75 }),
          createManhourDeltaRow({ [column]: 25 }),
          createManhourDeltaRow({ [column]: 50 }),
        ];

        const sorted = sortDeltaReportRows(rows, column, 'asc');
        expect(sorted.map(r => r[column])).toEqual([25, 50, 75]);
      }
    });
  });

  describe('immutability', () => {
    it('should not mutate the original array', () => {
      const rows = [
        createManhourDeltaRow({ name: 'Charlie' }),
        createManhourDeltaRow({ name: 'Alpha' }),
      ];
      const originalOrder = rows.map(r => r.name);

      sortDeltaReportRows(rows, 'name', 'asc');

      expect(rows.map(r => r.name)).toEqual(originalOrder);
    });
  });

  describe('empty array', () => {
    it('should handle empty array', () => {
      const sorted = sortDeltaReportRows([], 'name', 'asc');
      expect(sorted).toEqual([]);
    });
  });
});

describe('sortFieldWeldDeltaReportRows', () => {
  describe('name column sorting', () => {
    it('should sort alphabetically ascending', () => {
      const rows = [
        createFieldWeldDeltaRow({ name: 'Charlie' }),
        createFieldWeldDeltaRow({ name: 'Alpha' }),
        createFieldWeldDeltaRow({ name: 'Bravo' }),
      ];

      const sorted = sortFieldWeldDeltaReportRows(rows, 'name', 'asc');

      expect(sorted.map(r => r.name)).toEqual(['Alpha', 'Bravo', 'Charlie']);
    });

    it('should sort alphabetically descending', () => {
      const rows = [
        createFieldWeldDeltaRow({ name: 'Alpha' }),
        createFieldWeldDeltaRow({ name: 'Charlie' }),
        createFieldWeldDeltaRow({ name: 'Bravo' }),
      ];

      const sorted = sortFieldWeldDeltaReportRows(rows, 'name', 'desc');

      expect(sorted.map(r => r.name)).toEqual(['Charlie', 'Bravo', 'Alpha']);
    });
  });

  describe('numeric column sorting', () => {
    it('should sort weldsWithActivity ascending', () => {
      const rows = [
        createFieldWeldDeltaRow({ weldsWithActivity: 30 }),
        createFieldWeldDeltaRow({ weldsWithActivity: 10 }),
        createFieldWeldDeltaRow({ weldsWithActivity: 20 }),
      ];

      const sorted = sortFieldWeldDeltaReportRows(rows, 'weldsWithActivity', 'asc');

      expect(sorted.map(r => r.weldsWithActivity)).toEqual([10, 20, 30]);
    });

    it('should sort deltaPctTotal descending', () => {
      const rows = [
        createFieldWeldDeltaRow({ deltaPctTotal: 1.5 }),
        createFieldWeldDeltaRow({ deltaPctTotal: 5.5 }),
        createFieldWeldDeltaRow({ deltaPctTotal: 3.5 }),
      ];

      const sorted = sortFieldWeldDeltaReportRows(rows, 'deltaPctTotal', 'desc');

      expect(sorted.map(r => r.deltaPctTotal)).toEqual([5.5, 3.5, 1.5]);
    });

    it('should sort all delta count columns correctly', () => {
      const columns = ['deltaFitupCount', 'deltaWeldCompleteCount', 'deltaAcceptedCount'] as const;

      for (const column of columns) {
        const rows = [
          createFieldWeldDeltaRow({ [column]: 75 }),
          createFieldWeldDeltaRow({ [column]: 25 }),
          createFieldWeldDeltaRow({ [column]: 50 }),
        ];

        const sorted = sortFieldWeldDeltaReportRows(rows, column, 'asc');
        expect(sorted.map(r => r[column])).toEqual([25, 50, 75]);
      }
    });
  });

  describe('immutability', () => {
    it('should not mutate the original array', () => {
      const rows = [
        createFieldWeldDeltaRow({ name: 'Charlie' }),
        createFieldWeldDeltaRow({ name: 'Alpha' }),
      ];
      const originalOrder = rows.map(r => r.name);

      sortFieldWeldDeltaReportRows(rows, 'name', 'asc');

      expect(rows.map(r => r.name)).toEqual(originalOrder);
    });
  });

  describe('empty array', () => {
    it('should handle empty array', () => {
      const sorted = sortFieldWeldDeltaReportRows([], 'name', 'asc');
      expect(sorted).toEqual([]);
    });
  });
});

describe('sortManhourDeltaReportRows', () => {
  describe('name column sorting', () => {
    it('should sort alphabetically ascending', () => {
      const rows = [
        createManhourDeltaRow({ name: 'Charlie' }),
        createManhourDeltaRow({ name: 'Alpha' }),
        createManhourDeltaRow({ name: 'Bravo' }),
      ];

      const sorted = sortManhourDeltaReportRows(rows, 'name', 'asc');

      expect(sorted.map(r => r.name)).toEqual(['Alpha', 'Bravo', 'Charlie']);
    });

    it('should sort alphabetically descending', () => {
      const rows = [
        createManhourDeltaRow({ name: 'Alpha' }),
        createManhourDeltaRow({ name: 'Charlie' }),
        createManhourDeltaRow({ name: 'Bravo' }),
      ];

      const sorted = sortManhourDeltaReportRows(rows, 'name', 'desc');

      expect(sorted.map(r => r.name)).toEqual(['Charlie', 'Bravo', 'Alpha']);
    });
  });

  describe('numeric column sorting', () => {
    it('should sort componentsWithActivity ascending', () => {
      const rows = [
        createManhourDeltaRow({ componentsWithActivity: 30 }),
        createManhourDeltaRow({ componentsWithActivity: 10 }),
        createManhourDeltaRow({ componentsWithActivity: 20 }),
      ];

      const sorted = sortManhourDeltaReportRows(rows, 'componentsWithActivity', 'asc');

      expect(sorted.map(r => r.componentsWithActivity)).toEqual([10, 20, 30]);
    });

    it('should sort mhBudget descending', () => {
      const rows = [
        createManhourDeltaRow({ mhBudget: 1000 }),
        createManhourDeltaRow({ mhBudget: 3000 }),
        createManhourDeltaRow({ mhBudget: 2000 }),
      ];

      const sorted = sortManhourDeltaReportRows(rows, 'mhBudget', 'desc');

      expect(sorted.map(r => r.mhBudget)).toEqual([3000, 2000, 1000]);
    });

    it('should sort deltaMhPctComplete ascending', () => {
      const rows = [
        createManhourDeltaRow({ deltaMhPctComplete: 15 }),
        createManhourDeltaRow({ deltaMhPctComplete: 5 }),
        createManhourDeltaRow({ deltaMhPctComplete: 10 }),
      ];

      const sorted = sortManhourDeltaReportRows(rows, 'deltaMhPctComplete', 'asc');

      expect(sorted.map(r => r.deltaMhPctComplete)).toEqual([5, 10, 15]);
    });
  });

  describe('immutability', () => {
    it('should not mutate the original array', () => {
      const rows = [
        createManhourDeltaRow({ name: 'Charlie' }),
        createManhourDeltaRow({ name: 'Alpha' }),
      ];
      const originalOrder = rows.map(r => r.name);

      sortManhourDeltaReportRows(rows, 'name', 'asc');

      expect(rows.map(r => r.name)).toEqual(originalOrder);
    });
  });

  describe('empty array', () => {
    it('should handle empty array', () => {
      const sorted = sortManhourDeltaReportRows([], 'name', 'asc');
      expect(sorted).toEqual([]);
    });
  });
});

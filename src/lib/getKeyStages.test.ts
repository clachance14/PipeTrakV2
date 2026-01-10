/**
 * Unit Tests: getKeyStages utility functions
 * Feature 030: Enhanced Package Completion Report PDF
 *
 * Tests that key stage extraction correctly:
 * - Returns first, test, and final stages
 * - Handles empty inputs
 * - Formats stage display correctly
 * - Calculates workflow summary
 */

import { describe, it, expect } from 'vitest';
import {
  getKeyStages,
  formatStageForDisplay,
  getWorkflowSummary,
} from './getKeyStages';
import type { PackageWorkflowStage } from '@/types/workflow.types';

// Factory for creating test stages
function createStage(
  overrides: Partial<PackageWorkflowStage> = {}
): PackageWorkflowStage {
  return {
    id: `stage-${Math.random().toString(36).slice(2)}`,
    package_id: 'pkg-123',
    stage_name: 'Test Stage',
    stage_order: 1,
    status: 'pending',
    is_required: true,
    completed_at: null,
    completed_by: null,
    completed_by_user: null,
    signoffs: undefined,
    skip_reason: null,
    skipped_at: null,
    skipped_by: null,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('getKeyStages', () => {
  it('returns empty array for null input', () => {
    expect(getKeyStages(null)).toEqual([]);
  });

  it('returns empty array for undefined input', () => {
    expect(getKeyStages(undefined)).toEqual([]);
  });

  it('returns empty array for empty array input', () => {
    expect(getKeyStages([])).toEqual([]);
  });

  it('returns first stage when only one stage exists', () => {
    const stages = [createStage({ stage_name: 'Pre-Hydro Acceptance', stage_order: 1 })];
    const result = getKeyStages(stages);
    expect(result).toHaveLength(1);
    expect(result[0].stage_name).toBe('Pre-Hydro Acceptance');
  });

  it('returns first and final stages for simple workflow', () => {
    const stages = [
      createStage({ id: '1', stage_name: 'Pre-Hydro Acceptance', stage_order: 1 }),
      createStage({ id: '2', stage_name: 'Final Package Acceptance', stage_order: 2 }),
    ];
    const result = getKeyStages(stages);
    expect(result).toHaveLength(2);
    expect(result[0].stage_name).toBe('Pre-Hydro Acceptance');
    expect(result[1].stage_name).toBe('Final Package Acceptance');
  });

  it('extracts Test Acceptance stage when present', () => {
    const stages = [
      createStage({ id: '1', stage_name: 'Pre-Hydro Acceptance', stage_order: 1 }),
      createStage({ id: '2', stage_name: 'Test Acceptance', stage_order: 2 }),
      createStage({ id: '3', stage_name: 'Final Package Acceptance', stage_order: 3 }),
    ];
    const result = getKeyStages(stages);
    expect(result).toHaveLength(3);
    expect(result[0].stage_name).toBe('Pre-Hydro Acceptance');
    expect(result[1].stage_name).toBe('Test Acceptance');
    expect(result[2].stage_name).toBe('Final Package Acceptance');
  });

  it('finds test stage by name containing "test" (case-insensitive)', () => {
    const stages = [
      createStage({ id: '1', stage_name: 'Pre-Test Check', stage_order: 1 }),
      createStage({ id: '2', stage_name: 'Pneumatic Test', stage_order: 2 }),
      createStage({ id: '3', stage_name: 'Final Package Acceptance', stage_order: 3 }),
    ];
    const result = getKeyStages(stages);
    expect(result).toHaveLength(3);
    // First stage is also a test stage, so it gets added first
    // Then Pneumatic Test is found as test stage
    expect(result.some((s) => s.stage_name === 'Pneumatic Test')).toBe(true);
    expect(result.some((s) => s.stage_name === 'Final Package Acceptance')).toBe(true);
  });

  it('does not duplicate stages already added', () => {
    const stages = [
      createStage({ id: '1', stage_name: 'Test Acceptance', stage_order: 1 }),
      createStage({ id: '2', stage_name: 'Final Package Acceptance', stage_order: 2 }),
    ];
    const result = getKeyStages(stages);
    // Test Acceptance is both first and contains "test", but should only appear once
    expect(result).toHaveLength(2);
    expect(result.filter((s) => s.stage_name === 'Test Acceptance')).toHaveLength(1);
  });

  it('returns stages sorted by stage_order', () => {
    const stages = [
      createStage({ id: '3', stage_name: 'Final Package Acceptance', stage_order: 5 }),
      createStage({ id: '2', stage_name: 'Test Acceptance', stage_order: 3 }),
      createStage({ id: '1', stage_name: 'Pre-Hydro Acceptance', stage_order: 1 }),
      createStage({ id: '4', stage_name: 'Reinspection', stage_order: 4 }),
    ];
    const result = getKeyStages(stages);
    expect(result).toHaveLength(3);
    expect(result[0].stage_order).toBe(1);
    expect(result[1].stage_order).toBe(3);
    expect(result[2].stage_order).toBe(5);
  });
});

describe('formatStageForDisplay', () => {
  it('formats pending stage correctly', () => {
    const stage = createStage({ stage_name: 'Pre-Hydro Acceptance', status: 'pending' });
    const result = formatStageForDisplay(stage);
    expect(result).toEqual({
      name: 'Pre-Hydro Acceptance',
      status: 'pending',
      companyRep: null,
      clientRep: null,
      completedDate: null,
    });
  });

  it('formats completed stage with signoffs', () => {
    const stage = createStage({
      stage_name: 'Test Acceptance',
      status: 'completed',
      completed_at: '2025-01-15T10:30:00Z',
      signoffs: {
        qc_rep: { name: 'John', date: '2025-01-15T10:30:00Z', user_id: 'user-1' },
        client_rep: { name: 'James', date: '2025-01-15T10:35:00Z', user_id: 'user-2' },
      },
    });
    const result = formatStageForDisplay(stage);
    expect(result).toEqual({
      name: 'Test Acceptance',
      status: 'completed',
      companyRep: 'John',
      clientRep: 'James',
      completedDate: 'Jan 15, 2025',
    });
  });

  it('extracts only company rep when client rep is missing', () => {
    const stage = createStage({
      stage_name: 'Pre-Hydro Acceptance',
      status: 'completed',
      completed_at: '2025-01-15T10:30:00Z',
      signoffs: {
        qc_rep: { name: 'John', date: '2025-01-15T10:30:00Z', user_id: 'user-1' },
      },
    });
    const result = formatStageForDisplay(stage);
    expect(result.companyRep).toBe('John');
    expect(result.clientRep).toBeNull();
  });

  it('returns null reps when signoffs is undefined', () => {
    const stage = createStage({
      stage_name: 'Test Acceptance',
      status: 'completed',
      completed_at: '2025-01-15T10:30:00Z',
      signoffs: undefined,
    });
    const result = formatStageForDisplay(stage);
    expect(result.companyRep).toBeNull();
    expect(result.clientRep).toBeNull();
  });

  it('formats skipped stage correctly', () => {
    const stage = createStage({
      stage_name: 'Optional Stage',
      status: 'skipped',
    });
    const result = formatStageForDisplay(stage);
    expect(result.status).toBe('skipped');
    expect(result.companyRep).toBeNull();
    expect(result.clientRep).toBeNull();
    expect(result.completedDate).toBeNull();
  });
});

describe('getWorkflowSummary', () => {
  it('returns zeros for null input', () => {
    const result = getWorkflowSummary(null);
    expect(result).toEqual({
      totalStages: 0,
      completedStages: 0,
      skippedStages: 0,
      percentComplete: 0,
      isComplete: false,
    });
  });

  it('returns zeros for undefined input', () => {
    const result = getWorkflowSummary(undefined);
    expect(result).toEqual({
      totalStages: 0,
      completedStages: 0,
      skippedStages: 0,
      percentComplete: 0,
      isComplete: false,
    });
  });

  it('returns zeros for empty array', () => {
    const result = getWorkflowSummary([]);
    expect(result).toEqual({
      totalStages: 0,
      completedStages: 0,
      skippedStages: 0,
      percentComplete: 0,
      isComplete: false,
    });
  });

  it('calculates pending workflow correctly', () => {
    const stages = [
      createStage({ status: 'pending' }),
      createStage({ status: 'pending' }),
      createStage({ status: 'pending' }),
    ];
    const result = getWorkflowSummary(stages);
    expect(result).toEqual({
      totalStages: 3,
      completedStages: 0,
      skippedStages: 0,
      percentComplete: 0,
      isComplete: false,
    });
  });

  it('calculates partial completion correctly', () => {
    const stages = [
      createStage({ status: 'completed' }),
      createStage({ status: 'pending' }),
      createStage({ status: 'pending' }),
    ];
    const result = getWorkflowSummary(stages);
    expect(result).toEqual({
      totalStages: 3,
      completedStages: 1,
      skippedStages: 0,
      percentComplete: 33,
      isComplete: false,
    });
  });

  it('calculates complete workflow correctly', () => {
    const stages = [
      createStage({ status: 'completed' }),
      createStage({ status: 'completed' }),
      createStage({ status: 'completed' }),
    ];
    const result = getWorkflowSummary(stages);
    expect(result).toEqual({
      totalStages: 3,
      completedStages: 3,
      skippedStages: 0,
      percentComplete: 100,
      isComplete: true,
    });
  });

  it('treats skipped stages as complete for isComplete calculation', () => {
    const stages = [
      createStage({ status: 'completed' }),
      createStage({ status: 'skipped' }),
      createStage({ status: 'completed' }),
    ];
    const result = getWorkflowSummary(stages);
    expect(result).toEqual({
      totalStages: 3,
      completedStages: 2,
      skippedStages: 1,
      percentComplete: 67,
      isComplete: true,
    });
  });

  it('does not count skipped stages toward percentComplete', () => {
    const stages = [
      createStage({ status: 'skipped' }),
      createStage({ status: 'skipped' }),
      createStage({ status: 'skipped' }),
    ];
    const result = getWorkflowSummary(stages);
    expect(result).toEqual({
      totalStages: 3,
      completedStages: 0,
      skippedStages: 3,
      percentComplete: 0,
      isComplete: true,
    });
  });
});

/**
 * Unit Tests: Workflow Stage Configuration
 * Feature 030 - Test Package Lifecycle Workflow
 *
 * Tests WORKFLOW_STAGES configuration for 7-stage workflow (FR-019).
 */

import { describe, it, expect } from 'vitest';
import {
  WORKFLOW_STAGES,
  getStageConfig,
  getStageByOrder,
  getNextStage,
  getPreviousStage,
} from './workflowStageConfig';

describe('WORKFLOW_STAGES', () => {
  it('should have exactly 7 stages', () => {
    expect(WORKFLOW_STAGES).toHaveLength(7);
  });

  it('should have sequential order from 1 to 7', () => {
    const orders = WORKFLOW_STAGES.map((stage) => stage.order);
    expect(orders).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('should have correct stage names in order', () => {
    const names = WORKFLOW_STAGES.map((stage) => stage.name);
    expect(names).toEqual([
      'Pre-Hydro Acceptance',
      'Test Acceptance',
      'Drain/Flush Acceptance',
      'Post-Hydro Acceptance',
      'Protective Coatings Acceptance',
      'Insulation Acceptance',
      'Final Package Acceptance',
    ]);
  });

  it('should require qc_rep sign-off for all stages (FR-023)', () => {
    WORKFLOW_STAGES.forEach((stage) => {
      expect(stage.required_signoffs).toContain('qc_rep');
    });
  });

  it('should have varying sign-off requirements per stage', () => {
    // Stage 2 (Test Acceptance) and Stage 7 (Final Acceptance) require client_rep
    const testAcceptance = WORKFLOW_STAGES.find((s) => s.name === 'Test Acceptance');
    expect(testAcceptance?.required_signoffs).toContain('client_rep');

    const finalAcceptance = WORKFLOW_STAGES.find((s) => s.name === 'Final Package Acceptance');
    expect(finalAcceptance?.required_signoffs).toContain('client_rep');
    expect(finalAcceptance?.required_signoffs).toContain('mfg_rep');
  });

  it('should not have duplicate stage names', () => {
    const names = WORKFLOW_STAGES.map((stage) => stage.name);
    const uniqueNames = new Set(names);
    expect(uniqueNames.size).toBe(names.length);
  });

  it('should not have duplicate orders', () => {
    const orders = WORKFLOW_STAGES.map((stage) => stage.order);
    const uniqueOrders = new Set(orders);
    expect(uniqueOrders.size).toBe(orders.length);
  });
});

describe('getStageConfig', () => {
  it('should return stage config by name', () => {
    const stage = getStageConfig('Pre-Hydro Acceptance');
    expect(stage).toBeDefined();
    expect(stage?.name).toBe('Pre-Hydro Acceptance');
    expect(stage?.order).toBe(1);
  });

  it('should throw error for invalid stage name', () => {
    expect(() => getStageConfig('Invalid Stage' as any)).toThrow('Unknown stage: Invalid Stage');
  });

  it('should return correct config for all stage names', () => {
    const testAcceptance = getStageConfig('Test Acceptance');
    expect(testAcceptance?.order).toBe(2);

    const finalAcceptance = getStageConfig('Final Package Acceptance');
    expect(finalAcceptance?.order).toBe(7);
  });
});

describe('getStageByOrder', () => {
  it('should return stage config by order', () => {
    const stage = getStageByOrder(1);
    expect(stage).toBeDefined();
    expect(stage?.name).toBe('Pre-Hydro Acceptance');
    expect(stage?.order).toBe(1);
  });

  it('should return undefined for order < 1', () => {
    const stage = getStageByOrder(0);
    expect(stage).toBeUndefined();
  });

  it('should return undefined for order > 7', () => {
    const stage = getStageByOrder(8);
    expect(stage).toBeUndefined();
  });

  it('should return correct config for all valid orders', () => {
    for (let i = 1; i <= 7; i++) {
      const stage = getStageByOrder(i);
      expect(stage?.order).toBe(i);
    }
  });
});

describe('getNextStage', () => {
  it('should return next stage in sequence', () => {
    const next = getNextStage('Pre-Hydro Acceptance');
    expect(next).toBe('Test Acceptance');
  });

  it('should return null for final stage', () => {
    const next = getNextStage('Final Package Acceptance');
    expect(next).toBeNull();
  });

  it('should handle all stages except final', () => {
    const preHydro = getNextStage('Pre-Hydro Acceptance');
    expect(preHydro).toBe('Test Acceptance');

    const testAcceptance = getNextStage('Test Acceptance');
    expect(testAcceptance).toBe('Drain/Flush Acceptance');

    const drainFlush = getNextStage('Drain/Flush Acceptance');
    expect(drainFlush).toBe('Post-Hydro Acceptance');

    const postHydro = getNextStage('Post-Hydro Acceptance');
    expect(postHydro).toBe('Protective Coatings Acceptance');

    const coatings = getNextStage('Protective Coatings Acceptance');
    expect(coatings).toBe('Insulation Acceptance');

    const insulation = getNextStage('Insulation Acceptance');
    expect(insulation).toBe('Final Package Acceptance');
  });

  it('should return null for invalid stage name', () => {
    const next = getNextStage('Invalid Stage' as any);
    expect(next).toBeNull();
  });
});

describe('getPreviousStage', () => {
  it('should return previous stage in sequence', () => {
    const prev = getPreviousStage('Test Acceptance');
    expect(prev).toBe('Pre-Hydro Acceptance');
  });

  it('should return null for first stage', () => {
    const prev = getPreviousStage('Pre-Hydro Acceptance');
    expect(prev).toBeNull();
  });

  it('should handle all stages except first', () => {
    const testAcceptance = getPreviousStage('Test Acceptance');
    expect(testAcceptance).toBe('Pre-Hydro Acceptance');

    const drainFlush = getPreviousStage('Drain/Flush Acceptance');
    expect(drainFlush).toBe('Test Acceptance');

    const postHydro = getPreviousStage('Post-Hydro Acceptance');
    expect(postHydro).toBe('Drain/Flush Acceptance');

    const coatings = getPreviousStage('Protective Coatings Acceptance');
    expect(coatings).toBe('Post-Hydro Acceptance');

    const insulation = getPreviousStage('Insulation Acceptance');
    expect(insulation).toBe('Protective Coatings Acceptance');

    const final = getPreviousStage('Final Package Acceptance');
    expect(final).toBe('Insulation Acceptance');
  });

  it('should return null for invalid stage name', () => {
    const prev = getPreviousStage('Invalid Stage' as any);
    expect(prev).toBeNull();
  });
});

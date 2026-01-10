/**
 * Unit Tests: WorkflowSignoffsTable Component
 * Feature 030: Enhanced Package Completion Report PDF
 *
 * Tests that WorkflowSignoffsTable correctly:
 * - Shows key stages by default
 * - Shows all stages when showAll=true
 * - Displays status correctly (completed, pending, skipped, in_progress)
 * - Handles empty stages
 * - Uses custom title when provided
 */

import type { PropsWithChildren } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { WorkflowSignoffsTable } from './WorkflowSignoffsTable';
import type { PackageWorkflowStage } from '@/types/workflow.types';

// Mock @react-pdf/renderer
vi.mock('@react-pdf/renderer', () => ({
  View: ({ children }: PropsWithChildren) => <div data-testid="pdf-view">{children}</div>,
  Text: ({ children }: PropsWithChildren) => <span data-testid="pdf-text">{children}</span>,
  StyleSheet: { create: (styles: Record<string, unknown>) => styles },
}));

// Mock getKeyStages - return first, test, and final stages
vi.mock('@/lib/getKeyStages', () => ({
  getKeyStages: (stages: PackageWorkflowStage[]) => {
    if (!stages || stages.length === 0) return [];
    const keyStages: PackageWorkflowStage[] = [];
    const first = stages.find((s) => s.stage_order === 1);
    if (first) keyStages.push(first);
    const test = stages.find((s) => s.stage_name.includes('Test') && s.stage_order !== 1);
    if (test) keyStages.push(test);
    const final = stages.find((s) => s.stage_name === 'Final Package Acceptance');
    if (final) keyStages.push(final);
    return keyStages.sort((a, b) => a.stage_order - b.stage_order);
  },
  formatStageForDisplay: (stage: PackageWorkflowStage) => ({
    name: stage.stage_name,
    status: stage.status as 'completed' | 'pending' | 'skipped' | 'in_progress',
    companyRep:
      stage.status === 'completed' && stage.completed_by_user
        ? stage.completed_by_user.full_name || stage.completed_by_user.email
        : null,
    clientRep: null,
    completedDate: stage.status === 'completed' && stage.completed_at ? 'Jan 15, 2025' : null,
  }),
}));

// Factory for creating test stages
function createStage(overrides: Partial<PackageWorkflowStage> = {}): PackageWorkflowStage {
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
    skip_reason: null,
    skipped_at: null,
    skipped_by: null,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('WorkflowSignoffsTable', () => {
  const sampleStages: PackageWorkflowStage[] = [
    createStage({ id: '1', stage_name: 'Pre-Hydro Acceptance', stage_order: 1, status: 'completed' }),
    createStage({ id: '2', stage_name: 'Hydro Prep', stage_order: 2, status: 'completed' }),
    createStage({ id: '3', stage_name: 'Test Acceptance', stage_order: 3, status: 'pending' }),
    createStage({ id: '4', stage_name: 'Post-Test Review', stage_order: 4, status: 'pending' }),
    createStage({ id: '5', stage_name: 'Final Package Acceptance', stage_order: 5, status: 'pending' }),
  ];

  describe('empty states', () => {
    it('renders empty state message when stages array is empty', () => {
      const { container } = render(<WorkflowSignoffsTable stages={[]} />);
      expect(container.textContent).toContain('No workflow stages available');
    });

    it('renders title even with empty stages', () => {
      const { container } = render(<WorkflowSignoffsTable stages={[]} />);
      expect(container.textContent).toContain('Key Approvals');
    });
  });

  describe('key stages (default mode)', () => {
    it('renders Key Approvals title by default', () => {
      const { container } = render(<WorkflowSignoffsTable stages={sampleStages} />);
      expect(container.textContent).toContain('Key Approvals');
    });

    it('renders only key stages (first, test, final)', () => {
      const { container } = render(<WorkflowSignoffsTable stages={sampleStages} />);
      expect(container.textContent).toContain('Pre-Hydro Acceptance');
      expect(container.textContent).toContain('Test Acceptance');
      expect(container.textContent).toContain('Final Package Acceptance');
      // Should NOT contain intermediate stages
      expect(container.textContent).not.toContain('Hydro Prep');
      expect(container.textContent).not.toContain('Post-Test Review');
    });

    it('renders table headers', () => {
      const { container } = render(<WorkflowSignoffsTable stages={sampleStages} />);
      expect(container.textContent).toContain('Stage');
      expect(container.textContent).toContain('Status');
      expect(container.textContent).toContain('Company Rep');
      expect(container.textContent).toContain('Client Rep');
      expect(container.textContent).toContain('Date');
    });
  });

  describe('all stages mode', () => {
    it('renders Workflow Approvals title when showAll=true', () => {
      const { container } = render(<WorkflowSignoffsTable stages={sampleStages} showAll />);
      expect(container.textContent).toContain('Workflow Approvals');
    });

    it('renders all stages when showAll=true', () => {
      const { container } = render(<WorkflowSignoffsTable stages={sampleStages} showAll />);
      expect(container.textContent).toContain('Pre-Hydro Acceptance');
      expect(container.textContent).toContain('Hydro Prep');
      expect(container.textContent).toContain('Test Acceptance');
      expect(container.textContent).toContain('Post-Test Review');
      expect(container.textContent).toContain('Final Package Acceptance');
    });
  });

  describe('custom title', () => {
    it('uses custom title when provided', () => {
      const { container } = render(
        <WorkflowSignoffsTable stages={sampleStages} title="Custom Title" />
      );
      expect(container.textContent).toContain('Custom Title');
      expect(container.textContent).not.toContain('Key Approvals');
    });

    it('uses custom title with showAll', () => {
      const { container } = render(
        <WorkflowSignoffsTable stages={sampleStages} title="All Stages" showAll />
      );
      expect(container.textContent).toContain('All Stages');
      expect(container.textContent).not.toContain('Workflow Approvals');
    });
  });

  describe('status display', () => {
    it('displays Completed status correctly', () => {
      const completedStages = [
        createStage({
          id: '1',
          stage_name: 'Completed Stage',
          stage_order: 1,
          status: 'completed',
          completed_at: '2025-01-15T10:00:00Z',
          completed_by_user: { id: 'u1', full_name: 'John Doe', email: 'john@example.com' },
        }),
      ];
      const { container } = render(<WorkflowSignoffsTable stages={completedStages} />);
      expect(container.textContent).toContain('Completed');
      expect(container.textContent).toContain('John Doe');
      expect(container.textContent).toContain('Jan 15, 2025');
    });

    it('displays Pending status correctly', () => {
      const pendingStages = [
        createStage({ id: '1', stage_name: 'Pending Stage', stage_order: 1, status: 'pending' }),
      ];
      const { container } = render(<WorkflowSignoffsTable stages={pendingStages} />);
      expect(container.textContent).toContain('Pending');
    });

    it('displays Skipped status correctly', () => {
      const skippedStages = [
        createStage({ id: '1', stage_name: 'Skipped Stage', stage_order: 1, status: 'skipped' }),
      ];
      const { container } = render(<WorkflowSignoffsTable stages={skippedStages} />);
      expect(container.textContent).toContain('Skipped');
    });

    it('displays In Progress status correctly', () => {
      const inProgressStages = [
        createStage({ id: '1', stage_name: 'In Progress Stage', stage_order: 1, status: 'in_progress' }),
      ];
      const { container } = render(<WorkflowSignoffsTable stages={inProgressStages} showAll />);
      expect(container.textContent).toContain('In Progress');
    });
  });
});

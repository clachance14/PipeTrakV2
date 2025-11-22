/**
 * Integration Tests: Package Workflow Stage Completion
 * Feature 030 - Test Package Lifecycle Workflow - User Story 4
 *
 * Tests FR-019 through FR-026:
 * - FR-019: 7-stage sequential workflow
 * - FR-020: Sequential stage enforcement
 * - FR-021: Skip stage with reason
 * - FR-024: Stage-specific sign-offs
 * - FR-026: Audit trail for completed stages
 *
 * Test Scenarios:
 * 1. Workflow stepper displays 7 stages with status
 * 2. Pre-Hydro complete → Test Acceptance becomes available
 * 3. Cannot skip stages (sequential enforcement)
 * 4. Skip stage with required reason text
 * 5. Completed stage shows audit trail (read-only)
 * 6. Final acceptance completes package
 * 7. Stage validation errors (missing required fields)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import userEvent from '@testing-library/user-event';
import { createElement } from 'react';
import { supabase } from '@/lib/supabase';
import { usePackageWorkflow, useCreateWorkflowStages, useUpdateWorkflowStage } from '@/hooks/usePackageWorkflow';
import { PackageWorkflowStepper } from '@/components/packages/PackageWorkflowStepper';
import { PackageWorkflowStageForm } from '@/components/packages/PackageWorkflowStageForm';
import type { PackageWorkflowStage } from '@/types/workflow.types';

// Mock supabase client
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
  },
}));

// Mock toast notifications
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock auth context
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'test-user-uuid', email: 'test@example.com' },
  }),
}));

describe('Package Workflow Stage Completion', () => {
  let queryClient: QueryClient;
  const testPackageId = 'test-package-uuid';
  const testUserId = 'test-user-uuid';

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    vi.clearAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);

  // Helper to create mock stages
  const createMockStages = (overrides?: Partial<PackageWorkflowStage>[]): PackageWorkflowStage[] => {
    const baseStages: PackageWorkflowStage[] = [
      {
        id: 'stage-1',
        package_id: testPackageId,
        stage_name: 'Pre-Hydro Acceptance',
        stage_order: 1,
        status: 'not_started',
        stage_data: null,
        signoffs: null,
        skip_reason: null,
        completed_by: null,
        completed_at: null,
        created_at: '2025-11-21T00:00:00Z',
        updated_at: '2025-11-21T00:00:00Z',
      },
      {
        id: 'stage-2',
        package_id: testPackageId,
        stage_name: 'Test Acceptance',
        stage_order: 2,
        status: 'not_started',
        stage_data: null,
        signoffs: null,
        skip_reason: null,
        completed_by: null,
        completed_at: null,
        created_at: '2025-11-21T00:00:00Z',
        updated_at: '2025-11-21T00:00:00Z',
      },
      {
        id: 'stage-3',
        package_id: testPackageId,
        stage_name: 'Drain/Flush Acceptance',
        stage_order: 3,
        status: 'not_started',
        stage_data: null,
        signoffs: null,
        skip_reason: null,
        completed_by: null,
        completed_at: null,
        created_at: '2025-11-21T00:00:00Z',
        updated_at: '2025-11-21T00:00:00Z',
      },
      {
        id: 'stage-4',
        package_id: testPackageId,
        stage_name: 'Post-Hydro Acceptance',
        stage_order: 4,
        status: 'not_started',
        stage_data: null,
        signoffs: null,
        skip_reason: null,
        completed_by: null,
        completed_at: null,
        created_at: '2025-11-21T00:00:00Z',
        updated_at: '2025-11-21T00:00:00Z',
      },
      {
        id: 'stage-5',
        package_id: testPackageId,
        stage_name: 'Protective Coatings Acceptance',
        stage_order: 5,
        status: 'not_started',
        stage_data: null,
        signoffs: null,
        skip_reason: null,
        completed_by: null,
        completed_at: null,
        created_at: '2025-11-21T00:00:00Z',
        updated_at: '2025-11-21T00:00:00Z',
      },
      {
        id: 'stage-6',
        package_id: testPackageId,
        stage_name: 'Insulation Acceptance',
        stage_order: 6,
        status: 'not_started',
        stage_data: null,
        signoffs: null,
        skip_reason: null,
        completed_by: null,
        completed_at: null,
        created_at: '2025-11-21T00:00:00Z',
        updated_at: '2025-11-21T00:00:00Z',
      },
      {
        id: 'stage-7',
        package_id: testPackageId,
        stage_name: 'Final Package Acceptance',
        stage_order: 7,
        status: 'not_started',
        stage_data: null,
        signoffs: null,
        skip_reason: null,
        completed_by: null,
        completed_at: null,
        created_at: '2025-11-21T00:00:00Z',
        updated_at: '2025-11-21T00:00:00Z',
      },
    ];

    if (overrides) {
      return baseStages.map((stage, index) => ({
        ...stage,
        ...(overrides[index] || {}),
      }));
    }

    return baseStages;
  };

  describe('Scenario 1: Workflow stepper displays 7 stages with status', () => {
    it('should display all 7 workflow stages in correct order', async () => {
      const mockStages = createMockStages();

      // Mock query for workflow stages
      vi.mocked(supabase.from).mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValueOnce({
          data: mockStages,
          error: null,
        }),
      } as any);

      render(<PackageWorkflowStepper packageId={testPackageId} />, { wrapper });

      await waitFor(() => {
        expect(screen.getByText('Pre-Hydro Acceptance')).toBeInTheDocument();
        expect(screen.getByText('Test Acceptance')).toBeInTheDocument();
        expect(screen.getByText('Drain/Flush Acceptance')).toBeInTheDocument();
        expect(screen.getByText('Post-Hydro Acceptance')).toBeInTheDocument();
        expect(screen.getByText('Protective Coatings Acceptance')).toBeInTheDocument();
        expect(screen.getByText('Insulation Acceptance')).toBeInTheDocument();
        expect(screen.getByText('Final Package Acceptance')).toBeInTheDocument();
      });
    });

    it('should display stage status indicators correctly', async () => {
      const mockStages = createMockStages([
        { status: 'completed' }, // Stage 1 completed
        { status: 'in_progress' }, // Stage 2 in progress
        { status: 'not_started' }, // Stage 3 not started
        { status: 'not_started' },
        { status: 'not_started' },
        { status: 'not_started' },
        { status: 'not_started' },
      ]);

      vi.mocked(supabase.from).mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValueOnce({
          data: mockStages,
          error: null,
        }),
      } as any);

      render(<PackageWorkflowStepper packageId={testPackageId} />, { wrapper });

      await waitFor(() => {
        // Verify stage status colors/indicators
        const stage1 = screen.getByText('Pre-Hydro Acceptance').closest('[data-status]');
        expect(stage1).toHaveAttribute('data-status', 'completed');

        const stage2 = screen.getByText('Test Acceptance').closest('[data-status]');
        expect(stage2).toHaveAttribute('data-status', 'in_progress');

        const stage3 = screen.getByText('Drain/Flush Acceptance').closest('[data-status]');
        expect(stage3).toHaveAttribute('data-status', 'not_started');
      });
    });
  });

  describe('Scenario 2: Pre-Hydro complete → Test Acceptance becomes available', () => {
    it('should unlock next stage when previous stage is completed', async () => {
      const mockStages = createMockStages([
        {
          status: 'completed',
          completed_by: testUserId,
          completed_at: '2025-11-21T10:00:00Z',
          stage_data: {
            stage: 'pre_hydro',
            inspector: 'John Doe',
            nde_complete: true,
          },
          signoffs: {
            qc_rep: {
              name: 'QC User',
              date: '2025-11-21T10:00:00Z',
              user_id: testUserId,
            },
          },
        },
        { status: 'not_started' }, // Test Acceptance should now be available
      ]);

      vi.mocked(supabase.from).mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValueOnce({
          data: mockStages,
          error: null,
        }),
      } as any);

      const { result } = renderHook(() => usePackageWorkflow(testPackageId), { wrapper });

      await waitFor(() => {
        expect(result.current.data).toHaveLength(7);
        expect(result.current.data?.[0]?.status).toBe('completed');
        expect(result.current.data?.[1]?.status).toBe('not_started');
      });

      // Test Acceptance should be clickable/available
      const stage2 = result.current.data?.[1];
      expect(stage2?.stage_name).toBe('Test Acceptance');
      // Sequential enforcement: stage is available because previous stage is completed
    });
  });

  describe('Scenario 3: Cannot skip stages (sequential enforcement)', () => {
    it('should prevent completing stage if previous stage is not completed or skipped', async () => {
      const mockStages = createMockStages([
        { status: 'not_started' }, // Stage 1 not started
        { status: 'not_started' }, // Stage 2 not started
      ]);

      vi.mocked(supabase.from).mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValueOnce({
          data: mockStages,
          error: null,
        }),
      } as any);

      // Try to update stage 2 (Test Acceptance) without completing stage 1
      vi.mocked(supabase.from).mockReturnValueOnce({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValueOnce({
          data: null,
          error: { message: 'Cannot complete stage: previous stage not completed or skipped' },
        }),
      } as any);

      const { result } = renderHook(() => useUpdateWorkflowStage(), { wrapper });

      await waitFor(() => expect(result.current).toBeDefined());

      // Attempt to mark stage 2 as in_progress (should fail validation)
      result.current.mutate({
        stageId: 'stage-2',
        input: { status: 'in_progress' },
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });

  describe('Scenario 4: Skip stage with required reason text', () => {
    it('should allow skipping stage with valid reason', async () => {
      const mockStages = createMockStages([
        { status: 'completed' }, // Stage 1 completed
        { status: 'not_started' }, // Stage 2 will be skipped
      ]);

      vi.mocked(supabase.from).mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValueOnce({
          data: mockStages,
          error: null,
        }),
      } as any);

      const { result } = renderHook(() => useUpdateWorkflowStage(), { wrapper });

      await waitFor(() => expect(result.current).toBeDefined());

      // Mock successful skip
      vi.mocked(supabase.from).mockReturnValueOnce({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockResolvedValueOnce({
          data: [
            {
              ...mockStages[1],
              status: 'skipped',
              skip_reason: 'Test not applicable for this package type',
            },
          ],
          error: null,
        }),
      } as any);

      result.current.mutate({
        stageId: 'stage-2',
        input: {
          status: 'skipped',
          skip_reason: 'Test not applicable for this package type',
        },
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Verify the returned data
      const returnedData = result.current.data;
      expect(returnedData).toBeDefined();
      expect(returnedData?.[0]?.status).toBe('skipped');
      expect(returnedData?.[0]?.skip_reason).toBe('Test not applicable for this package type');
    });

    it('should reject skip without reason', async () => {
      const { result } = renderHook(() => useUpdateWorkflowStage(), { wrapper });

      await waitFor(() => expect(result.current).toBeDefined());

      // Mock rejection due to missing skip_reason
      vi.mocked(supabase.from).mockReturnValueOnce({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValueOnce({
          data: null,
          error: { message: 'Skip reason is required when skipping a stage' },
        }),
      } as any);

      result.current.mutate({
        stageId: 'stage-2',
        input: {
          status: 'skipped',
          skip_reason: '', // Empty reason
        },
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });

  describe('Scenario 5: Completed stage shows audit trail (read-only)', () => {
    it('should display audit trail for completed stage', async () => {
      const completedStage: PackageWorkflowStage = {
        id: 'stage-1',
        package_id: testPackageId,
        stage_name: 'Pre-Hydro Acceptance',
        stage_order: 1,
        status: 'completed',
        stage_data: {
          stage: 'pre_hydro',
          inspector: 'John Doe',
          nde_complete: true,
        },
        signoffs: {
          qc_rep: {
            name: 'QC User',
            date: '2025-11-21T10:00:00Z',
            user_id: testUserId,
          },
        },
        skip_reason: null,
        completed_by: testUserId,
        completed_at: '2025-11-21T10:00:00Z',
        created_at: '2025-11-21T00:00:00Z',
        updated_at: '2025-11-21T10:00:00Z',
      };

      render(<PackageWorkflowStageForm stage={completedStage} />, { wrapper });

      await waitFor(() => {
        // Verify audit trail information is displayed
        expect(screen.getByText(/Completed by:/i)).toBeInTheDocument();
        expect(screen.getByText(/Completed at:/i)).toBeInTheDocument();
        expect(screen.getByText(/QC User/i)).toBeInTheDocument();

        // Verify form is read-only (no edit buttons)
        expect(screen.queryByRole('button', { name: /mark complete/i })).not.toBeInTheDocument();
      });
    });
  });

  describe('Scenario 6: Final acceptance completes package', () => {
    it('should mark package as fully approved when final stage is completed', async () => {
      const mockStages = createMockStages([
        { status: 'completed' },
        { status: 'completed' },
        { status: 'completed' },
        { status: 'completed' },
        { status: 'completed' },
        { status: 'completed' },
        {
          status: 'completed',
          completed_by: testUserId,
          completed_at: '2025-11-21T16:00:00Z',
          stage_data: {
            stage: 'final_acceptance',
            final_notes: 'All stages completed successfully',
          },
          signoffs: {
            qc_rep: {
              name: 'QC User',
              date: '2025-11-21T16:00:00Z',
              user_id: testUserId,
            },
            client_rep: {
              name: 'Client Rep',
              date: '2025-11-21T16:00:00Z',
              user_id: 'client-user-uuid',
            },
            mfg_rep: {
              name: 'MFG Rep',
              date: '2025-11-21T16:00:00Z',
              user_id: 'mfg-user-uuid',
            },
          },
        },
      ]);

      vi.mocked(supabase.from).mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValueOnce({
          data: mockStages,
          error: null,
        }),
      } as any);

      const { result } = renderHook(() => usePackageWorkflow(testPackageId), { wrapper });

      await waitFor(() => {
        expect(result.current.data).toBeDefined();
        expect(result.current.data).toHaveLength(7);
        const allCompleted = result.current.data?.every((stage) => stage.status === 'completed');
        expect(allCompleted).toBe(true);
      });

      const finalStage = result.current.data?.[6];
      expect(finalStage?.stage_name).toBe('Final Package Acceptance');
      expect(finalStage?.status).toBe('completed');
      expect(finalStage?.signoffs?.qc_rep).toBeDefined();
      expect(finalStage?.signoffs?.client_rep).toBeDefined();
      expect(finalStage?.signoffs?.mfg_rep).toBeDefined();
    });
  });

  describe('Scenario 7: Stage validation errors (missing required fields)', () => {
    it('should reject completion with missing stage data', async () => {
      const { result } = renderHook(() => useUpdateWorkflowStage(), { wrapper });

      await waitFor(() => expect(result.current).toBeDefined());

      // Mock validation error
      vi.mocked(supabase.from).mockReturnValueOnce({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValueOnce({
          data: null,
          error: { message: 'Stage data is required for completion' },
        }),
      } as any);

      result.current.mutate({
        stageId: 'stage-1',
        input: {
          status: 'completed',
          stage_data: null as any, // Missing required stage data
          signoffs: {
            qc_rep: {
              name: 'QC User',
              date: '2025-11-21T10:00:00Z',
              user_id: testUserId,
            },
          },
          completed_by: testUserId,
          completed_at: '2025-11-21T10:00:00Z',
        },
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });

    it('should reject completion with missing required sign-offs', async () => {
      const { result } = renderHook(() => useUpdateWorkflowStage(), { wrapper });

      await waitFor(() => expect(result.current).toBeDefined());

      // Mock validation error
      vi.mocked(supabase.from).mockReturnValueOnce({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValueOnce({
          data: null,
          error: { message: 'QC Representative sign-off is required' },
        }),
      } as any);

      result.current.mutate({
        stageId: 'stage-1',
        input: {
          status: 'completed',
          stage_data: {
            stage: 'pre_hydro',
            inspector: 'John Doe',
            nde_complete: true,
          },
          signoffs: {} as any, // Missing required qc_rep sign-off
          completed_by: testUserId,
          completed_at: '2025-11-21T10:00:00Z',
        },
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });

    it('should reject Test Acceptance completion with missing both QC and Client sign-offs', async () => {
      const { result } = renderHook(() => useUpdateWorkflowStage(), { wrapper });

      await waitFor(() => expect(result.current).toBeDefined());

      // Mock validation error
      vi.mocked(supabase.from).mockReturnValueOnce({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValueOnce({
          data: null,
          error: { message: 'QC Representative and Client Representative sign-offs are required' },
        }),
      } as any);

      result.current.mutate({
        stageId: 'stage-2',
        input: {
          status: 'completed',
          stage_data: {
            stage: 'test_acceptance',
            gauge_numbers: ['G-001', 'G-002'],
            calibration_dates: ['2025-11-01', '2025-11-01'],
            time_held: 240,
          },
          signoffs: {
            qc_rep: {
              name: 'QC User',
              date: '2025-11-21T11:00:00Z',
              user_id: testUserId,
            },
            // Missing client_rep
          } as any,
          completed_by: testUserId,
          completed_at: '2025-11-21T11:00:00Z',
        },
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });

  describe('Hook: useCreateWorkflowStages', () => {
    it('should create all 7 workflow stages for a package', async () => {
      const mockStages = createMockStages();

      const { result } = renderHook(() => useCreateWorkflowStages(), { wrapper });

      await waitFor(() => expect(result.current).toBeDefined());

      // Mock insert call to create stages
      vi.mocked(supabase.from).mockReturnValueOnce({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockResolvedValueOnce({
          data: mockStages,
          error: null,
        }),
      } as any);

      result.current.mutate({ packageId: testPackageId });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Verify the returned data
      const returnedData = result.current.data;
      expect(returnedData).toBeDefined();
      expect(returnedData).toHaveLength(7);
    });
  });

  describe('Edge Case T078: Completed stage editing with audit trail', () => {
    it('should allow editing completed stage with audit trail note', async () => {
      const completedStage: PackageWorkflowStage = {
        id: 'stage-1',
        package_id: testPackageId,
        stage_name: 'Pre-Hydro Acceptance',
        stage_order: 1,
        status: 'completed',
        stage_data: {
          stage: 'pre_hydro',
          inspector: 'John Doe',
          nde_complete: true,
        },
        signoffs: {
          qc_rep: {
            name: 'QC User',
            date: '2025-11-21T10:00:00Z',
            user_id: testUserId,
          },
        },
        skip_reason: null,
        completed_by: testUserId,
        completed_at: '2025-11-21T10:00:00Z',
        created_at: '2025-11-21T00:00:00Z',
        updated_at: '2025-11-21T10:00:00Z',
      };

      render(<PackageWorkflowStageForm stage={completedStage} />, { wrapper });

      await waitFor(() => {
        // Verify "Edit" button is shown for completed stage
        expect(screen.queryByRole('button', { name: /edit/i })).toBeInTheDocument();
      });

      // Click "Edit" button
      const editButton = screen.getByRole('button', { name: /edit/i });
      await userEvent.click(editButton);

      await waitFor(() => {
        // Verify form fields are re-enabled for editing
        // Verify audit trail note is shown: "Previously completed by [user] on [date]"
        expect(screen.getByText(/previously completed by/i)).toBeInTheDocument();
        expect(screen.getByText(/QC User/i)).toBeInTheDocument();
      });
    });

    it('should preserve original completion data in audit trail after edit', async () => {
      const { result } = renderHook(() => useUpdateWorkflowStage(), { wrapper });

      await waitFor(() => expect(result.current).toBeDefined());

      const originalCompletedBy = testUserId;
      const originalCompletedAt = '2025-11-21T10:00:00Z';

      // Mock update with new data
      vi.mocked(supabase.from).mockReturnValueOnce({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockResolvedValueOnce({
          data: [
            {
              id: 'stage-1',
              package_id: testPackageId,
              stage_name: 'Pre-Hydro Acceptance',
              stage_order: 1,
              status: 'completed',
              stage_data: {
                stage: 'pre_hydro',
                inspector: 'Jane Smith', // Updated
                nde_complete: true,
                original_completion: {
                  completed_by: originalCompletedBy,
                  completed_at: originalCompletedAt,
                  completed_by_name: 'QC User',
                },
              },
              signoffs: {
                qc_rep: {
                  name: 'QC User Updated',
                  date: '2025-11-21T14:00:00Z',
                  user_id: testUserId,
                },
              },
              skip_reason: null,
              completed_by: testUserId,
              completed_at: '2025-11-21T14:00:00Z', // New completion time
              created_at: '2025-11-21T00:00:00Z',
              updated_at: '2025-11-21T14:00:00Z',
            },
          ],
          error: null,
        }),
      } as any);

      result.current.mutate({
        stageId: 'stage-1',
        input: {
          stage_data: {
            stage: 'pre_hydro',
            inspector: 'Jane Smith',
            nde_complete: true,
            original_completion: {
              completed_by: originalCompletedBy,
              completed_at: originalCompletedAt,
              completed_by_name: 'QC User',
            },
          },
        },
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Expected: Original completion data is preserved in stage_data
      const updatedStage = result.current.data?.[0];
      expect(updatedStage?.stage_data?.original_completion).toBeDefined();
      expect(updatedStage?.stage_data?.original_completion?.completed_by).toBe(originalCompletedBy);
    });
  });
});

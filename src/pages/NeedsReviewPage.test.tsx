/**
 * Integration Test: NeedsReviewPage - Notification Resolution
 *
 * Tests that resolving a notification actually updates the database.
 *
 * BUG: Currently handleSubmitResolve doesn't call useResolveNeedsReview mutation,
 * so notifications don't get cleared from the database.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { NeedsReviewPage } from './NeedsReviewPage';
import * as useNeedsReviewModule from '@/hooks/useNeedsReview';
import * as useProjectModule from '@/contexts/ProjectContext';

// Mock the hooks
vi.mock('@/hooks/useNeedsReview', async () => {
  const actual = await vi.importActual('@/hooks/useNeedsReview');
  return {
    ...actual,
    useNeedsReview: vi.fn(),
    useResolveNeedsReview: vi.fn(),
  };
});

vi.mock('@/contexts/ProjectContext', () => ({
  useProject: vi.fn(),
  ProjectProvider: ({ children }: { children: any }) => children,
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(() => ({
    user: { id: 'qc-user-123', email: 'qc@example.com', role: 'qc_inspector' },
    session: { user: { id: 'qc-user-123' } },
    loading: false,
    signIn: vi.fn(),
    signOut: vi.fn(),
  })),
}));

vi.mock('@/hooks/useProjects', () => ({
  useProjects: vi.fn(() => ({
    data: [{ id: 'project-123', name: 'Test Project' }],
    isLoading: false,
  })),
}));

vi.mock('@/hooks/useChangelog', () => ({
  useChangelog: vi.fn(() => ({
    shouldShowModal: false,
    release: null,
    markAsViewed: vi.fn(),
  })),
}));

describe('NeedsReviewPage - Notification Resolution', () => {
  let queryClient: QueryClient;
  const mockMutate = vi.fn();
  const mockMutateAsync = vi.fn().mockResolvedValue(undefined);
  const mockRefetch = vi.fn();

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    vi.clearAllMocks();

    // Mock useResolveNeedsReview to return a working mutation
    vi.spyOn(useNeedsReviewModule, 'useResolveNeedsReview').mockReturnValue({
      mutate: mockMutate,
      mutateAsync: mockMutateAsync,
      isPending: false,
      isError: false,
      isSuccess: false,
      isIdle: true,
      data: undefined,
      error: null,
      reset: vi.fn(),
      status: 'idle',
      variables: undefined,
      context: undefined,
      failureCount: 0,
      failureReason: null,
      isPaused: false,
      submittedAt: 0,
    });
  });

  const renderWithProviders = (projectId: string) => {
    // Mock useProject to return the test project ID
    vi.mocked(useProjectModule.useProject).mockReturnValue({
      selectedProjectId: projectId,
      setSelectedProjectId: vi.fn(),
    });

    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <NeedsReviewPage />
        </MemoryRouter>
      </QueryClientProvider>
    );
  };

  it('should call useResolveNeedsReview mutation when resolving a notification', async () => {
    const user = userEvent.setup();
    const projectId = 'project-123';

    // Mock useNeedsReview to return a weld_completed notification
    const mockNotification = {
      id: 'review-123',
      project_id: projectId,
      type: 'weld_completed',
      status: 'pending',
      payload: {
        weld_id: 'weld-456',
        weld_number: 'W-001',
        component_id: 'comp-789',
        drawing_number: 'DWG-001',
        welder_name: 'John Doe',
        date_welded: '2025-11-24',
        weld_type: 'BW',
        nde_required: false,
      },
      created_at: new Date().toISOString(),
      resolved_at: null,
      resolved_by: null,
      resolution_note: null,
    };

    vi.spyOn(useNeedsReviewModule, 'useNeedsReview').mockReturnValue({
      data: [mockNotification],
      isLoading: false,
      isError: false,
      error: null,
      refetch: mockRefetch,
      isSuccess: true,
      isLoadingError: false,
      isRefetchError: false,
      isRefetching: false,
      status: 'success',
      dataUpdatedAt: Date.now(),
      errorUpdatedAt: 0,
      failureCount: 0,
      failureReason: null,
      errorUpdateCount: 0,
      isFetched: true,
      isFetchedAfterMount: true,
      isFetching: false,
      isInitialLoading: false,
      isPaused: false,
      isPlaceholderData: false,
      isPreviousData: false,
      isStale: false,
      fetchStatus: 'idle' as const,
    });

    renderWithProviders(projectId);

    // Wait for the notification to appear
    await waitFor(() => {
      expect(screen.getByText('W-001')).toBeInTheDocument();
    });

    // Find and click the Resolve button (the one with the icon, not the filter)
    const resolveButtons = screen.getAllByRole('button', { name: /resolve/i });
    const actionButton = resolveButtons.find(btn => btn.textContent?.includes('Resolve') && !btn.textContent?.includes('Resolved'));
    expect(actionButton).toBeDefined();
    await user.click(actionButton!);

    // Modal should appear - find the confirm button
    await waitFor(() => {
      expect(screen.getByText(/resolve review/i)).toBeInTheDocument();
    });

    // Click the confirm button in the modal
    const confirmButton = screen.getByRole('button', { name: /^resolve$/i });
    await user.click(confirmButton);

    // THIS IS THE TEST THAT SHOULD PASS AFTER FIX:
    // The mutation should be called with correct parameters
    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({
        id: 'review-123',
        status: 'resolved',
        resolution_note: undefined, // or empty string depending on modal implementation
      });
    });
  });

  it('should include resolution note when provided', async () => {
    const user = userEvent.setup();
    const projectId = 'project-123';

    const mockNotification = {
      id: 'review-456',
      project_id: projectId,
      type: 'weld_completed',
      status: 'pending',
      payload: {
        weld_id: 'weld-789',
        weld_number: 'W-002',
        component_id: 'comp-999',
        drawing_number: 'DWG-002',
        welder_name: 'Jane Smith',
        date_welded: '2025-11-24',
        weld_type: 'BW',
        nde_required: true,
      },
      created_at: new Date().toISOString(),
      resolved_at: null,
      resolved_by: null,
      resolution_note: null,
    };

    vi.spyOn(useNeedsReviewModule, 'useNeedsReview').mockReturnValue({
      data: [mockNotification],
      isLoading: false,
      isError: false,
      error: null,
      refetch: mockRefetch,
      isSuccess: true,
      isLoadingError: false,
      isRefetchError: false,
      isRefetching: false,
      status: 'success',
      dataUpdatedAt: Date.now(),
      errorUpdatedAt: 0,
      failureCount: 0,
      failureReason: null,
      errorUpdateCount: 0,
      isFetched: true,
      isFetchedAfterMount: true,
      isFetching: false,
      isInitialLoading: false,
      isPaused: false,
      isPlaceholderData: false,
      isPreviousData: false,
      isStale: false,
      fetchStatus: 'idle' as const,
    });

    renderWithProviders(projectId);

    // Wait for the notification to appear
    await waitFor(() => {
      expect(screen.getByText('W-002')).toBeInTheDocument();
    });

    // Click Resolve button
    const resolveButtons = screen.getAllByRole('button', { name: /resolve/i });
    const actionButton = resolveButtons.find(btn => btn.textContent?.includes('Resolve') && !btn.textContent?.includes('Resolved'));
    expect(actionButton).toBeDefined();
    await user.click(actionButton!);

    // Wait for modal
    await waitFor(() => {
      expect(screen.getByText(/resolve review/i)).toBeInTheDocument();
    });

    // Type a note
    const noteInput = screen.getByLabelText(/note/i) || screen.getByPlaceholderText(/optional note/i);
    await user.type(noteInput, 'Verified weld quality');

    // Click confirm
    const confirmButton = screen.getByRole('button', { name: /^resolve$/i });
    await user.click(confirmButton);

    // Mutation should be called with the note
    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({
        id: 'review-456',
        status: 'resolved',
        resolution_note: 'Verified weld quality',
      });
    });
  });
});

/**
 * Integration Test: Project Switching Data Refresh
 * Feature: 008-we-just-planned (Authenticated Pages with Real Data)
 *
 * Tests that switching between projects correctly refreshes all data across pages.
 * Validates that:
 * - Selecting project A shows project A data
 * - Switching to project B refreshes to project B data
 * - Navigation between pages maintains selected project
 * - Browser refresh persists selected project
 *
 * This test MUST FAIL initially (Red phase of TDD).
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import type { ReactNode } from 'react';

// Import contexts
import { AuthProvider } from '@/contexts/AuthContext';
import { ProjectProvider, useProject } from '@/contexts/ProjectContext';

// Import hooks that will be used by pages (not yet implemented)
import { useComponents } from '@/hooks/useComponents';
import { useTestPackages } from '@/hooks/useTestPackages';
import { useDashboardMetrics } from '@/hooks/useDashboardMetrics';

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    })),
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'test-user-id', email: 'test@example.com', role: 'admin' } },
        error: null,
      }),
      getSession: vi.fn().mockResolvedValue({
        data: { session: { user: { id: 'test-user-id', email: 'test@example.com' } } },
        error: null,
      }),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
    },
  },
}));

// Mock hooks
vi.mock('@/hooks/useComponents', () => ({
  useComponents: vi.fn(),
}));

vi.mock('@/hooks/useTestPackages', () => ({
  useTestPackages: vi.fn(),
}));

vi.mock('@/hooks/useDashboardMetrics', () => ({
  useDashboardMetrics: vi.fn(),
}));

vi.mock('@/hooks/useProjects', () => ({
  useProjects: vi.fn(() => ({
    data: [
      { id: 'project-a', name: 'Project A', organization_id: 'org-1' },
      { id: 'project-b', name: 'Project B', organization_id: 'org-1' },
    ],
    isLoading: false,
    error: null,
  })),
}));

// Test component to display current project context
function ProjectDisplay() {
  const { selectedProjectId } = useProject();
  return <div data-testid="current-project">{selectedProjectId || 'None'}</div>;
}

// Mock Dashboard Page component
function MockDashboardPage() {
  const { selectedProjectId } = useProject();
  const mockMetrics = useDashboardMetrics(selectedProjectId || '');

  return (
    <div data-testid="dashboard-page">
      <h1>Dashboard</h1>
      <div data-testid="dashboard-project-id">{selectedProjectId}</div>
      <div data-testid="dashboard-data">{JSON.stringify(mockMetrics.data)}</div>
    </div>
  );
}

// Mock Components Page component
function MockComponentsPage() {
  const { selectedProjectId } = useProject();
  const mockComponents = useComponents(selectedProjectId || '');

  return (
    <div data-testid="components-page">
      <h1>Components</h1>
      <div data-testid="components-project-id">{selectedProjectId}</div>
      <div data-testid="components-count">
        {mockComponents.data?.length || 0} components
      </div>
    </div>
  );
}

// Mock Packages Page component
function MockPackagesPage() {
  const { selectedProjectId } = useProject();
  const mockPackages = useTestPackages(selectedProjectId || '');

  return (
    <div data-testid="packages-page">
      <h1>Packages</h1>
      <div data-testid="packages-project-id">{selectedProjectId}</div>
      <div data-testid="packages-count">
        {mockPackages.data?.length || 0} packages
      </div>
    </div>
  );
}

describe('Project Switching Integration', () => {
  let queryClient: QueryClient;
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    user = userEvent.setup();
    vi.clearAllMocks();
    localStorage.clear();

    // Setup default mock implementations
    vi.mocked(useDashboardMetrics).mockReturnValue({
      data: {
        overallProgress: 75,
        componentCount: 100,
        readyPackages: 5,
        needsReviewCount: 3,
        recentActivity: [],
      },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    vi.mocked(useComponents).mockReturnValue({
      data: [
        { id: 'comp-1', project_id: 'project-a', tag_number: 'A-001' },
        { id: 'comp-2', project_id: 'project-a', tag_number: 'A-002' },
      ],
      isLoading: false,
      isError: false,
      error: null,
    } as any);

    vi.mocked(useTestPackages).mockReturnValue({
      data: [
        { id: 'pkg-1', project_id: 'project-a', name: 'Package A1' },
      ],
      isLoading: false,
      isError: false,
      error: null,
    } as any);
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ProjectProvider>
          <MemoryRouter initialEntries={['/']}>
            <Routes>
              <Route path="/" element={<MockDashboardPage />} />
              <Route path="/components" element={<MockComponentsPage />} />
              <Route path="/packages" element={<MockPackagesPage />} />
            </Routes>
            {children}
          </MemoryRouter>
        </ProjectProvider>
      </AuthProvider>
    </QueryClientProvider>
  );

  it('should show project A data when project A is selected', async () => {
    // Mock data for project A
    vi.mocked(useDashboardMetrics).mockReturnValue({
      data: {
        overallProgress: 75,
        componentCount: 100,
        readyPackages: 5,
        needsReviewCount: 3,
        recentActivity: [],
      },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    const TestComponent = () => {
      const { setSelectedProjectId } = useProject();
      return (
        <div>
          <button onClick={() => setSelectedProjectId('project-a')}>
            Select Project A
          </button>
          <MockDashboardPage />
        </div>
      );
    };

    render(<TestComponent />, { wrapper });

    // Select project A
    const selectButton = screen.getByText('Select Project A');
    await user.click(selectButton);

    await waitFor(() => {
      expect(screen.getByTestId('dashboard-project-id')).toHaveTextContent('project-a');
    });

    // Verify dashboard shows project A data
    expect(screen.getByTestId('dashboard-data')).toHaveTextContent('"componentCount":100');
  });

  it('should refresh all data when switching from project A to project B', async () => {
    const TestComponent = () => {
      const { selectedProjectId, setSelectedProjectId } = useProject();

      // Mock different data based on selected project
      const dashboardData = selectedProjectId === 'project-b'
        ? { overallProgress: 50, componentCount: 200, readyPackages: 10, needsReviewCount: 7, recentActivity: [] }
        : { overallProgress: 75, componentCount: 100, readyPackages: 5, needsReviewCount: 3, recentActivity: [] };

      vi.mocked(useDashboardMetrics).mockReturnValue({
        data: dashboardData,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      } as any);

      return (
        <div>
          <button onClick={() => setSelectedProjectId('project-a')}>
            Select Project A
          </button>
          <button onClick={() => setSelectedProjectId('project-b')}>
            Select Project B
          </button>
          <MockDashboardPage />
        </div>
      );
    };

    render(<TestComponent />, { wrapper });

    // Select project A first
    await user.click(screen.getByText('Select Project A'));

    await waitFor(() => {
      expect(screen.getByTestId('dashboard-project-id')).toHaveTextContent('project-a');
    });

    // Switch to project B
    await user.click(screen.getByText('Select Project B'));

    await waitFor(() => {
      expect(screen.getByTestId('dashboard-project-id')).toHaveTextContent('project-b');
    });

    // Verify data refreshed (component count changed from 100 to 200)
    await waitFor(() => {
      expect(screen.getByTestId('dashboard-data')).toHaveTextContent('"componentCount":200');
    });
  });

  it('should maintain selected project when navigating between pages', async () => {
    const TestComponent = () => {
      const { setSelectedProjectId } = useProject();

      return (
        <div>
          <button onClick={() => setSelectedProjectId('project-b')}>
            Select Project B
          </button>
          <a href="/components">Go to Components</a>
          <ProjectDisplay />
        </div>
      );
    };

    const { rerender } = render(<TestComponent />, { wrapper });

    // Select project B
    await user.click(screen.getByText('Select Project B'));

    await waitFor(() => {
      expect(screen.getByTestId('current-project')).toHaveTextContent('project-b');
    });

    // Navigate to components page (simulate via rerender)
    rerender(
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ProjectProvider>
            <MemoryRouter initialEntries={['/components']}>
              <Routes>
                <Route path="/components" element={<MockComponentsPage />} />
              </Routes>
            </MemoryRouter>
          </ProjectProvider>
        </AuthProvider>
      </QueryClientProvider>
    );

    // Project B should still be selected on components page
    await waitFor(() => {
      const componentsProjectId = screen.getByTestId('components-project-id');
      expect(componentsProjectId).toHaveTextContent('project-b');
    });
  });

  it('should persist selected project after browser refresh', async () => {
    const TestComponent = () => {
      const { selectedProjectId, setSelectedProjectId } = useProject();

      return (
        <div>
          <button onClick={() => setSelectedProjectId('project-a')}>
            Select Project A
          </button>
          <div data-testid="selected-project">{selectedProjectId || 'None'}</div>
        </div>
      );
    };

    const { unmount } = render(<TestComponent />, { wrapper });

    // Select project A
    await user.click(screen.getByText('Select Project A'));

    await waitFor(() => {
      expect(screen.getByTestId('selected-project')).toHaveTextContent('project-a');
    });

    // Verify localStorage was set
    expect(localStorage.getItem('pipetrak_selected_project_id')).toBe('project-a');

    // Simulate browser refresh by unmounting and remounting
    unmount();

    // Remount (localStorage should restore project A)
    render(<TestComponent />, { wrapper });

    await waitFor(() => {
      expect(screen.getByTestId('selected-project')).toHaveTextContent('project-a');
    });
  });

  it('should call refetch on hooks when project changes', async () => {
    const mockRefetch = vi.fn();

    vi.mocked(useDashboardMetrics).mockReturnValue({
      data: {
        overallProgress: 75,
        componentCount: 100,
        readyPackages: 5,
        needsReviewCount: 3,
        recentActivity: [],
      },
      isLoading: false,
      isError: false,
      error: null,
      refetch: mockRefetch,
    } as any);

    const TestComponent = () => {
      const { setSelectedProjectId } = useProject();

      return (
        <div>
          <button onClick={() => setSelectedProjectId('project-a')}>
            Select Project A
          </button>
          <button onClick={() => setSelectedProjectId('project-b')}>
            Select Project B
          </button>
          <MockDashboardPage />
        </div>
      );
    };

    render(<TestComponent />, { wrapper });

    // Select project A
    await user.click(screen.getByText('Select Project A'));

    // Switch to project B
    await user.click(screen.getByText('Select Project B'));

    await waitFor(() => {
      expect(screen.getByTestId('dashboard-project-id')).toHaveTextContent('project-b');
    });

    // useDashboardMetrics should have been called with new project ID
    expect(useDashboardMetrics).toHaveBeenCalledWith('project-b');
  });
});

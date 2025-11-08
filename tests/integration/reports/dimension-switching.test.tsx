/**
 * Integration test for dimension switching (Feature 019 - T061)
 * Tests User Story 4: Change report grouping dimension
 *
 * Verifies:
 * - All 3 dimensions (Area, System, Test Package) generate valid reports
 * - Grand Total Budget remains consistent across all groupings
 * - Column header updates dynamically based on selected dimension
 * - Milestone percentages recalculate correctly for each dimension
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { ReportBuilderPage } from '@/pages/ReportBuilderPage';
import type { GroupingDimension } from '@/types/reports';

// Mock Supabase client
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: null,
        error: null,
      }),
    })),
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null,
      }),
    },
  },
}));

// Mock AuthContext
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-1', email: 'test@example.com' },
    session: { access_token: 'mock-token' },
  }),
}));

// Mock ProjectContext
vi.mock('@/contexts/ProjectContext', () => ({
  useProject: () => ({
    selectedProjectId: 'project-1',
    setSelectedProjectId: vi.fn(),
  }),
}));

// Mock useProjects hook
vi.mock('@/hooks/useProjects', () => ({
  useProjects: () => ({
    data: [
      {
        id: 'project-1',
        name: 'Test Project',
        organization_id: 'org-1',
      },
    ],
    isLoading: false,
    error: null,
  }),
}));

// Create mock data generators for each dimension
const mockDataByDimension = {
  area: {
    dimension: 'area' as GroupingDimension,
    projectId: 'project-1',
    generatedAt: new Date('2025-10-28T10:00:00Z'),
    rows: [
      {
        id: 'area-1',
        name: 'B-64 OSBL',
        projectId: 'project-1',
        budget: 150,
        pctReceived: 80,
        pctInstalled: 60,
        pctPunch: 30,
        pctTested: 20,
        pctRestored: 10,
        pctTotal: 40,
      },
      {
        id: 'area-2',
        name: 'A-12 Process',
        projectId: 'project-1',
        budget: 200,
        pctReceived: 90,
        pctInstalled: 70,
        pctPunch: 50,
        pctTested: 40,
        pctRestored: 25,
        pctTotal: 55,
      },
    ],
    grandTotal: {
      name: 'Grand Total' as const,
      budget: 350, // Sum of 150 + 200
      pctReceived: 86, // Weighted average: (80*150 + 90*200) / 350 = 86
      pctInstalled: 66, // Weighted average: (60*150 + 70*200) / 350 = 65.7 ≈ 66
      pctPunch: 41, // Weighted average: (30*150 + 50*200) / 350 = 41.4 ≈ 41
      pctTested: 31, // Weighted average: (20*150 + 40*200) / 350 = 31.4 ≈ 31
      pctRestored: 19, // Weighted average: (10*150 + 25*200) / 350 = 18.6 ≈ 19
      pctTotal: 49, // Weighted average: (40*150 + 55*200) / 350 = 48.6 ≈ 49
    },
  },
  system: {
    dimension: 'system' as GroupingDimension,
    projectId: 'project-1',
    generatedAt: new Date('2025-10-28T10:00:00Z'),
    rows: [
      {
        id: 'system-1',
        name: 'HVAC-01',
        projectId: 'project-1',
        budget: 100,
        pctReceived: 85,
        pctInstalled: 65,
        pctPunch: 35,
        pctTested: 25,
        pctRestored: 15,
        pctTotal: 45,
      },
      {
        id: 'system-2',
        name: 'ELEC-02',
        projectId: 'project-1',
        budget: 250,
        pctReceived: 88,
        pctInstalled: 68,
        pctPunch: 44,
        pctTested: 34,
        pctRestored: 20,
        pctTotal: 51,
      },
    ],
    grandTotal: {
      name: 'Grand Total' as const,
      budget: 350, // SAME total budget across all dimensions
      pctReceived: 87, // Weighted average: (85*100 + 88*250) / 350 = 87.1 ≈ 87
      pctInstalled: 67, // Weighted average: (65*100 + 68*250) / 350 = 67.1 ≈ 67
      pctPunch: 42, // Weighted average: (35*100 + 44*250) / 350 = 41.4 ≈ 42
      pctTested: 32, // Weighted average: (25*100 + 34*250) / 350 = 31.4 ≈ 32
      pctRestored: 19, // Weighted average: (15*100 + 20*250) / 350 = 18.6 ≈ 19
      pctTotal: 50, // Weighted average: (45*100 + 51*250) / 350 = 49.6 ≈ 50
    },
  },
  test_package: {
    dimension: 'test_package' as GroupingDimension,
    projectId: 'project-1',
    generatedAt: new Date('2025-10-28T10:00:00Z'),
    rows: [
      {
        id: 'pkg-1',
        name: 'PKG-A',
        projectId: 'project-1',
        budget: 175,
        pctReceived: 82,
        pctInstalled: 62,
        pctPunch: 32,
        pctTested: 22,
        pctRestored: 12,
        pctTotal: 42,
      },
      {
        id: 'pkg-2',
        name: 'PKG-B',
        projectId: 'project-1',
        budget: 175,
        pctReceived: 92,
        pctInstalled: 72,
        pctPunch: 52,
        pctTested: 42,
        pctRestored: 27,
        pctTotal: 57,
      },
    ],
    grandTotal: {
      name: 'Grand Total' as const,
      budget: 350, // SAME total budget across all dimensions
      pctReceived: 87, // Weighted average: (82*175 + 92*175) / 350 = 87
      pctInstalled: 67, // Weighted average: (62*175 + 72*175) / 350 = 67
      pctPunch: 42, // Weighted average: (32*175 + 52*175) / 350 = 42
      pctTested: 32, // Weighted average: (22*175 + 42*175) / 350 = 32
      pctRestored: 20, // Weighted average: (12*175 + 27*175) / 350 = 19.5 ≈ 20
      pctTotal: 50, // Weighted average: (42*175 + 57*175) / 350 = 49.5 ≈ 50
    },
  },
};

// Mock useProgressReport hook with dynamic dimension support
const mockRefetch = vi.fn().mockResolvedValue({ data: null });
const mockUseProgressReport = vi.fn((projectId: string, dimension: GroupingDimension) => ({
  data: mockDataByDimension[dimension],
  isLoading: false,
  error: null,
  refetch: mockRefetch,
}));

vi.mock('@/hooks/useProgressReport', () => ({
  useProgressReport: (projectId: string, dimension: GroupingDimension) =>
    mockUseProgressReport(projectId, dimension),
}));

describe('Dimension Switching (Integration)', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    vi.clearAllMocks();
  });

  const renderReportBuilder = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <ReportBuilderPage />
        </BrowserRouter>
      </QueryClientProvider>
    );
  };

  it('generates valid Area report with correct dimension label', async () => {
    const user = userEvent.setup();
    renderReportBuilder();

    // Verify Area dimension selector is available (should be default selected)
    const areaRadio = screen.getByLabelText('Area');
    expect(areaRadio).toBeInTheDocument();
    expect(areaRadio).toHaveAttribute('aria-checked', 'true');

    // Generate report
    const generateButton = screen.getByRole('button', { name: /generate report/i });
    await user.click(generateButton);

    // Verify column header shows "Area"
    await waitFor(() => {
      const headers = screen.getAllByText('Area');
      expect(headers.length).toBeGreaterThan(0); // At least one "Area" header
    });

    // Verify area names are displayed
    expect(screen.getByText('B-64 OSBL')).toBeInTheDocument();
    expect(screen.getByText('A-12 Process')).toBeInTheDocument();

    // Verify Grand Total Budget
    expect(screen.getByText('Grand Total')).toBeInTheDocument();
    expect(screen.getByText('350')).toBeInTheDocument();
  });

  it('switches to System dimension and displays correct data', async () => {
    const user = userEvent.setup();
    renderReportBuilder();

    // Switch to System dimension
    const systemRadio = screen.getByLabelText('System');
    await user.click(systemRadio);

    // Generate report
    const generateButton = screen.getByRole('button', { name: /generate report/i });
    await user.click(generateButton);

    // Verify column header shows "System"
    await waitFor(() => {
      const headers = screen.getAllByText('System');
      expect(headers.length).toBeGreaterThan(0);
    });

    // Verify system names are displayed (NOT area names)
    expect(screen.getByText('HVAC-01')).toBeInTheDocument();
    expect(screen.getByText('ELEC-02')).toBeInTheDocument();
    expect(screen.queryByText('B-64 OSBL')).not.toBeInTheDocument();

    // Verify Grand Total Budget is CONSISTENT (350)
    expect(screen.getByText('Grand Total')).toBeInTheDocument();
    expect(screen.getByText('350')).toBeInTheDocument();
  });

  it('switches to Test Package dimension and displays correct data', async () => {
    const user = userEvent.setup();
    renderReportBuilder();

    // Switch to Test Package dimension
    const testPackageRadio = screen.getByLabelText('Test Package');
    await user.click(testPackageRadio);

    // Generate report
    const generateButton = screen.getByRole('button', { name: /generate report/i });
    await user.click(generateButton);

    // Verify column header shows "Test Package"
    await waitFor(() => {
      const headers = screen.getAllByText('Test Package');
      expect(headers.length).toBeGreaterThan(0);
    });

    // Verify test package names are displayed (NOT area or system names)
    expect(screen.getByText('PKG-A')).toBeInTheDocument();
    expect(screen.getByText('PKG-B')).toBeInTheDocument();
    expect(screen.queryByText('B-64 OSBL')).not.toBeInTheDocument();
    expect(screen.queryByText('HVAC-01')).not.toBeInTheDocument();

    // Verify Grand Total Budget is CONSISTENT (350)
    expect(screen.getByText('Grand Total')).toBeInTheDocument();
    expect(screen.getByText('350')).toBeInTheDocument();
  });

  it('maintains consistent Grand Total Budget across all 3 dimensions', async () => {
    const user = userEvent.setup();
    renderReportBuilder();

    const generateButton = screen.getByRole('button', { name: /generate report/i });

    // Test Area dimension
    const areaRadio = screen.getByLabelText('Area');
    await user.click(areaRadio);
    await user.click(generateButton);
    await waitFor(() => expect(screen.getByText('350')).toBeInTheDocument());
    const areaBudget = screen.getByText('350');
    expect(areaBudget).toBeInTheDocument();

    // Test System dimension
    const systemRadio = screen.getByLabelText('System');
    await user.click(systemRadio);
    await user.click(generateButton);
    await waitFor(() => expect(screen.getByText('HVAC-01')).toBeInTheDocument());
    const systemBudget = screen.getByText('350');
    expect(systemBudget).toBeInTheDocument();

    // Test Test Package dimension
    const testPackageRadio = screen.getByLabelText('Test Package');
    await user.click(testPackageRadio);
    await user.click(generateButton);
    await waitFor(() => expect(screen.getByText('PKG-A')).toBeInTheDocument());
    const packageBudget = screen.getByText('350');
    expect(packageBudget).toBeInTheDocument();

    // All three dimensions should have the same Grand Total Budget
    expect(areaBudget.textContent).toBe(systemBudget.textContent);
    expect(systemBudget.textContent).toBe(packageBudget.textContent);
  });

  it('recalculates milestone percentages when switching dimensions', async () => {
    const user = userEvent.setup();
    renderReportBuilder();

    const generateButton = screen.getByRole('button', { name: /generate report/i });

    // Generate Area report
    const areaRadio = screen.getByLabelText('Area');
    await user.click(areaRadio);
    await user.click(generateButton);

    await waitFor(() => {
      expect(screen.getByText('B-64 OSBL')).toBeInTheDocument();
    });

    // Verify Area-specific percentages
    const areaReceivedPct = screen.getByText('86%'); // Grand Total pctReceived for Area
    expect(areaReceivedPct).toBeInTheDocument();

    // Switch to System dimension
    const systemRadio = screen.getByLabelText('System');
    await user.click(systemRadio);
    await user.click(generateButton);

    await waitFor(() => {
      expect(screen.getByText('HVAC-01')).toBeInTheDocument();
    });

    // Verify System-specific percentages (different from Area)
    const systemReceivedPct = screen.getByText('87%'); // Grand Total pctReceived for System
    expect(systemReceivedPct).toBeInTheDocument();

    // Switch to Test Package dimension
    const testPackageRadio = screen.getByLabelText('Test Package');
    await user.click(testPackageRadio);
    await user.click(generateButton);

    await waitFor(() => {
      expect(screen.getByText('PKG-A')).toBeInTheDocument();
    });

    // Verify Test Package-specific percentages
    const packageReceivedPct = screen.getByText('87%'); // Grand Total pctReceived for Test Package
    expect(packageReceivedPct).toBeInTheDocument();
  });

  it('calls useProgressReport hook with correct dimension parameter', async () => {
    const user = userEvent.setup();
    renderReportBuilder();

    const generateButton = screen.getByRole('button', { name: /generate report/i });

    // Test Area dimension
    const areaRadio = screen.getByLabelText('Area');
    await user.click(areaRadio);
    await user.click(generateButton);

    await waitFor(() => {
      expect(mockUseProgressReport).toHaveBeenCalledWith('project-1', 'area');
    });

    // Test System dimension
    const systemRadio = screen.getByLabelText('System');
    await user.click(systemRadio);
    await user.click(generateButton);

    await waitFor(() => {
      expect(mockUseProgressReport).toHaveBeenCalledWith('project-1', 'system');
    });

    // Test Test Package dimension
    const testPackageRadio = screen.getByLabelText('Test Package');
    await user.click(testPackageRadio);
    await user.click(generateButton);

    await waitFor(() => {
      expect(mockUseProgressReport).toHaveBeenCalledWith('project-1', 'test_package');
    });
  });

  it('updates column header dynamically when dimension changes', async () => {
    const user = userEvent.setup();
    renderReportBuilder();

    const generateButton = screen.getByRole('button', { name: /generate report/i });

    // Generate Area report
    await user.click(screen.getByLabelText('Area'));
    await user.click(generateButton);
    await waitFor(() => {
      const areaHeaders = screen.getAllByText('Area');
      expect(areaHeaders.length).toBeGreaterThan(0);
    });

    // Switch to System and verify header changes
    await user.click(screen.getByLabelText('System'));
    await user.click(generateButton);
    await waitFor(() => {
      const systemHeaders = screen.getAllByText('System');
      expect(systemHeaders.length).toBeGreaterThan(0);
    });

    // Switch to Test Package and verify header changes
    await user.click(screen.getByLabelText('Test Package'));
    await user.click(generateButton);
    await waitFor(() => {
      const testPackageHeaders = screen.getAllByText('Test Package');
      expect(testPackageHeaders.length).toBeGreaterThan(0);
    });
  });

  it('displays all 7 milestone columns for each dimension', async () => {
    const user = userEvent.setup();
    renderReportBuilder();

    const generateButton = screen.getByRole('button', { name: /generate report/i });

    const dimensions: GroupingDimension[] = ['area', 'system', 'test_package'];

    for (const dimension of dimensions) {
      const radio = screen.getByLabelText(
        dimension === 'area' ? 'Area' : dimension === 'system' ? 'System' : 'Test Package'
      );
      await user.click(radio);
      await user.click(generateButton);

      await waitFor(() => {
        // Verify all 7 column headers exist
        expect(screen.getByText('Budget')).toBeInTheDocument();
        expect(screen.getByText('Received')).toBeInTheDocument();
        expect(screen.getByText('Installed')).toBeInTheDocument();
        expect(screen.getByText('Punch')).toBeInTheDocument();
        expect(screen.getByText('Tested')).toBeInTheDocument();
        expect(screen.getByText('Restored')).toBeInTheDocument();
      });
    }
  });
});

/**
 * Integration tests for Reports navigation (Feature 019 - T042)
 * Tests navigation from sidebar to Reports landing page
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Sidebar } from '@/components/Sidebar';
import App from '@/App';
import * as SidebarStore from '@/stores/useSidebarStore';

// Mock auth context
vi.mock('@/contexts/AuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useAuth: () => ({
    session: {
      user: { id: 'test-user-id', email: 'test@example.com' },
    },
    loading: false,
  }),
}));

// Mock project context
vi.mock('@/contexts/ProjectContext', () => ({
  ProjectProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useProject: () => ({
    selectedProjectId: 'test-project-id',
    selectedProject: { id: 'test-project-id', name: 'Test Project' },
  }),
}));

// Mock supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: {
          session: {
            user: { id: 'test-user-id', email: 'test@example.com' },
          },
        },
        error: null,
      }),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
    },
  },
}));

// Mock PermissionGate (allow all)
vi.mock('@/components/PermissionGate', () => ({
  PermissionGate: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe('Reports Navigation', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    // Mock sidebar store
    vi.spyOn(SidebarStore, 'useSidebarStore').mockReturnValue({
      isCollapsed: false,
      isMobileOpen: false,
      toggle: vi.fn(),
      setMobileOpen: vi.fn(),
    });
  });

  it('should render Reports link in sidebar', () => {
    render(
      <BrowserRouter>
        <Sidebar />
      </BrowserRouter>
    );

    expect(screen.getByText('Reports')).toBeInTheDocument();
  });

  it('should link to /reports route', () => {
    render(
      <BrowserRouter>
        <Sidebar />
      </BrowserRouter>
    );

    const reportsLink = screen.getByText('Reports').closest('a');
    expect(reportsLink).toHaveAttribute('href', '/reports');
  });

  it('should highlight Reports link when on /reports page', () => {
    render(
      <MemoryRouter initialEntries={['/reports']}>
        <Sidebar />
      </MemoryRouter>
    );

    const reportsLink = screen.getByText('Reports').closest('a');
    expect(reportsLink).toHaveClass('bg-blue-50', 'text-blue-700');
  });

  it('should highlight Reports link when on /reports/* nested routes', () => {
    render(
      <MemoryRouter initialEntries={['/reports/new']}>
        <Sidebar />
      </MemoryRouter>
    );

    const reportsLink = screen.getByText('Reports').closest('a');
    expect(reportsLink).toHaveClass('bg-blue-50', 'text-blue-700');
  });

  it('should be accessible in mobile menu', () => {
    // Mock mobile open state
    vi.spyOn(SidebarStore, 'useSidebarStore').mockReturnValue({
      isCollapsed: false,
      isMobileOpen: true,
      toggle: vi.fn(),
      setMobileOpen: vi.fn(),
    });

    render(
      <BrowserRouter>
        <Sidebar />
      </BrowserRouter>
    );

    const reportsLink = screen.getByText('Reports');
    expect(reportsLink).toBeVisible();
  });

  it('should close mobile sidebar when Reports link is clicked', async () => {
    const mockSetMobileOpen = vi.fn();
    const user = userEvent.setup();

    vi.spyOn(SidebarStore, 'useSidebarStore').mockReturnValue({
      isCollapsed: false,
      isMobileOpen: true,
      toggle: vi.fn(),
      setMobileOpen: mockSetMobileOpen,
    });

    render(
      <BrowserRouter>
        <Sidebar />
      </BrowserRouter>
    );

    const reportsLink = screen.getByText('Reports');
    await user.click(reportsLink);

    expect(mockSetMobileOpen).toHaveBeenCalledWith(false);
  });

  it('should position Reports link between Weld Log and Imports', () => {
    render(
      <BrowserRouter>
        <Sidebar />
      </BrowserRouter>
    );

    const navItems = screen.getAllByRole('link');
    const navLabels = navItems.map((item) => item.textContent);

    const weldLogIndex = navLabels.findIndex((label) => label === 'Weld Log');
    const reportsIndex = navLabels.findIndex((label) => label === 'Reports');
    const importsIndex = navLabels.findIndex((label) => label === 'Imports');

    expect(reportsIndex).toBeGreaterThan(weldLogIndex);
    expect(reportsIndex).toBeLessThan(importsIndex);
  });
});

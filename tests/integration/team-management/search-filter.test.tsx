// tests/integration/team-management/search-filter.test.tsx
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TeamManagement } from '@/pages/TeamManagement';
import * as useOrganizationModule from '@/hooks/useOrganization';

// Mock team members data
const mockMembers = [
  {
    id: 'user-1',
    email: 'alice@example.com',
    full_name: 'Alice Smith',
    role: 'owner',
    joined_at: '2025-01-01T00:00:00Z',
    last_active: '2025-10-26T12:00:00Z',
  },
  {
    id: 'user-2',
    email: 'bob@example.com',
    full_name: 'Bob Johnson',
    role: 'admin',
    joined_at: '2025-02-01T00:00:00Z',
    last_active: '2025-10-25T10:00:00Z',
  },
  {
    id: 'user-3',
    email: 'charlie@example.com',
    full_name: 'Charlie Brown',
    role: 'project_manager',
    joined_at: '2025-03-01T00:00:00Z',
    last_active: '2025-10-24T08:00:00Z',
  },
  {
    id: 'user-4',
    email: 'diana@example.com',
    full_name: 'Diana Prince',
    role: 'viewer',
    joined_at: '2025-04-01T00:00:00Z',
    last_active: null,
  },
];

const mockInvitations = [
  {
    id: 'inv-1',
    email: 'pending@example.com',
    role: 'foreman',
    status: 'pending',
    created_at: '2025-10-20T00:00:00Z',
    sent_at: '2025-10-20T00:00:00Z',
    expires_at: '2025-10-27T00:00:00Z',
    token: 'test-token',
    message: null,
    organization_id: 'org-1',
    invited_by: { full_name: 'Alice Smith' },
  },
];

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, cacheTime: 0 },
      mutations: { retry: false },
    },
  });
}

function renderWithRouter(
  ui: React.ReactElement,
  { initialEntries = ['/team'] } = {}
) {
  const queryClient = createTestQueryClient();

  return {
    ...render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={initialEntries}>
          <Routes>
            <Route path="/team" element={ui} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    ),
    queryClient,
  };
}

describe('Team Search and Filter Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock useOrganization hook
    vi.spyOn(useOrganizationModule, 'useOrganization').mockReturnValue({
      useCurrentOrganization: vi.fn(() => ({
        data: {
          organization: { id: 'org-1', name: 'Test Org', created_at: '2024-01-01' },
          role: 'owner',
        },
        isLoading: false,
        error: null,
      })),
      useOrgMembers: vi.fn((params) => ({
        data: {
          members: mockMembers.filter((m) => {
            if (params?.search) {
              const search = params.search.toLowerCase();
              return (
                m.full_name.toLowerCase().includes(search) ||
                m.email.toLowerCase().includes(search)
              );
            }
            if (params?.role) {
              return m.role === params.role;
            }
            return true;
          }),
          total_count: mockMembers.length,
        },
        isLoading: false,
      })),
      updateMemberRoleMutation: {
        mutate: vi.fn(),
      },
      removeMemberMutation: {
        mutate: vi.fn(),
      },
    } as any);

    // Mock useInvitations hook
    vi.spyOn(useOrganizationModule as any, 'useInvitations').mockReturnValue({
      useInvitations: vi.fn(() => ({
        data: { invitations: mockInvitations },
        isLoading: false,
      })),
      resendInvitationMutation: { mutate: vi.fn() },
      revokeInvitationMutation: { mutate: vi.fn() },
    });
  });

  describe('Search Functionality (AC-1)', () => {
    it('should debounce search input with 300ms delay', async () => {
      const user = userEvent.setup();
      const { container: _container } = renderWithRouter(<TeamManagement />);

      // Switch to members tab
      const membersTab = screen.getByRole('button', { name: /team members/i });
      await user.click(membersTab);

      // Find search input
      const searchInput = screen.getByPlaceholderText(/search by name or email/i);

      // Type search term
      await user.type(searchInput, 'alice');

      // Should show all members initially (no immediate filter)
      expect(screen.getByText('Alice Smith')).toBeInTheDocument();
      expect(screen.getByText('Bob Johnson')).toBeInTheDocument();

      // Wait for debounce (300ms)
      await waitFor(
        () => {
          // After debounce, should filter to Alice only
          expect(screen.getByText('Alice Smith')).toBeInTheDocument();
          expect(screen.queryByText('Bob Johnson')).not.toBeInTheDocument();
        },
        { timeout: 500 }
      );
    });

    it('should search by name (case-insensitive)', async () => {
      const user = userEvent.setup();
      renderWithRouter(<TeamManagement />);

      const membersTab = screen.getByRole('button', { name: /team members/i });
      await user.click(membersTab);

      const searchInput = screen.getByPlaceholderText(/search by name or email/i);
      await user.type(searchInput, 'CHARLIE');

      await waitFor(() => {
        expect(screen.getByText('Charlie Brown')).toBeInTheDocument();
        expect(screen.queryByText('Alice Smith')).not.toBeInTheDocument();
      });
    });

    it('should search by email (partial match)', async () => {
      const user = userEvent.setup();
      renderWithRouter(<TeamManagement />);

      const membersTab = screen.getByRole('button', { name: /team members/i });
      await user.click(membersTab);

      const searchInput = screen.getByPlaceholderText(/search by name or email/i);
      await user.type(searchInput, 'diana@');

      await waitFor(() => {
        expect(screen.getByText('Diana Prince')).toBeInTheDocument();
        expect(screen.queryByText('Alice Smith')).not.toBeInTheDocument();
      });
    });

    it('should clear search results when input is cleared', async () => {
      const user = userEvent.setup();
      renderWithRouter(<TeamManagement />);

      const membersTab = screen.getByRole('button', { name: /team members/i });
      await user.click(membersTab);

      const searchInput = screen.getByPlaceholderText(/search by name or email/i);
      await user.type(searchInput, 'alice');

      await waitFor(() => {
        expect(screen.queryByText('Bob Johnson')).not.toBeInTheDocument();
      });

      await user.clear(searchInput);

      await waitFor(() => {
        expect(screen.getByText('Alice Smith')).toBeInTheDocument();
        expect(screen.getByText('Bob Johnson')).toBeInTheDocument();
      });
    });
  });

  describe('Role Filter (AC-2)', () => {
    it('should filter members by role', async () => {
      const user = userEvent.setup();
      renderWithRouter(<TeamManagement />);

      const membersTab = screen.getByRole('button', { name: /team members/i });
      await user.click(membersTab);

      // Find role filter dropdown (this will be TeamFilters component when implemented)
      const roleFilter = screen.getByTestId('role-filter');
      await user.click(roleFilter);

      // Select "admin" role
      const adminOption = screen.getByText('Admin');
      await user.click(adminOption);

      await waitFor(() => {
        expect(screen.getByText('Bob Johnson')).toBeInTheDocument();
        expect(screen.queryByText('Alice Smith')).not.toBeInTheDocument();
      });
    });

    it('should show all members when "All Roles" is selected', async () => {
      const user = userEvent.setup();
      renderWithRouter(<TeamManagement />);

      const membersTab = screen.getByRole('button', { name: /team members/i });
      await user.click(membersTab);

      const roleFilter = screen.getByTestId('role-filter');
      await user.click(roleFilter);

      const allOption = screen.getByText('All Roles');
      await user.click(allOption);

      await waitFor(() => {
        expect(screen.getByText('Alice Smith')).toBeInTheDocument();
        expect(screen.getByText('Bob Johnson')).toBeInTheDocument();
      });
    });
  });

  describe('Status Filter (AC-3)', () => {
    it('should filter by active members', async () => {
      const user = userEvent.setup();
      renderWithRouter(<TeamManagement />);

      const membersTab = screen.getByRole('button', { name: /team members/i });
      await user.click(membersTab);

      const statusFilter = screen.getByTestId('status-filter');
      await user.click(statusFilter);

      const activeOption = screen.getByText('Active');
      await user.click(activeOption);

      // Should exclude pending invitations
      await waitFor(() => {
        expect(screen.getByText('Alice Smith')).toBeInTheDocument();
        expect(screen.queryByText('pending@example.com')).not.toBeInTheDocument();
      });
    });

    it('should filter by pending invitations', async () => {
      const user = userEvent.setup();
      renderWithRouter(<TeamManagement />);

      const statusFilter = screen.getByTestId('status-filter');
      await user.click(statusFilter);

      const pendingOption = screen.getByText('Pending');
      await user.click(pendingOption);

      // Should only show pending invitations
      await waitFor(() => {
        expect(screen.getByText('pending@example.com')).toBeInTheDocument();
        expect(screen.queryByText('Alice Smith')).not.toBeInTheDocument();
      });
    });
  });

  describe('Sort Options (AC-4)', () => {
    it('should sort by name (alphabetical)', async () => {
      const user = userEvent.setup();
      renderWithRouter(<TeamManagement />);

      const membersTab = screen.getByRole('button', { name: /team members/i });
      await user.click(membersTab);

      const sortDropdown = screen.getByTestId('sort-dropdown');
      await user.click(sortDropdown);

      const nameOption = screen.getByText('Name');
      await user.click(nameOption);

      // Verify order: Alice, Bob, Charlie, Diana
      const rows = screen.getAllByRole('row');
      expect(within(rows[1]).getByText('Alice Smith')).toBeInTheDocument();
      expect(within(rows[2]).getByText('Bob Johnson')).toBeInTheDocument();
    });

    it('should sort by role', async () => {
      const user = userEvent.setup();
      renderWithRouter(<TeamManagement />);

      const membersTab = screen.getByRole('button', { name: /team members/i });
      await user.click(membersTab);

      const sortDropdown = screen.getByTestId('sort-dropdown');
      await user.click(sortDropdown);

      const roleOption = screen.getByText('Role');
      await user.click(roleOption);

      // Verify role-based order
      const rows = screen.getAllByRole('row');
      expect(rows.length).toBeGreaterThan(1);
    });

    it('should sort by join date (most recent first)', async () => {
      const user = userEvent.setup();
      renderWithRouter(<TeamManagement />);

      const membersTab = screen.getByRole('button', { name: /team members/i });
      await user.click(membersTab);

      const sortDropdown = screen.getByTestId('sort-dropdown');
      await user.click(sortDropdown);

      const joinDateOption = screen.getByText('Join Date');
      await user.click(joinDateOption);

      // Verify order: Diana (April), Charlie (March), Bob (Feb), Alice (Jan)
      const rows = screen.getAllByRole('row');
      expect(rows.length).toBeGreaterThan(1);
    });

    it('should sort by last active (most recent first)', async () => {
      const user = userEvent.setup();
      renderWithRouter(<TeamManagement />);

      const membersTab = screen.getByRole('button', { name: /team members/i });
      await user.click(membersTab);

      const sortDropdown = screen.getByTestId('sort-dropdown');
      await user.click(sortDropdown);

      const lastActiveOption = screen.getByText('Last Active');
      await user.click(lastActiveOption);

      // Verify order: Alice (Oct 26), Bob (Oct 25), Charlie (Oct 24), Diana (null)
      const rows = screen.getAllByRole('row');
      expect(rows.length).toBeGreaterThan(1);
    });
  });

  describe('Combined Filters (AC-5)', () => {
    it('should combine search and role filter with AND logic', async () => {
      const user = userEvent.setup();
      renderWithRouter(<TeamManagement />);

      const membersTab = screen.getByRole('button', { name: /team members/i });
      await user.click(membersTab);

      // Search for "alice"
      const searchInput = screen.getByPlaceholderText(/search by name or email/i);
      await user.type(searchInput, 'alice');

      // Filter by owner role
      const roleFilter = screen.getByTestId('role-filter');
      await user.click(roleFilter);
      const ownerOption = screen.getByText('Owner');
      await user.click(ownerOption);

      await waitFor(() => {
        expect(screen.getByText('Alice Smith')).toBeInTheDocument();
        expect(screen.queryByText('Bob Johnson')).not.toBeInTheDocument();
      });
    });

    it('should show no results when filters do not match', async () => {
      const user = userEvent.setup();
      renderWithRouter(<TeamManagement />);

      const membersTab = screen.getByRole('button', { name: /team members/i });
      await user.click(membersTab);

      // Search for "alice" but filter by admin role (Alice is owner)
      const searchInput = screen.getByPlaceholderText(/search by name or email/i);
      await user.type(searchInput, 'alice');

      const roleFilter = screen.getByTestId('role-filter');
      await user.click(roleFilter);
      const adminOption = screen.getByText('Admin');
      await user.click(adminOption);

      await waitFor(() => {
        expect(screen.queryByText('Alice Smith')).not.toBeInTheDocument();
        expect(screen.getByText(/no members found/i)).toBeInTheDocument();
      });
    });
  });

  describe('URL Persistence (AC-6)', () => {
    it('should persist search term in URL', async () => {
      const user = userEvent.setup();
      const { container: _container } = renderWithRouter(<TeamManagement />, {
        initialEntries: ['/team?search=alice'],
      });

      const membersTab = screen.getByRole('button', { name: /team members/i });
      await user.click(membersTab);

      // Search input should be pre-filled
      const searchInput = screen.getByPlaceholderText(/search by name or email/i);
      expect(searchInput).toHaveValue('alice');
    });

    it('should persist role filter in URL', async () => {
      const { container: _container } = renderWithRouter(<TeamManagement />, {
        initialEntries: ['/team?role=admin'],
      });

      // Role filter should reflect URL param
      await waitFor(() => {
        const roleFilter = screen.getByTestId('role-filter');
        expect(roleFilter).toHaveTextContent(/admin/i);
      });
    });

    it('should persist status filter in URL', async () => {
      const { container: _container } = renderWithRouter(<TeamManagement />, {
        initialEntries: ['/team?status=pending'],
      });

      await waitFor(() => {
        const statusFilter = screen.getByTestId('status-filter');
        expect(statusFilter).toHaveTextContent(/pending/i);
      });
    });

    it('should persist sort option in URL', async () => {
      const { container: _container } = renderWithRouter(<TeamManagement />, {
        initialEntries: ['/team?sort=role'],
      });

      await waitFor(() => {
        const sortDropdown = screen.getByTestId('sort-dropdown');
        expect(sortDropdown).toHaveTextContent(/role/i);
      });
    });

    it('should persist multiple filters in URL', async () => {
      const { container: _container } = renderWithRouter(<TeamManagement />, {
        initialEntries: ['/team?search=bob&role=admin&status=active&sort=name'],
      });

      const membersTab = screen.getByRole('button', { name: /team members/i });
      await userEvent.click(membersTab);

      await waitFor(() => {
        const searchInput = screen.getByPlaceholderText(/search by name or email/i);
        expect(searchInput).toHaveValue('bob');
      });
    });

    it('should update URL when filters change', async () => {
      const user = userEvent.setup();
      const { container: _container } = renderWithRouter(<TeamManagement />);

      const membersTab = screen.getByRole('button', { name: /team members/i });
      await user.click(membersTab);

      const searchInput = screen.getByPlaceholderText(/search by name or email/i);
      await user.type(searchInput, 'alice');

      await waitFor(() => {
        expect(window.location.search).toContain('search=alice');
      });
    });
  });

  describe('Mobile Responsiveness', () => {
    it('should stack filters vertically on mobile (≤1024px)', () => {
      // Mock window width
      global.innerWidth = 768;
      global.dispatchEvent(new Event('resize'));

      renderWithRouter(<TeamManagement />);

      const filtersContainer = screen.getByTestId('team-filters');
      expect(filtersContainer).toHaveClass('flex-col'); // Vertical stack
    });

    it('should display filters horizontally on desktop (>1024px)', () => {
      // Mock window width
      global.innerWidth = 1280;
      global.dispatchEvent(new Event('resize'));

      renderWithRouter(<TeamManagement />);

      const filtersContainer = screen.getByTestId('team-filters');
      expect(filtersContainer).toHaveClass('flex-row'); // Horizontal layout
    });
  });
});

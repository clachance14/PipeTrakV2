// T047: Integration test for member removal
// Tests User Story 5: Remove Team Members
// Covers acceptance scenarios: confirmation dialog, removal success, last owner protection, RLS enforcement

import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import type { TeamMember } from '@/types/team.types';

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      getUser: vi.fn(),
    },
  },
}));

// Mock component - will be replaced with actual MemberRow component
const MockMemberRow = ({
  member,
  onRemove,
}: {
  member: TeamMember;
  onRemove: (userId: string) => void;
}) => {
  return (
    <div data-testid={`member-row-${member.user_id}`}>
      <span>{member.name}</span>
      <span>{member.email}</span>
      <button onClick={() => onRemove(member.user_id)}>Remove Member</button>
    </div>
  );
};

describe('User Story 5: Remove Team Members', () => {
  let queryClient: QueryClient;
  const mockOrganizationId = 'org-123';

  const mockMembers: TeamMember[] = [
    {
      user_id: 'user-1',
      organization_id: mockOrganizationId,
      name: 'John Doe',
      email: 'john@example.com',
      role: 'admin',
      joined_at: '2025-01-01T00:00:00Z',
      last_active: '2025-10-25T00:00:00Z',
    },
    {
      user_id: 'user-2',
      organization_id: mockOrganizationId,
      name: 'Jane Smith',
      email: 'jane@example.com',
      role: 'owner',
      joined_at: '2025-01-01T00:00:00Z',
      last_active: '2025-10-25T00:00:00Z',
    },
    {
      user_id: 'user-3',
      organization_id: mockOrganizationId,
      name: 'Bob Wilson',
      email: 'bob@example.com',
      role: 'viewer',
      joined_at: '2025-01-15T00:00:00Z',
      last_active: '2025-10-24T00:00:00Z',
    },
  ];

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, cacheTime: 0 },
        mutations: { retry: false },
      },
    });

    vi.clearAllMocks();

    // Mock successful user auth
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: { id: 'user-2', email: 'jane@example.com' } } as any,
      error: null,
    });

    // Mock org members query
    const _mockFrom = vi.fn().mockReturnThis();
    const mockSelect = vi.fn().mockReturnThis();
    const mockEq = vi.fn().mockReturnThis();
    const mockIs = vi.fn().mockReturnThis();
    const mockUpdate = vi.fn().mockReturnThis();
    const _mockSingle = vi.fn();

    vi.mocked(supabase.from).mockImplementation((table) => {
      if (table === 'users') {
        return {
          select: mockSelect,
          update: mockUpdate,
          eq: mockEq,
          is: mockIs,
        } as any;
      }
      return { select: vi.fn() } as any;
    });
  });

  describe('Scenario 1: Confirmation Dialog', () => {
    it('FR-027: should show confirmation dialog when Remove Member is clicked', async () => {
      const user = userEvent.setup();
      const handleRemove = vi.fn();

      render(
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <MockMemberRow member={mockMembers[0]} onRemove={handleRemove} />
          </BrowserRouter>
        </QueryClientProvider>
      );

      const removeButton = screen.getByRole('button', { name: /remove member/i });
      await user.click(removeButton);

      // Confirmation dialog should appear
      expect(screen.getByRole('alertdialog')).toBeInTheDocument();
      expect(screen.getByText(/are you sure/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /remove/i })).toBeInTheDocument();
    });

    it('FR-028: should close dialog and not remove member when Cancel is clicked', async () => {
      const user = userEvent.setup();
      const handleRemove = vi.fn();

      render(
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <MockMemberRow member={mockMembers[0]} onRemove={handleRemove} />
          </BrowserRouter>
        </QueryClientProvider>
      );

      const removeButton = screen.getByRole('button', { name: /remove member/i });
      await user.click(removeButton);

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      await waitFor(() => {
        expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
      });

      expect(handleRemove).not.toHaveBeenCalled();
    });
  });

  describe('Scenario 2: Removal Success', () => {
    it('FR-029: should remove member from list immediately (optimistic update)', async () => {
      const user = userEvent.setup();

      // Mock successful removal
      const mockUpdate = vi.fn().mockResolvedValue({ data: null, error: null });
      vi.mocked(supabase.from).mockReturnValue({
        update: mockUpdate,
        eq: vi.fn().mockReturnThis(),
      } as any);

      const TestComponent = () => {
        const [members, setMembers] = React.useState(mockMembers);

        const handleRemove = (userId: string) => {
          // Optimistic update
          setMembers((prev) => prev.filter((m) => m.user_id !== userId));
        };

        return (
          <div>
            {members.map((member) => (
              <MockMemberRow key={member.user_id} member={member} onRemove={handleRemove} />
            ))}
          </div>
        );
      };

      render(
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <TestComponent />
          </BrowserRouter>
        </QueryClientProvider>
      );

      expect(screen.getByText('John Doe')).toBeInTheDocument();

      const removeButton = screen.getAllByRole('button', { name: /remove member/i })[0];
      await user.click(removeButton);

      const confirmButton = screen.getByRole('button', { name: /remove/i });
      await user.click(confirmButton);

      // Member should disappear immediately (optimistic update)
      await waitFor(() => {
        expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
      });
    });

    it('FR-030: should show success toast with member name', async () => {
      const user = userEvent.setup();
      const mockToast = vi.fn();
      vi.mock('sonner', () => ({
        toast: {
          success: mockToast,
          error: vi.fn(),
        },
      }));

      // Mock successful removal
      const mockUpdate = vi.fn().mockResolvedValue({ data: null, error: null });
      vi.mocked(supabase.from).mockReturnValue({
        update: mockUpdate,
        eq: vi.fn().mockReturnThis(),
      } as any);

      render(
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <MockMemberRow member={mockMembers[0]} onRemove={vi.fn()} />
          </BrowserRouter>
        </QueryClientProvider>
      );

      const removeButton = screen.getByRole('button', { name: /remove member/i });
      await user.click(removeButton);

      const confirmButton = screen.getByRole('button', { name: /remove/i });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(expect.stringContaining('John Doe'));
        expect(mockToast).toHaveBeenCalledWith(
          expect.stringContaining('removed from organization')
        );
      });
    });
  });

  describe('Scenario 3: Last Owner Protection', () => {
    it('FR-031: should show error toast when attempting to remove last owner', async () => {
      const user = userEvent.setup();

      // Mock 422 error (cannot remove last owner)
      const mockError = {
        code: '422',
        message: 'Cannot remove: Organization must have at least one owner',
      };
      const mockUpdate = vi.fn().mockResolvedValue({ data: null, error: mockError });
      vi.mocked(supabase.from).mockReturnValue({
        update: mockUpdate,
        eq: vi.fn().mockReturnThis(),
      } as any);

      render(
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <MockMemberRow member={mockMembers[1]} onRemove={vi.fn()} />
          </BrowserRouter>
        </QueryClientProvider>
      );

      const removeButton = screen.getByRole('button', { name: /remove member/i });
      await user.click(removeButton);

      const confirmButton = screen.getByRole('button', { name: /remove/i });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(screen.getByText(/cannot remove.*last owner/i)).toBeInTheDocument();
      });
    });

    it('FR-032: should rollback optimistic update on error', async () => {
      const user = userEvent.setup();

      // Mock error
      const mockError = { code: '422', message: 'Cannot remove last owner' };
      const mockUpdate = vi.fn().mockResolvedValue({ data: null, error: mockError });
      vi.mocked(supabase.from).mockReturnValue({
        update: mockUpdate,
        eq: vi.fn().mockReturnThis(),
      } as any);

      const TestComponent = () => {
        const [members, setMembers] = React.useState(mockMembers);
        const [previousMembers, setPreviousMembers] = React.useState(mockMembers);

        const handleRemove = async (userId: string) => {
          // Optimistic update
          setPreviousMembers(members);
          setMembers((prev) => prev.filter((m) => m.user_id !== userId));

          // Simulate error and rollback
          setTimeout(() => {
            setMembers(previousMembers);
          }, 100);
        };

        return (
          <div>
            {members.map((member) => (
              <MockMemberRow key={member.user_id} member={member} onRemove={handleRemove} />
            ))}
          </div>
        );
      };

      render(
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <TestComponent />
          </BrowserRouter>
        </QueryClientProvider>
      );

      const ownerName = 'Jane Smith';
      expect(screen.getByText(ownerName)).toBeInTheDocument();

      const removeButton = screen.getAllByRole('button', { name: /remove member/i })[1];
      await user.click(removeButton);

      const confirmButton = screen.getByRole('button', { name: /remove/i });
      await user.click(confirmButton);

      // Member should reappear after rollback
      await waitFor(() => {
        expect(screen.getByText(ownerName)).toBeInTheDocument();
      });
    });
  });

  describe('Scenario 4: RLS Enforcement', () => {
    it('FR-033: should show permission denied error for non-admin users', async () => {
      const user = userEvent.setup();

      // Mock 403 error (permission denied)
      const mockError = { code: '403', message: 'Permission denied' };
      const mockUpdate = vi.fn().mockResolvedValue({ data: null, error: mockError });
      vi.mocked(supabase.from).mockReturnValue({
        update: mockUpdate,
        eq: vi.fn().mockReturnThis(),
      } as any);

      render(
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <MockMemberRow member={mockMembers[2]} onRemove={vi.fn()} />
          </BrowserRouter>
        </QueryClientProvider>
      );

      const removeButton = screen.getByRole('button', { name: /remove member/i });
      await user.click(removeButton);

      const confirmButton = screen.getByRole('button', { name: /remove/i });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(
          screen.getByText(/you need admin role to remove members/i)
        ).toBeInTheDocument();
      });
    });

    it('FR-034: should not show Remove Member button for users without permission', () => {
      // Mock user as viewer
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-3', email: 'bob@example.com' } } as any,
        error: null,
      });

      const TestComponent = () => {
        const userRole = 'viewer';
        const canRemove = userRole === 'owner' || userRole === 'admin';

        return (
          <div data-testid="member-row">
            <span>John Doe</span>
            {canRemove && <button>Remove Member</button>}
          </div>
        );
      };

      render(
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <TestComponent />
          </BrowserRouter>
        </QueryClientProvider>
      );

      expect(screen.queryByRole('button', { name: /remove member/i })).not.toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle member not found error (404)', async () => {
      const user = userEvent.setup();

      const mockError = { code: '404', message: 'Member no longer exists' };
      const mockUpdate = vi.fn().mockResolvedValue({ data: null, error: mockError });
      vi.mocked(supabase.from).mockReturnValue({
        update: mockUpdate,
        eq: vi.fn().mockReturnThis(),
      } as any);

      render(
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <MockMemberRow member={mockMembers[0]} onRemove={vi.fn()} />
          </BrowserRouter>
        </QueryClientProvider>
      );

      const removeButton = screen.getByRole('button', { name: /remove member/i });
      await user.click(removeButton);

      const confirmButton = screen.getByRole('button', { name: /remove/i });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(screen.getByText(/member no longer exists/i)).toBeInTheDocument();
      });
    });

    it('should handle network errors gracefully', async () => {
      const user = userEvent.setup();

      const mockError = { code: 'NETWORK_ERROR', message: 'Network request failed' };
      const mockUpdate = vi.fn().mockRejectedValue(mockError);
      vi.mocked(supabase.from).mockReturnValue({
        update: mockUpdate,
        eq: vi.fn().mockReturnThis(),
      } as any);

      render(
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <MockMemberRow member={mockMembers[0]} onRemove={vi.fn()} />
          </BrowserRouter>
        </QueryClientProvider>
      );

      const removeButton = screen.getByRole('button', { name: /remove member/i });
      await user.click(removeButton);

      const confirmButton = screen.getByRole('button', { name: /remove/i });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(
          screen.getByText(/failed to remove member.*please try again/i)
        ).toBeInTheDocument();
      });
    });
  });
});

// T013: Component test for MemberRow
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemberRow } from './MemberRow';
import type { TeamMember } from '@/types/team.types';

describe('MemberRow Component', () => {
  const mockMember: TeamMember = {
    user_id: 'user-123',
    organization_id: 'org-456',
    name: 'John Doe',
    email: 'john.doe@example.com',
    role: 'admin',
    joined_at: '2025-01-15T10:00:00Z',
    last_active: '2025-10-26T09:30:00Z',
  };

  const mockPendingInvite = {
    id: 'invite-789',
    organization_id: 'org-456',
    email: 'pending@example.com',
    role: 'viewer' as const,
    token: 'abc123',
    message: null,
    created_at: '2025-10-20T10:00:00Z',
    sent_at: '2025-10-20T10:00:00Z',
    expires_at: '2025-10-27T10:00:00Z',
    status: 'pending' as const,
  };

  describe('Display', () => {
    it('should render member name', () => {
      render(<MemberRow member={mockMember} isExpanded={false} onToggle={vi.fn()} />);
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    it('should render member email', () => {
      render(<MemberRow member={mockMember} isExpanded={false} onToggle={vi.fn()} />);
      expect(screen.getByText('john.doe@example.com')).toBeInTheDocument();
    });

    it('should render role badge', () => {
      render(<MemberRow member={mockMember} isExpanded={false} onToggle={vi.fn()} />);
      expect(screen.getByText('admin')).toBeInTheDocument();
    });

    it('should render join date in human-readable format', () => {
      render(<MemberRow member={mockMember} isExpanded={false} onToggle={vi.fn()} />);
      // Check for "Joined" text (exact format depends on implementation)
      expect(screen.getByText(/joined/i)).toBeInTheDocument();
    });

    it('should render "Pending" badge for pending invitations', () => {
      render(<MemberRow invitation={mockPendingInvite} isExpanded={false} onToggle={vi.fn()} />);
      expect(screen.getByText('Pending')).toBeInTheDocument();
    });

    it('should show invite email when displaying invitation', () => {
      render(<MemberRow invitation={mockPendingInvite} isExpanded={false} onToggle={vi.fn()} />);
      expect(screen.getByText('pending@example.com')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have button role for expand trigger', () => {
      render(<MemberRow member={mockMember} isExpanded={false} onToggle={vi.fn()} />);
      const button = screen.getByRole('button', { name: /expand permissions/i });
      expect(button).toBeInTheDocument();
    });

    it('should have aria-expanded=false when collapsed', () => {
      render(<MemberRow member={mockMember} isExpanded={false} onToggle={vi.fn()} />);
      const button = screen.getByRole('button', { name: /expand permissions/i });
      expect(button).toHaveAttribute('aria-expanded', 'false');
    });

    it('should have aria-expanded=true when expanded', () => {
      render(<MemberRow member={mockMember} isExpanded={true} onToggle={vi.fn()} />);
      const button = screen.getByRole('button', { name: /expand permissions/i });
      expect(button).toHaveAttribute('aria-expanded', 'true');
    });

    it('should have aria-controls pointing to permissions section', () => {
      render(<MemberRow member={mockMember} isExpanded={false} onToggle={vi.fn()} />);
      const button = screen.getByRole('button', { name: /expand permissions/i });
      const ariaControls = button.getAttribute('aria-controls');
      expect(ariaControls).toBeTruthy();
      expect(ariaControls).toContain('permissions');
    });

    it('should be keyboard accessible with tabIndex={0}', () => {
      render(<MemberRow member={mockMember} isExpanded={false} onToggle={vi.fn()} />);
      const button = screen.getByRole('button', { name: /expand permissions/i });
      expect(button).toHaveAttribute('tabIndex', '0');
    });
  });

  describe('Interaction', () => {
    it('should call onToggle when clicked', async () => {
      const user = userEvent.setup();
      const onToggle = vi.fn();

      render(<MemberRow member={mockMember} isExpanded={false} onToggle={onToggle} />);

      const button = screen.getByRole('button', { name: /expand permissions/i });
      await user.click(button);

      expect(onToggle).toHaveBeenCalledOnce();
      expect(onToggle).toHaveBeenCalledWith('user-123');
    });

    it('should call onToggle when Enter key pressed', async () => {
      const user = userEvent.setup();
      const onToggle = vi.fn();

      render(<MemberRow member={mockMember} isExpanded={false} onToggle={onToggle} />);

      const button = screen.getByRole('button', { name: /expand permissions/i });
      button.focus();
      await user.keyboard('{Enter}');

      expect(onToggle).toHaveBeenCalledOnce();
    });

    it('should call onToggle when Space key pressed', async () => {
      const user = userEvent.setup();
      const onToggle = vi.fn();

      render(<MemberRow member={mockMember} isExpanded={false} onToggle={onToggle} />);

      const button = screen.getByRole('button', { name: /expand permissions/i });
      button.focus();
      await user.keyboard(' ');

      expect(onToggle).toHaveBeenCalledOnce();
    });
  });

  describe('Expansion State', () => {
    it('should not show permission details when collapsed', () => {
      render(<MemberRow member={mockMember} isExpanded={false} onToggle={vi.fn()} />);
      expect(screen.queryByText('Manage Drawings')).not.toBeInTheDocument();
    });

    it('should show permission details when expanded', () => {
      render(<MemberRow member={mockMember} isExpanded={true} onToggle={vi.fn()} />);
      // Admin role should have "Manage Drawings" permission
      expect(screen.getByText('Manage Drawings')).toBeInTheDocument();
    });

    it('should show correct permissions for admin role', () => {
      render(<MemberRow member={mockMember} isExpanded={true} onToggle={vi.fn()} />);

      // Admin permissions (from ROLE_PERMISSIONS)
      expect(screen.getByText('Manage Drawings')).toBeInTheDocument();
      expect(screen.getByText('Assign Metadata')).toBeInTheDocument();
      expect(screen.getByText('Update Milestones')).toBeInTheDocument();
      expect(screen.getByText('Assign Welders')).toBeInTheDocument();
      expect(screen.getByText('Manage Team')).toBeInTheDocument();
      expect(screen.getByText('View Reports')).toBeInTheDocument();

      // Admin does NOT have "Manage Projects"
      expect(screen.queryByText('Manage Projects')).not.toBeInTheDocument();
    });

    it('should show correct permissions for viewer role', () => {
      const viewerMember: TeamMember = { ...mockMember, role: 'viewer' };
      render(<MemberRow member={viewerMember} isExpanded={true} onToggle={vi.fn()} />);

      // Viewer only has "View Reports"
      expect(screen.getByText('View Reports')).toBeInTheDocument();

      // No other permissions
      expect(screen.queryByText('Manage Drawings')).not.toBeInTheDocument();
      expect(screen.queryByText('Assign Metadata')).not.toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle null last_active gracefully', () => {
      const memberWithoutActivity: TeamMember = { ...mockMember, last_active: null };
      render(<MemberRow member={memberWithoutActivity} isExpanded={false} onToggle={vi.fn()} />);

      // Should still render without errors
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    it('should handle very long names', () => {
      const longNameMember: TeamMember = {
        ...mockMember,
        name: 'Christopher Alexander Montgomery Wellington III',
      };
      render(<MemberRow member={longNameMember} isExpanded={false} onToggle={vi.fn()} />);

      expect(screen.getByText(/Christopher Alexander/)).toBeInTheDocument();
    });

    it('should handle expired invitations', () => {
      const expiredInvite = {
        ...mockPendingInvite,
        expires_at: '2025-01-01T00:00:00Z',  // Past date
        status: 'expired' as const,
      };
      render(<MemberRow invitation={expiredInvite} isExpanded={false} onToggle={vi.fn()} />);

      // Should show "Expired" instead of "Pending"
      expect(screen.getByText('Expired')).toBeInTheDocument();
    });
  });
});

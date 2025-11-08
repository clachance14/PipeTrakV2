// T014: Component test for PermissionBadge
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PermissionBadge } from './PermissionBadge';
import type { Permission } from '@/lib/permissions';

describe('PermissionBadge Component', () => {
  describe('Display', () => {
    it('should render permission name', () => {
      render(<PermissionBadge permission="manage_drawings" hasPermission={true} />);
      expect(screen.getByText('Manage Drawings')).toBeInTheDocument();
    });

    it('should format snake_case to Title Case', () => {
      const permissions: Permission[] = [
        'manage_drawings',
        'assign_metadata',
        'update_milestones',
        'assign_welders',
        'manage_team',
        'view_reports',
        'manage_projects',
      ];

      const expectedTitles = [
        'Manage Drawings',
        'Assign Metadata',
        'Update Milestones',
        'Assign Welders',
        'Manage Team',
        'View Reports',
        'Manage Projects',
      ];

      permissions.forEach((permission, index) => {
        const { unmount } = render(
          <PermissionBadge permission={permission} hasPermission={true} />
        );
        expect(screen.getByText(expectedTitles[index])).toBeInTheDocument();
        unmount();
      });
    });
  });

  describe('Visual State', () => {
    it('should show checkmark icon when hasPermission=true', () => {
      render(<PermissionBadge permission="manage_drawings" hasPermission={true} />);

      // Look for checkmark (✓) or check icon
      const badge = screen.getByRole('status');
      expect(badge).toContainHTML('✓');
    });

    it('should show X icon when hasPermission=false', () => {
      render(<PermissionBadge permission="manage_drawings" hasPermission={false} />);

      // Look for X (✗) or cross icon
      const badge = screen.getByRole('status');
      expect(badge).toContainHTML('✗');
    });

    it('should have success/green styling when hasPermission=true', () => {
      render(<PermissionBadge permission="manage_drawings" hasPermission={true} />);

      const badge = screen.getByRole('status');
      // Check for green/success color class (bg-green, text-green, etc.)
      expect(badge.className).toMatch(/green|success/i);
    });

    it('should have muted/gray styling when hasPermission=false', () => {
      render(<PermissionBadge permission="manage_drawings" hasPermission={false} />);

      const badge = screen.getByRole('status');
      // Check for gray/muted color class
      expect(badge.className).toMatch(/gray|slate|muted/i);
    });
  });

  describe('All Permissions', () => {
    it('should render all 7 permission types correctly', () => {
      const allPermissions: { permission: Permission; label: string }[] = [
        { permission: 'manage_drawings', label: 'Manage Drawings' },
        { permission: 'assign_metadata', label: 'Assign Metadata' },
        { permission: 'update_milestones', label: 'Update Milestones' },
        { permission: 'assign_welders', label: 'Assign Welders' },
        { permission: 'manage_team', label: 'Manage Team' },
        { permission: 'view_reports', label: 'View Reports' },
        { permission: 'manage_projects', label: 'Manage Projects' },
      ];

      allPermissions.forEach(({ permission, label }) => {
        const { unmount } = render(
          <PermissionBadge permission={permission} hasPermission={true} />
        );
        expect(screen.getByText(label)).toBeInTheDocument();
        unmount();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have semantic badge markup', () => {
      const { container } = render(
        <PermissionBadge permission="manage_drawings" hasPermission={true} />
      );

      // Badge should be a span or similar inline element
      const badge = container.querySelector('[role="status"]') || container.querySelector('span');
      expect(badge).toBeInTheDocument();
    });

    it('should communicate permission state to screen readers', () => {
      render(<PermissionBadge permission="manage_drawings" hasPermission={true} />);

      // Should have aria-label or title explaining the state
      const badge = screen.getByRole('status');
      const ariaLabel = badge.getAttribute('aria-label') || badge.getAttribute('title');
      expect(ariaLabel).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    it('should handle permission prop changes', () => {
      const { rerender } = render(
        <PermissionBadge permission="manage_drawings" hasPermission={true} />
      );
      expect(screen.getByText('Manage Drawings')).toBeInTheDocument();

      rerender(<PermissionBadge permission="manage_drawings" hasPermission={false} />);
      // Should still show same permission but with different styling
      expect(screen.getByText('Manage Drawings')).toBeInTheDocument();

      const badge = screen.getByRole('status');
      expect(badge.className).toMatch(/gray|slate|muted/i);
    });

    it('should be self-contained and not affect siblings', () => {
      const { container } = render(
        <div>
          <PermissionBadge permission="manage_drawings" hasPermission={true} />
          <PermissionBadge permission="assign_metadata" hasPermission={false} />
        </div>
      );

      const badges = container.querySelectorAll('span, div[role="status"]');
      expect(badges.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Visual Consistency', () => {
    it('should have consistent spacing and sizing', () => {
      const { container: container1 } = render(
        <PermissionBadge permission="manage_drawings" hasPermission={true} />
      );
      const { container: container2 } = render(
        <PermissionBadge permission="manage_projects" hasPermission={false} />
      );

      const badge1 = container1.firstChild as HTMLElement;
      const badge2 = container2.firstChild as HTMLElement;

      // Should have same padding/height classes
      const classIntersection = badge1.className
        .split(' ')
        .filter(cls => badge2.className.includes(cls));

      // Should share common layout classes (px, py, rounded, etc.)
      expect(classIntersection.length).toBeGreaterThan(0);
    });
  });
});

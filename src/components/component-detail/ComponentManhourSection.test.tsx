import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ComponentManhourSection } from './ComponentManhourSection';

// Mock the manhour permissions hook
vi.mock('@/lib/permissions/manhour-permissions', () => ({
  useManhourPermissions: vi.fn(),
}));

import { useManhourPermissions } from '@/lib/permissions/manhour-permissions';

describe('ComponentManhourSection', () => {
  const mockComponent = {
    id: 'comp-1',
    budgeted_manhours: 100,
    percent_complete: 60,
  };

  it('renders manhour data when user has permission', () => {
    vi.mocked(useManhourPermissions).mockReturnValue({
      canViewManhours: true,
      canEditBudget: false,
    });

    render(<ComponentManhourSection component={mockComponent as any} />);

    // Check section title
    expect(screen.getByText('Manhours')).toBeInTheDocument();

    // Check budgeted manhours
    expect(screen.getByText('Budgeted')).toBeInTheDocument();
    expect(screen.getByText('100.0 MH')).toBeInTheDocument();

    // Check earned manhours (100 * 0.60 = 60)
    expect(screen.getByText('Earned')).toBeInTheDocument();
    expect(screen.getByText('60.0 MH')).toBeInTheDocument();
  });

  it('returns null when user does not have permission', () => {
    vi.mocked(useManhourPermissions).mockReturnValue({
      canViewManhours: false,
      canEditBudget: false,
    });

    const { container } = render(<ComponentManhourSection component={mockComponent as any} />);

    // Should render nothing
    expect(container.firstChild).toBeNull();
  });

  it('returns null when component has no budgeted manhours', () => {
    vi.mocked(useManhourPermissions).mockReturnValue({
      canViewManhours: true,
      canEditBudget: false,
    });

    const componentWithoutBudget = {
      ...mockComponent,
      budgeted_manhours: null,
    };

    const { container } = render(<ComponentManhourSection component={componentWithoutBudget as any} />);

    // Should render nothing
    expect(container.firstChild).toBeNull();
  });

  it('calculates earned manhours correctly', () => {
    vi.mocked(useManhourPermissions).mockReturnValue({
      canViewManhours: true,
      canEditBudget: false,
    });

    const component = {
      ...mockComponent,
      budgeted_manhours: 200,
      percent_complete: 75,
    };

    render(<ComponentManhourSection component={component as any} />);

    // 200 * 0.75 = 150
    expect(screen.getByText('150.0 MH')).toBeInTheDocument();
  });

  it('handles zero percent complete', () => {
    vi.mocked(useManhourPermissions).mockReturnValue({
      canViewManhours: true,
      canEditBudget: false,
    });

    const component = {
      ...mockComponent,
      budgeted_manhours: 100,
      percent_complete: 0,
    };

    render(<ComponentManhourSection component={component as any} />);

    // 100 * 0 = 0
    expect(screen.getByText('0.0 MH')).toBeInTheDocument();
  });

  it('handles 100% complete', () => {
    vi.mocked(useManhourPermissions).mockReturnValue({
      canViewManhours: true,
      canEditBudget: false,
    });

    const component = {
      ...mockComponent,
      budgeted_manhours: 100,
      percent_complete: 100,
    };

    render(<ComponentManhourSection component={component as any} />);

    // 100 * 1.0 = 100 (both budgeted and earned will be 100.0 MH)
    const manhourValues = screen.getAllByText('100.0 MH');
    expect(manhourValues).toHaveLength(2); // Budgeted and Earned
  });

  it('displays values in a grid layout', () => {
    vi.mocked(useManhourPermissions).mockReturnValue({
      canViewManhours: true,
      canEditBudget: false,
    });

    render(<ComponentManhourSection component={mockComponent as any} />);

    // Find the grid container
    const gridContainer = screen.getByText('Budgeted').closest('div.grid');
    expect(gridContainer).toHaveClass('grid-cols-2');
  });
});

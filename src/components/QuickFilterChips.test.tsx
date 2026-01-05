/**
 * QuickFilterChips component tests
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QuickFilterChips } from './QuickFilterChips';

describe('QuickFilterChips', () => {
  const mockOnFilterChange = vi.fn();
  const mockOnClearAll = vi.fn();

  const defaultProps = {
    activeFilters: {},
    onFilterChange: mockOnFilterChange,
    onClearAll: mockOnClearAll,
  };

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders all quick filter buttons', () => {
    render(<QuickFilterChips {...defaultProps} />);

    expect(screen.getByRole('button', { name: /not started/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /in progress/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /complete/i })).toBeInTheDocument();
  });

  it('clicking "Not Started" applies correct filter', async () => {
    const user = userEvent.setup();
    render(<QuickFilterChips {...defaultProps} />);

    const notStartedButton = screen.getByRole('button', { name: /not started/i });
    await user.click(notStartedButton);

    expect(mockOnFilterChange).toHaveBeenCalledWith({
      progress_min: 0,
      progress_max: 0,
    });
  });

  it('clicking "In Progress" applies correct filter', async () => {
    const user = userEvent.setup();
    render(<QuickFilterChips {...defaultProps} />);

    const inProgressButton = screen.getByRole('button', { name: /in progress/i });
    await user.click(inProgressButton);

    expect(mockOnFilterChange).toHaveBeenCalledWith({
      progress_min: 1,
      progress_max: 99,
    });
  });

  it('clicking "Complete" applies correct filter', async () => {
    const user = userEvent.setup();
    render(<QuickFilterChips {...defaultProps} />);

    const completeButton = screen.getByRole('button', { name: /complete/i });
    await user.click(completeButton);

    expect(mockOnFilterChange).toHaveBeenCalledWith({
      progress_min: 100,
      progress_max: 100,
    });
  });

  it('active filter shows as selected', () => {
    render(
      <QuickFilterChips
        {...defaultProps}
        activeFilters={{
          progress_min: 0,
          progress_max: 0,
        }}
      />
    );

    const notStartedButton = screen.getByRole('button', { name: /not started/i });
    // Check for the 'default' variant styling (which indicates active state)
    expect(notStartedButton).toHaveClass('ring-2');
  });

  it('clicking active filter clears it', async () => {
    const user = userEvent.setup();
    render(
      <QuickFilterChips
        {...defaultProps}
        activeFilters={{
          progress_min: 0,
          progress_max: 0,
        }}
      />
    );

    const notStartedButton = screen.getByRole('button', { name: /not started/i });
    await user.click(notStartedButton);

    expect(mockOnFilterChange).toHaveBeenCalledWith({
      progress_min: undefined,
      progress_max: undefined,
    });
  });

  it('Clear button removes all filters', async () => {
    const user = userEvent.setup();
    render(
      <QuickFilterChips
        {...defaultProps}
        activeFilters={{
          progress_min: 0,
          progress_max: 0,
          area_id: 'area-1',
        }}
      />
    );

    const clearButton = screen.getByRole('button', { name: /clear/i });
    await user.click(clearButton);

    expect(mockOnClearAll).toHaveBeenCalled();
  });

  it('only shows Clear button when filters are active', () => {
    const { rerender } = render(<QuickFilterChips {...defaultProps} />);

    expect(screen.queryByRole('button', { name: /clear/i })).not.toBeInTheDocument();

    rerender(
      <QuickFilterChips
        {...defaultProps}
        activeFilters={{
          progress_min: 0,
          progress_max: 0,
        }}
      />
    );

    expect(screen.getByRole('button', { name: /clear/i })).toBeInTheDocument();
  });

  it('preserves other filters when applying quick filter', async () => {
    const user = userEvent.setup();
    render(
      <QuickFilterChips
        {...defaultProps}
        activeFilters={{
          area_id: 'area-1',
          system_id: 'system-1',
        }}
      />
    );

    const notStartedButton = screen.getByRole('button', { name: /not started/i });
    await user.click(notStartedButton);

    expect(mockOnFilterChange).toHaveBeenCalledWith({
      area_id: 'area-1',
      system_id: 'system-1',
      progress_min: 0,
      progress_max: 0,
    });
  });

  it('preserves other filters when clearing progress filter', async () => {
    const user = userEvent.setup();
    render(
      <QuickFilterChips
        {...defaultProps}
        activeFilters={{
          area_id: 'area-1',
          progress_min: 0,
          progress_max: 0,
        }}
      />
    );

    const notStartedButton = screen.getByRole('button', { name: /not started/i });
    await user.click(notStartedButton);

    expect(mockOnFilterChange).toHaveBeenCalledWith({
      area_id: 'area-1',
      progress_min: undefined,
      progress_max: undefined,
    });
  });
});

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ColumnChooser } from './column-chooser';

describe('ColumnChooser', () => {
  const mockColumns = [
    { id: 'selection', label: 'Selection', canHide: false },
    { id: 'identity_key', label: 'Component', canHide: false },
    { id: 'area', label: 'Area', canHide: true },
    { id: 'system', label: 'System', canHide: true },
    { id: 'drawing', label: 'Drawing', canHide: true },
  ];

  it('should render column chooser button', () => {
    const onToggle = vi.fn();
    const onShowAll = vi.fn();

    render(
      <ColumnChooser
        columns={mockColumns}
        visibleColumns={['selection', 'identity_key', 'area', 'system', 'drawing']}
        onToggle={onToggle}
        onShowAll={onShowAll}
      />
    );

    expect(screen.getByRole('button', { name: /columns/i })).toBeInTheDocument();
  });

  it('should show hidden count badge when columns are hidden', () => {
    const onToggle = vi.fn();
    const onShowAll = vi.fn();

    render(
      <ColumnChooser
        columns={mockColumns}
        visibleColumns={['selection', 'identity_key', 'area']} // 2 hideable columns hidden
        onToggle={onToggle}
        onShowAll={onShowAll}
      />
    );

    expect(screen.getByText('2 hidden')).toBeInTheDocument();
  });

  it('should not show hidden count when all columns are visible', () => {
    const onToggle = vi.fn();
    const onShowAll = vi.fn();

    render(
      <ColumnChooser
        columns={mockColumns}
        visibleColumns={['selection', 'identity_key', 'area', 'system', 'drawing']}
        onToggle={onToggle}
        onShowAll={onShowAll}
      />
    );

    expect(screen.queryByText(/hidden/)).not.toBeInTheDocument();
  });

  it('should open dropdown menu on click', async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    const onShowAll = vi.fn();

    render(
      <ColumnChooser
        columns={mockColumns}
        visibleColumns={['selection', 'identity_key', 'area']}
        onToggle={onToggle}
        onShowAll={onShowAll}
      />
    );

    await user.click(screen.getByRole('button', { name: /columns/i }));

    // Dropdown should show all column options
    expect(screen.getByText('Selection')).toBeInTheDocument();
    expect(screen.getByText('Component')).toBeInTheDocument();
    expect(screen.getByText('Area')).toBeInTheDocument();
    expect(screen.getByText('System')).toBeInTheDocument();
    expect(screen.getByText('Drawing')).toBeInTheDocument();
  });

  it('should call onToggle when column checkbox is clicked', async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    const onShowAll = vi.fn();

    render(
      <ColumnChooser
        columns={mockColumns}
        visibleColumns={['selection', 'identity_key', 'area']}
        onToggle={onToggle}
        onShowAll={onShowAll}
      />
    );

    await user.click(screen.getByRole('button', { name: /columns/i }));
    await user.click(screen.getByText('System'));

    expect(onToggle).toHaveBeenCalledWith('system');
  });

  it('should disable pinned columns', async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    const onShowAll = vi.fn();

    render(
      <ColumnChooser
        columns={mockColumns}
        visibleColumns={['selection', 'identity_key', 'area']}
        onToggle={onToggle}
        onShowAll={onShowAll}
      />
    );

    await user.click(screen.getByRole('button', { name: /columns/i }));

    // Selection and Component should be pinned (canHide: false)
    const selectionItem = screen.getByText('Selection').closest('[role="menuitemcheckbox"]');
    const componentItem = screen.getByText('Component').closest('[role="menuitemcheckbox"]');

    expect(selectionItem).toHaveAttribute('data-disabled');
    expect(componentItem).toHaveAttribute('data-disabled');
  });

  it('should show "Pinned" label for non-hideable columns', async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    const onShowAll = vi.fn();

    render(
      <ColumnChooser
        columns={mockColumns}
        visibleColumns={['selection', 'identity_key', 'area']}
        onToggle={onToggle}
        onShowAll={onShowAll}
      />
    );

    await user.click(screen.getByRole('button', { name: /columns/i }));

    // Should show "Pinned" label for non-hideable columns
    const pinnedLabels = screen.getAllByText('Pinned');
    expect(pinnedLabels).toHaveLength(2); // Selection and Component
  });

  it('should call onShowAll when Show All button is clicked', async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    const onShowAll = vi.fn();

    render(
      <ColumnChooser
        columns={mockColumns}
        visibleColumns={['selection', 'identity_key']}
        onToggle={onToggle}
        onShowAll={onShowAll}
      />
    );

    await user.click(screen.getByRole('button', { name: /columns/i }));
    await user.click(screen.getByRole('button', { name: /show all/i }));

    expect(onShowAll).toHaveBeenCalled();
  });
});

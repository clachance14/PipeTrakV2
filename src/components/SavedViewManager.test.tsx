import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SavedViewManager } from './SavedViewManager';
import { useComponentPreferencesStore } from '@/stores/useComponentPreferencesStore';

// Mock the store
vi.mock('@/stores/useComponentPreferencesStore');

describe('SavedViewManager', () => {
  const mockLoadView = vi.fn();
  const mockSaveView = vi.fn();
  const mockDeleteView = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementation
    vi.mocked(useComponentPreferencesStore).mockReturnValue({
      savedViews: [
        {
          id: 'default',
          name: 'Default',
          sortRules: [{ field: 'identity_key', direction: 'asc' }],
          visibleColumns: [],
        },
        {
          id: 'by-area',
          name: 'By Area',
          sortRules: [{ field: 'area', direction: 'asc' }],
          visibleColumns: [],
        },
        {
          id: 'custom-123',
          name: 'My Custom View',
          sortRules: [],
          visibleColumns: [],
        },
      ],
      activeViewId: 'default',
      loadView: mockLoadView,
      saveView: mockSaveView,
      deleteView: mockDeleteView,
      sortRules: [],
      visibleColumns: [],
      density: 'comfortable',
      addSortRule: vi.fn(),
      removeSortRule: vi.fn(),
      clearSortRules: vi.fn(),
      setSortRules: vi.fn(),
      toggleColumn: vi.fn(),
      setVisibleColumns: vi.fn(),
      showAllColumns: vi.fn(),
      setDensity: vi.fn(),
      resetToDefaults: vi.fn(),
    });
  });

  it('should render view manager button with active view name', () => {
    render(<SavedViewManager />);

    expect(screen.getByRole('button', { name: /default/i })).toBeInTheDocument();
  });

  it('should show "Views" when no active view', () => {
    vi.mocked(useComponentPreferencesStore).mockReturnValue({
      savedViews: [],
      activeViewId: null,
      loadView: mockLoadView,
      saveView: mockSaveView,
      deleteView: mockDeleteView,
      sortRules: [],
      visibleColumns: [],
      density: 'comfortable',
      addSortRule: vi.fn(),
      removeSortRule: vi.fn(),
      clearSortRules: vi.fn(),
      setSortRules: vi.fn(),
      toggleColumn: vi.fn(),
      setVisibleColumns: vi.fn(),
      showAllColumns: vi.fn(),
      setDensity: vi.fn(),
      resetToDefaults: vi.fn(),
    });

    render(<SavedViewManager />);

    expect(screen.getByRole('button', { name: /views/i })).toBeInTheDocument();
  });

  it('should open dropdown and show all saved views', async () => {
    const user = userEvent.setup();

    render(<SavedViewManager />);

    await user.click(screen.getByRole('button'));

    expect(screen.getAllByText('Default').length).toBeGreaterThan(0);
    expect(screen.getByText('By Area')).toBeInTheDocument();
    expect(screen.getByText('My Custom View')).toBeInTheDocument();
  });

  it('should highlight active view', async () => {
    const user = userEvent.setup();

    render(<SavedViewManager />);

    await user.click(screen.getByRole('button'));

    // Find the Default view inside a menu item with font-semibold
    const menuItems = screen.getAllByRole('menuitem');
    const defaultMenuItem = menuItems.find(item => item.textContent === 'Default');
    const defaultViewSpan = defaultMenuItem?.querySelector('.font-semibold');
    expect(defaultViewSpan).toBeInTheDocument();
  });

  it('should call loadView when clicking a view', async () => {
    const user = userEvent.setup();

    render(<SavedViewManager />);

    await user.click(screen.getByRole('button'));
    await user.click(screen.getByText('By Area'));

    expect(mockLoadView).toHaveBeenCalledWith('by-area');
  });

  it('should show delete button for custom views only', async () => {
    const user = userEvent.setup();

    render(<SavedViewManager />);

    await user.click(screen.getByRole('button'));

    // Custom view should have delete button
    const customViewItem = screen.getByText('My Custom View').closest('[role="menuitem"]');
    expect(customViewItem?.querySelector('button')).toBeInTheDocument();

    // Built-in views should not have delete button
    const menuItems = screen.getAllByRole('menuitem');
    const defaultViewItem = menuItems.find(item => item.textContent === 'Default');
    expect(defaultViewItem?.querySelector('button')).not.toBeInTheDocument();

    const byAreaViewItem = screen.getByText('By Area').closest('[role="menuitem"]');
    expect(byAreaViewItem?.querySelector('button')).not.toBeInTheDocument();
  });

  it('should call deleteView when clicking delete button', async () => {
    const user = userEvent.setup();

    render(<SavedViewManager />);

    await user.click(screen.getByRole('button'));

    const customViewItem = screen.getByText('My Custom View').closest('[role="menuitem"]');
    const deleteButton = customViewItem?.querySelector('button');

    if (deleteButton) {
      await user.click(deleteButton);
    }

    expect(mockDeleteView).toHaveBeenCalledWith('custom-123');
  });

  it('should not call loadView when clicking delete button', async () => {
    const user = userEvent.setup();

    render(<SavedViewManager />);

    await user.click(screen.getByRole('button'));

    const customViewItem = screen.getByText('My Custom View').closest('[role="menuitem"]');
    const deleteButton = customViewItem?.querySelector('button');

    if (deleteButton) {
      await user.click(deleteButton);
    }

    expect(mockLoadView).not.toHaveBeenCalled();
  });

  it('should open save dialog when clicking "Save Current View"', async () => {
    const user = userEvent.setup();

    render(<SavedViewManager />);

    await user.click(screen.getByRole('button'));
    await user.click(screen.getByText(/save current view/i));

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('View name')).toBeInTheDocument();
    });
  });

  it('should save new view with entered name', async () => {
    const user = userEvent.setup();

    render(<SavedViewManager />);

    await user.click(screen.getByRole('button'));
    await user.click(screen.getByText(/save current view/i));

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText('View name');
    await user.type(input, 'New Custom View');

    const saveButton = screen.getByRole('button', { name: /^save$/i });
    await user.click(saveButton);

    expect(mockSaveView).toHaveBeenCalledWith('New Custom View');
  });

  it('should trim whitespace from view name', async () => {
    const user = userEvent.setup();

    render(<SavedViewManager />);

    await user.click(screen.getByRole('button'));
    await user.click(screen.getByText(/save current view/i));

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText('View name');
    await user.type(input, '  Trimmed View  ');

    const saveButton = screen.getByRole('button', { name: /^save$/i });
    await user.click(saveButton);

    expect(mockSaveView).toHaveBeenCalledWith('Trimmed View');
  });

  it('should disable save button when name is empty', async () => {
    const user = userEvent.setup();

    render(<SavedViewManager />);

    await user.click(screen.getByRole('button'));
    await user.click(screen.getByText(/save current view/i));

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    const saveButton = screen.getByRole('button', { name: /^save$/i });
    expect(saveButton).toBeDisabled();
  });

  it('should save on Enter key', async () => {
    const user = userEvent.setup();

    render(<SavedViewManager />);

    await user.click(screen.getByRole('button'));
    await user.click(screen.getByText(/save current view/i));

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText('View name');
    await user.type(input, 'Quick Save{Enter}');

    expect(mockSaveView).toHaveBeenCalledWith('Quick Save');
  });

  it('should close dialog after saving', async () => {
    const user = userEvent.setup();

    render(<SavedViewManager />);

    await user.click(screen.getByRole('button'));
    await user.click(screen.getByText(/save current view/i));

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText('View name');
    await user.type(input, 'Test View');

    const saveButton = screen.getByRole('button', { name: /^save$/i });
    await user.click(saveButton);

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('should close dialog when clicking cancel', async () => {
    const user = userEvent.setup();

    render(<SavedViewManager />);

    await user.click(screen.getByRole('button'));
    await user.click(screen.getByText(/save current view/i));

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    await user.click(cancelButton);

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });
});

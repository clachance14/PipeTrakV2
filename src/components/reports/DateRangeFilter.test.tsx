/**
 * Unit tests for DateRangeFilter component (Feature 033 - T035)
 * Tests preset dropdown, custom date inputs, clear button, and accessibility
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DateRangeFilter } from './DateRangeFilter';
import { useReportPreferencesStore } from '@/stores/useReportPreferencesStore';
// Mock the Zustand store
vi.mock('@/stores/useReportPreferencesStore', () => ({
  useReportPreferencesStore: vi.fn(),
}));

describe('DateRangeFilter', () => {
  const mockSetDateRangePreset = vi.fn();
  const mockSetCustomDateRange = vi.fn();
  const mockResetDateRange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Preset dropdown rendering', () => {
    it('renders preset dropdown with "All Time" selected by default', () => {
      // @ts-expect-error - Mocking Zustand store
      vi.mocked(useReportPreferencesStore).mockReturnValue({
        dateRange: { preset: 'all_time', startDate: null, endDate: null },
        setDateRangePreset: mockSetDateRangePreset,
        setCustomDateRange: mockSetCustomDateRange,
        resetDateRange: mockResetDateRange,
      });

      render(<DateRangeFilter />);

      // Should render select trigger with accessible label
      const selectTrigger = screen.getByRole('combobox', {
        name: /select date range preset/i,
      });
      expect(selectTrigger).toBeInTheDocument();
    });

    it('renders all preset options when dropdown is opened', async () => {
      const user = userEvent.setup();
      // @ts-expect-error - Mocking Zustand store
      vi.mocked(useReportPreferencesStore).mockReturnValue({
        dateRange: { preset: 'all_time', startDate: null, endDate: null },
        setDateRangePreset: mockSetDateRangePreset,
        setCustomDateRange: mockSetCustomDateRange,
        resetDateRange: mockResetDateRange,
      });

      render(<DateRangeFilter />);

      // Open the dropdown
      const selectTrigger = screen.getByRole('combobox', {
        name: /select date range preset/i,
      });
      await user.click(selectTrigger);

      // Check all options are present
      expect(screen.getByRole('option', { name: 'All Time' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Last 7 Days' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Last 30 Days' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Last 90 Days' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Year to Date' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Custom Range' })).toBeInTheDocument();
    });

    it('displays correct label for current preset', () => {
      // @ts-expect-error - Mocking Zustand store
      vi.mocked(useReportPreferencesStore).mockReturnValue({
        dateRange: { preset: 'last_30_days', startDate: null, endDate: null },
        setDateRangePreset: mockSetDateRangePreset,
        setCustomDateRange: mockSetCustomDateRange,
        resetDateRange: mockResetDateRange,
      });

      render(<DateRangeFilter />);

      // Should show "Last 30 Days" in the select trigger
      expect(screen.getByText('Last 30 Days')).toBeInTheDocument();
    });
  });

  describe('Preset selection behavior', () => {
    it('calls setDateRangePreset when "Last 7 Days" is selected', async () => {
      const user = userEvent.setup();
      // @ts-expect-error - Mocking Zustand store
      vi.mocked(useReportPreferencesStore).mockReturnValue({
        dateRange: { preset: 'all_time', startDate: null, endDate: null },
        setDateRangePreset: mockSetDateRangePreset,
        setCustomDateRange: mockSetCustomDateRange,
        resetDateRange: mockResetDateRange,
      });

      render(<DateRangeFilter />);

      // Open dropdown and select "Last 7 Days"
      const selectTrigger = screen.getByRole('combobox', {
        name: /select date range preset/i,
      });
      await user.click(selectTrigger);
      await user.click(screen.getByRole('option', { name: 'Last 7 Days' }));

      expect(mockSetDateRangePreset).toHaveBeenCalledWith('last_7_days');
    });

    it('calls setDateRangePreset when "Year to Date" is selected', async () => {
      const user = userEvent.setup();
      // @ts-expect-error - Mocking Zustand store
      vi.mocked(useReportPreferencesStore).mockReturnValue({
        dateRange: { preset: 'all_time', startDate: null, endDate: null },
        setDateRangePreset: mockSetDateRangePreset,
        setCustomDateRange: mockSetCustomDateRange,
        resetDateRange: mockResetDateRange,
      });

      render(<DateRangeFilter />);

      // Open dropdown and select "Year to Date"
      const selectTrigger = screen.getByRole('combobox', {
        name: /select date range preset/i,
      });
      await user.click(selectTrigger);
      await user.click(screen.getByRole('option', { name: 'Year to Date' }));

      expect(mockSetDateRangePreset).toHaveBeenCalledWith('ytd');
    });

    it('calls setDateRangePreset when "Custom Range" is selected', async () => {
      const user = userEvent.setup();
      // @ts-expect-error - Mocking Zustand store
      vi.mocked(useReportPreferencesStore).mockReturnValue({
        dateRange: { preset: 'all_time', startDate: null, endDate: null },
        setDateRangePreset: mockSetDateRangePreset,
        setCustomDateRange: mockSetCustomDateRange,
        resetDateRange: mockResetDateRange,
      });

      render(<DateRangeFilter />);

      // Open dropdown and select "Custom Range"
      const selectTrigger = screen.getByRole('combobox', {
        name: /select date range preset/i,
      });
      await user.click(selectTrigger);
      await user.click(screen.getByRole('option', { name: 'Custom Range' }));

      expect(mockSetDateRangePreset).toHaveBeenCalledWith('custom');
    });
  });

  describe('Custom date inputs visibility', () => {
    it('does not show custom date inputs when preset is "all_time"', () => {
      // @ts-expect-error - Mocking Zustand store
      vi.mocked(useReportPreferencesStore).mockReturnValue({
        dateRange: { preset: 'all_time', startDate: null, endDate: null },
        setDateRangePreset: mockSetDateRangePreset,
        setCustomDateRange: mockSetCustomDateRange,
        resetDateRange: mockResetDateRange,
      });

      render(<DateRangeFilter />);

      expect(screen.queryByLabelText('Start date')).not.toBeInTheDocument();
      expect(screen.queryByLabelText('End date')).not.toBeInTheDocument();
    });

    it('does not show custom date inputs when preset is "last_30_days"', () => {
      // @ts-expect-error - Mocking Zustand store
      vi.mocked(useReportPreferencesStore).mockReturnValue({
        dateRange: { preset: 'last_30_days', startDate: null, endDate: null },
        setDateRangePreset: mockSetDateRangePreset,
        setCustomDateRange: mockSetCustomDateRange,
        resetDateRange: mockResetDateRange,
      });

      render(<DateRangeFilter />);

      expect(screen.queryByLabelText('Start date')).not.toBeInTheDocument();
      expect(screen.queryByLabelText('End date')).not.toBeInTheDocument();
    });

    it('shows custom date inputs when preset is "custom"', () => {
      // @ts-expect-error - Mocking Zustand store
      vi.mocked(useReportPreferencesStore).mockReturnValue({
        dateRange: { preset: 'custom', startDate: '2024-01-01', endDate: '2024-01-31' },
        setDateRangePreset: mockSetDateRangePreset,
        setCustomDateRange: mockSetCustomDateRange,
        resetDateRange: mockResetDateRange,
      });

      render(<DateRangeFilter />);

      expect(screen.getByLabelText('Start date')).toBeInTheDocument();
      expect(screen.getByLabelText('End date')).toBeInTheDocument();
    });

    it('shows custom date inputs with correct values', () => {
      // @ts-expect-error - Mocking Zustand store
      vi.mocked(useReportPreferencesStore).mockReturnValue({
        dateRange: {
          preset: 'custom',
          startDate: '2024-02-15',
          endDate: '2024-03-20',
        },
        setDateRangePreset: mockSetDateRangePreset,
        setCustomDateRange: mockSetCustomDateRange,
        resetDateRange: mockResetDateRange,
      });

      render(<DateRangeFilter />);

      const startInput = screen.getByLabelText('Start date') as HTMLInputElement;
      const endInput = screen.getByLabelText('End date') as HTMLInputElement;

      expect(startInput.value).toBe('2024-02-15');
      expect(endInput.value).toBe('2024-03-20');
    });

    it('renders start date label above input', () => {
      // @ts-expect-error - Mocking Zustand store
      vi.mocked(useReportPreferencesStore).mockReturnValue({
        dateRange: { preset: 'custom', startDate: null, endDate: null },
        setDateRangePreset: mockSetDateRangePreset,
        setCustomDateRange: mockSetCustomDateRange,
        resetDateRange: mockResetDateRange,
      });

      render(<DateRangeFilter />);

      // Check that label text is present
      expect(screen.getByText('Start Date')).toBeInTheDocument();
    });

    it('renders end date label above input', () => {
      // @ts-expect-error - Mocking Zustand store
      vi.mocked(useReportPreferencesStore).mockReturnValue({
        dateRange: { preset: 'custom', startDate: null, endDate: null },
        setDateRangePreset: mockSetDateRangePreset,
        setCustomDateRange: mockSetCustomDateRange,
        resetDateRange: mockResetDateRange,
      });

      render(<DateRangeFilter />);

      // Check that label text is present
      expect(screen.getByText('End Date')).toBeInTheDocument();
    });
  });

  describe('Custom date input behavior', () => {
    it('calls setCustomDateRange when start date is changed', async () => {
      const user = userEvent.setup();
      // @ts-expect-error - Mocking Zustand store
      vi.mocked(useReportPreferencesStore).mockReturnValue({
        dateRange: { preset: 'custom', startDate: '', endDate: '2024-03-01' },
        setDateRangePreset: mockSetDateRangePreset,
        setCustomDateRange: mockSetCustomDateRange,
        resetDateRange: mockResetDateRange,
      });

      render(<DateRangeFilter />);

      const startInput = screen.getByLabelText('Start date');
      await user.type(startInput, '2024-02-01');

      expect(mockSetCustomDateRange).toHaveBeenCalledWith('2024-02-01', '2024-03-01');
    });

    it('calls setCustomDateRange when end date is changed', async () => {
      const user = userEvent.setup();
      // @ts-expect-error - Mocking Zustand store
      vi.mocked(useReportPreferencesStore).mockReturnValue({
        dateRange: { preset: 'custom', startDate: '2024-01-01', endDate: '' },
        setDateRangePreset: mockSetDateRangePreset,
        setCustomDateRange: mockSetCustomDateRange,
        resetDateRange: mockResetDateRange,
      });

      render(<DateRangeFilter />);

      const endInput = screen.getByLabelText('End date');
      await user.type(endInput, '2024-12-31');

      expect(mockSetCustomDateRange).toHaveBeenCalledWith('2024-01-01', '2024-12-31');
    });

    it('handles null start date gracefully', async () => {
      const user = userEvent.setup();
      // @ts-expect-error - Mocking Zustand store
      vi.mocked(useReportPreferencesStore).mockReturnValue({
        dateRange: { preset: 'custom', startDate: null, endDate: '2024-03-01' },
        setDateRangePreset: mockSetDateRangePreset,
        setCustomDateRange: mockSetCustomDateRange,
        resetDateRange: mockResetDateRange,
      });

      render(<DateRangeFilter />);

      const startInput = screen.getByLabelText('Start date') as HTMLInputElement;
      expect(startInput.value).toBe('');

      await user.type(startInput, '2024-01-15');
      expect(mockSetCustomDateRange).toHaveBeenCalledWith('2024-01-15', '2024-03-01');
    });

    it('handles null end date gracefully', async () => {
      const user = userEvent.setup();
      // @ts-expect-error - Mocking Zustand store
      vi.mocked(useReportPreferencesStore).mockReturnValue({
        dateRange: { preset: 'custom', startDate: '2024-01-01', endDate: null },
        setDateRangePreset: mockSetDateRangePreset,
        setCustomDateRange: mockSetCustomDateRange,
        resetDateRange: mockResetDateRange,
      });

      render(<DateRangeFilter />);

      const endInput = screen.getByLabelText('End date') as HTMLInputElement;
      expect(endInput.value).toBe('');

      await user.type(endInput, '2024-06-30');
      expect(mockSetCustomDateRange).toHaveBeenCalledWith('2024-01-01', '2024-06-30');
    });
  });

  describe('Clear button visibility', () => {
    it('does not show clear button when preset is "all_time"', () => {
      // @ts-expect-error - Mocking Zustand store
      vi.mocked(useReportPreferencesStore).mockReturnValue({
        dateRange: { preset: 'all_time', startDate: null, endDate: null },
        setDateRangePreset: mockSetDateRangePreset,
        setCustomDateRange: mockSetCustomDateRange,
        resetDateRange: mockResetDateRange,
      });

      render(<DateRangeFilter />);

      expect(
        screen.queryByRole('button', { name: /clear date range filter/i })
      ).not.toBeInTheDocument();
    });

    it('shows clear button when preset is "last_7_days"', () => {
      // @ts-expect-error - Mocking Zustand store
      vi.mocked(useReportPreferencesStore).mockReturnValue({
        dateRange: { preset: 'last_7_days', startDate: null, endDate: null },
        setDateRangePreset: mockSetDateRangePreset,
        setCustomDateRange: mockSetCustomDateRange,
        resetDateRange: mockResetDateRange,
      });

      render(<DateRangeFilter />);

      expect(screen.getByRole('button', { name: /clear date range filter/i })).toBeInTheDocument();
    });

    it('shows clear button when preset is "last_30_days"', () => {
      // @ts-expect-error - Mocking Zustand store
      vi.mocked(useReportPreferencesStore).mockReturnValue({
        dateRange: { preset: 'last_30_days', startDate: null, endDate: null },
        setDateRangePreset: mockSetDateRangePreset,
        setCustomDateRange: mockSetCustomDateRange,
        resetDateRange: mockResetDateRange,
      });

      render(<DateRangeFilter />);

      expect(screen.getByRole('button', { name: /clear date range filter/i })).toBeInTheDocument();
    });

    it('shows clear button when preset is "ytd"', () => {
      // @ts-expect-error - Mocking Zustand store
      vi.mocked(useReportPreferencesStore).mockReturnValue({
        dateRange: { preset: 'ytd', startDate: null, endDate: null },
        setDateRangePreset: mockSetDateRangePreset,
        setCustomDateRange: mockSetCustomDateRange,
        resetDateRange: mockResetDateRange,
      });

      render(<DateRangeFilter />);

      expect(screen.getByRole('button', { name: /clear date range filter/i })).toBeInTheDocument();
    });

    it('shows clear button when preset is "custom"', () => {
      // @ts-expect-error - Mocking Zustand store
      vi.mocked(useReportPreferencesStore).mockReturnValue({
        dateRange: { preset: 'custom', startDate: '2024-01-01', endDate: '2024-12-31' },
        setDateRangePreset: mockSetDateRangePreset,
        setCustomDateRange: mockSetCustomDateRange,
        resetDateRange: mockResetDateRange,
      });

      render(<DateRangeFilter />);

      expect(screen.getByRole('button', { name: /clear date range filter/i })).toBeInTheDocument();
    });
  });

  describe('Clear button behavior', () => {
    it('calls resetDateRange when clear button is clicked', async () => {
      const user = userEvent.setup();
      // @ts-expect-error - Mocking Zustand store
      vi.mocked(useReportPreferencesStore).mockReturnValue({
        dateRange: { preset: 'last_30_days', startDate: null, endDate: null },
        setDateRangePreset: mockSetDateRangePreset,
        setCustomDateRange: mockSetCustomDateRange,
        resetDateRange: mockResetDateRange,
      });

      render(<DateRangeFilter />);

      const clearButton = screen.getByRole('button', { name: /clear date range filter/i });
      await user.click(clearButton);

      expect(mockResetDateRange).toHaveBeenCalledOnce();
    });

    it('resets to "all_time" when clear button is clicked', async () => {
      const user = userEvent.setup();
      const mockReset = vi.fn();
      // @ts-expect-error - Mocking Zustand store
      vi.mocked(useReportPreferencesStore).mockReturnValue({
        dateRange: { preset: 'custom', startDate: '2024-01-01', endDate: '2024-12-31' },
        setDateRangePreset: mockSetDateRangePreset,
        setCustomDateRange: mockSetCustomDateRange,
        resetDateRange: mockReset,
      });

      render(<DateRangeFilter />);

      const clearButton = screen.getByRole('button', { name: /clear date range filter/i });
      await user.click(clearButton);

      expect(mockReset).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('renders select trigger with aria-label', () => {
      // @ts-expect-error - Mocking Zustand store
      vi.mocked(useReportPreferencesStore).mockReturnValue({
        dateRange: { preset: 'all_time', startDate: null, endDate: null },
        setDateRangePreset: mockSetDateRangePreset,
        setCustomDateRange: mockSetCustomDateRange,
        resetDateRange: mockResetDateRange,
      });

      render(<DateRangeFilter />);

      const selectTrigger = screen.getByRole('combobox', {
        name: /select date range preset/i,
      });
      expect(selectTrigger).toHaveAttribute('aria-label', 'Select date range preset');
    });

    it('renders clear button with aria-label', () => {
      // @ts-expect-error - Mocking Zustand store
      vi.mocked(useReportPreferencesStore).mockReturnValue({
        dateRange: { preset: 'last_7_days', startDate: null, endDate: null },
        setDateRangePreset: mockSetDateRangePreset,
        setCustomDateRange: mockSetCustomDateRange,
        resetDateRange: mockResetDateRange,
      });

      render(<DateRangeFilter />);

      const clearButton = screen.getByRole('button', { name: /clear date range filter/i });
      expect(clearButton).toHaveAttribute('aria-label', 'Clear date range filter');
    });

    it('renders clear button with title attribute', () => {
      // @ts-expect-error - Mocking Zustand store
      vi.mocked(useReportPreferencesStore).mockReturnValue({
        dateRange: { preset: 'last_30_days', startDate: null, endDate: null },
        setDateRangePreset: mockSetDateRangePreset,
        setCustomDateRange: mockSetCustomDateRange,
        resetDateRange: mockResetDateRange,
      });

      render(<DateRangeFilter />);

      const clearButton = screen.getByRole('button', { name: /clear date range filter/i });
      expect(clearButton).toHaveAttribute('title', 'Clear date range filter');
    });

    it('renders start date input with aria-label', () => {
      // @ts-expect-error - Mocking Zustand store
      vi.mocked(useReportPreferencesStore).mockReturnValue({
        dateRange: { preset: 'custom', startDate: null, endDate: null },
        setDateRangePreset: mockSetDateRangePreset,
        setCustomDateRange: mockSetCustomDateRange,
        resetDateRange: mockResetDateRange,
      });

      render(<DateRangeFilter />);

      const startInput = screen.getByLabelText('Start date');
      expect(startInput).toHaveAttribute('aria-label', 'Start date');
    });

    it('renders end date input with aria-label', () => {
      // @ts-expect-error - Mocking Zustand store
      vi.mocked(useReportPreferencesStore).mockReturnValue({
        dateRange: { preset: 'custom', startDate: null, endDate: null },
        setDateRangePreset: mockSetDateRangePreset,
        setCustomDateRange: mockSetCustomDateRange,
        resetDateRange: mockResetDateRange,
      });

      render(<DateRangeFilter />);

      const endInput = screen.getByLabelText('End date');
      expect(endInput).toHaveAttribute('aria-label', 'End date');
    });

    it('renders clear button X icon with aria-hidden', () => {
      // @ts-expect-error - Mocking Zustand store
      vi.mocked(useReportPreferencesStore).mockReturnValue({
        dateRange: { preset: 'custom', startDate: null, endDate: null },
        setDateRangePreset: mockSetDateRangePreset,
        setCustomDateRange: mockSetCustomDateRange,
        resetDateRange: mockResetDateRange,
      });

      render(<DateRangeFilter />);

      const clearButton = screen.getByRole('button', { name: /clear date range filter/i });
      const icon = clearButton.querySelector('svg');
      expect(icon).toHaveAttribute('aria-hidden', 'true');
    });

    it('meets minimum touch target size for mobile (44px)', () => {
      // @ts-expect-error - Mocking Zustand store
      vi.mocked(useReportPreferencesStore).mockReturnValue({
        dateRange: { preset: 'last_7_days', startDate: null, endDate: null },
        setDateRangePreset: mockSetDateRangePreset,
        setCustomDateRange: mockSetCustomDateRange,
        resetDateRange: mockResetDateRange,
      });

      render(<DateRangeFilter />);

      // Select trigger should have min-h-[44px]
      const selectTrigger = screen.getByRole('combobox', {
        name: /select date range preset/i,
      });
      expect(selectTrigger).toHaveClass('min-h-[44px]');

      // Clear button should have min-h-[44px] min-w-[44px]
      const clearButton = screen.getByRole('button', { name: /clear date range filter/i });
      expect(clearButton).toHaveClass('min-h-[44px]');
      expect(clearButton).toHaveClass('min-w-[44px]');
    });

    it('date inputs meet minimum touch target size for mobile (44px)', () => {
      // @ts-expect-error - Mocking Zustand store
      vi.mocked(useReportPreferencesStore).mockReturnValue({
        dateRange: { preset: 'custom', startDate: null, endDate: null },
        setDateRangePreset: mockSetDateRangePreset,
        setCustomDateRange: mockSetCustomDateRange,
        resetDateRange: mockResetDateRange,
      });

      render(<DateRangeFilter />);

      const startInput = screen.getByLabelText('Start date');
      const endInput = screen.getByLabelText('End date');

      expect(startInput).toHaveClass('min-h-[44px]');
      expect(endInput).toHaveClass('min-h-[44px]');
    });
  });

  describe('Component integration', () => {
    it('handles full workflow: preset -> custom -> clear', async () => {
      const user = userEvent.setup();

      // Start with all_time
      // @ts-expect-error - Mocking Zustand store
      vi.mocked(useReportPreferencesStore).mockReturnValue({
        dateRange: { preset: 'all_time', startDate: null, endDate: null },
        setDateRangePreset: mockSetDateRangePreset,
        setCustomDateRange: mockSetCustomDateRange,
        resetDateRange: mockResetDateRange,
      });

      const { rerender } = render(<DateRangeFilter />);

      // No clear button initially
      expect(
        screen.queryByRole('button', { name: /clear date range filter/i })
      ).not.toBeInTheDocument();

      // Select "Last 30 Days"
      const selectTrigger = screen.getByRole('combobox', {
        name: /select date range preset/i,
      });
      await user.click(selectTrigger);
      await user.click(screen.getByRole('option', { name: 'Last 30 Days' }));

      expect(mockSetDateRangePreset).toHaveBeenCalledWith('last_30_days');

      // Update mock to reflect new state
      // @ts-expect-error - Mocking Zustand store
      vi.mocked(useReportPreferencesStore).mockReturnValue({
        dateRange: { preset: 'last_30_days', startDate: null, endDate: null },
        setDateRangePreset: mockSetDateRangePreset,
        setCustomDateRange: mockSetCustomDateRange,
        resetDateRange: mockResetDateRange,
      });

      rerender(<DateRangeFilter />);

      // Clear button should now appear
      const clearButton = screen.getByRole('button', { name: /clear date range filter/i });
      expect(clearButton).toBeInTheDocument();

      // Click clear button
      await user.click(clearButton);
      expect(mockResetDateRange).toHaveBeenCalled();
    });

    it('transitions from preset to custom shows date inputs', async () => {
      const user = userEvent.setup();

      // Start with last_7_days
      // @ts-expect-error - Mocking Zustand store
      vi.mocked(useReportPreferencesStore).mockReturnValue({
        dateRange: { preset: 'last_7_days', startDate: null, endDate: null },
        setDateRangePreset: mockSetDateRangePreset,
        setCustomDateRange: mockSetCustomDateRange,
        resetDateRange: mockResetDateRange,
      });

      const { rerender } = render(<DateRangeFilter />);

      // Date inputs should not be visible
      expect(screen.queryByLabelText('Start date')).not.toBeInTheDocument();

      // Select "Custom Range"
      const selectTrigger = screen.getByRole('combobox', {
        name: /select date range preset/i,
      });
      await user.click(selectTrigger);
      await user.click(screen.getByRole('option', { name: 'Custom Range' }));

      expect(mockSetDateRangePreset).toHaveBeenCalledWith('custom');

      // Update mock to reflect new state
      // @ts-expect-error - Mocking Zustand store
      vi.mocked(useReportPreferencesStore).mockReturnValue({
        dateRange: { preset: 'custom', startDate: null, endDate: null },
        setDateRangePreset: mockSetDateRangePreset,
        setCustomDateRange: mockSetCustomDateRange,
        resetDateRange: mockResetDateRange,
      });

      rerender(<DateRangeFilter />);

      // Date inputs should now be visible
      expect(screen.getByLabelText('Start date')).toBeInTheDocument();
      expect(screen.getByLabelText('End date')).toBeInTheDocument();
    });
  });
});

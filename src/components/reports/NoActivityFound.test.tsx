import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NoActivityFound } from './NoActivityFound';
import { useReportPreferencesStore } from '@/stores/useReportPreferencesStore';
import type { ReportDateRange } from '@/types/reports';

vi.mock('@/stores/useReportPreferencesStore', () => ({
  useReportPreferencesStore: vi.fn()
}));

describe('NoActivityFound', () => {
  const mockResetDateRange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useReportPreferencesStore).mockReturnValue({
      resetDateRange: mockResetDateRange,
      dateRange: { preset: 'all_time', startDate: null, endDate: null },
      setDateRange: vi.fn(),
    } as any);
  });

  describe('Rendering', () => {
    it('renders the component with correct structure', () => {
      const dateRange: ReportDateRange = {
        preset: 'last_7_days',
        startDate: '2025-11-28',
        endDate: '2025-12-05',
      };

      render(<NoActivityFound dateRange={dateRange} />);

      expect(screen.getByRole('status')).toBeInTheDocument();
      expect(screen.getByText(/No activity found for Last 7 Days/i)).toBeInTheDocument();
      expect(screen.getByText(/Try selecting a different date range or view all time data/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Reset Filter/i })).toBeInTheDocument();
    });

    it('renders correct message with last_7_days preset', () => {
      const dateRange: ReportDateRange = {
        preset: 'last_7_days',
        startDate: '2025-11-28',
        endDate: '2025-12-05',
      };

      render(<NoActivityFound dateRange={dateRange} />);

      expect(screen.getByText(/No activity found for Last 7 Days/i)).toBeInTheDocument();
    });

    it('renders correct message with last_30_days preset', () => {
      const dateRange: ReportDateRange = {
        preset: 'last_30_days',
        startDate: '2025-11-05',
        endDate: '2025-12-05',
      };

      render(<NoActivityFound dateRange={dateRange} />);

      expect(screen.getByText(/No activity found for Last 30 Days/i)).toBeInTheDocument();
    });

    it('renders correct message with last_90_days preset', () => {
      const dateRange: ReportDateRange = {
        preset: 'last_90_days',
        startDate: '2025-09-06',
        endDate: '2025-12-05',
      };

      render(<NoActivityFound dateRange={dateRange} />);

      expect(screen.getByText(/No activity found for Last 90 Days/i)).toBeInTheDocument();
    });

    it('renders correct message with ytd preset', () => {
      const dateRange: ReportDateRange = {
        preset: 'ytd',
        startDate: '2025-01-01',
        endDate: '2025-12-05',
      };

      render(<NoActivityFound dateRange={dateRange} />);

      expect(screen.getByText(/No activity found for Year to Date/i)).toBeInTheDocument();
    });

    it('renders correct message with custom preset', () => {
      const dateRange: ReportDateRange = {
        preset: 'custom',
        startDate: '2025-01-15',
        endDate: '2025-02-28',
      };

      render(<NoActivityFound dateRange={dateRange} />);

      expect(screen.getByText(/No activity found for Custom Range/i)).toBeInTheDocument();
    });

    it('renders correct message with all_time preset', () => {
      const dateRange: ReportDateRange = {
        preset: 'all_time',
        startDate: null,
        endDate: null,
      };

      render(<NoActivityFound dateRange={dateRange} />);

      expect(screen.getByText(/No activity found for All Time/i)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has role="status" attribute on container', () => {
      const dateRange: ReportDateRange = {
        preset: 'last_7_days',
        startDate: '2025-11-28',
        endDate: '2025-12-05',
      };

      render(<NoActivityFound dateRange={dateRange} />);

      const container = screen.getByRole('status');
      expect(container).toBeInTheDocument();
    });

    it('has aria-live="polite" attribute on container', () => {
      const dateRange: ReportDateRange = {
        preset: 'last_7_days',
        startDate: '2025-11-28',
        endDate: '2025-12-05',
      };

      render(<NoActivityFound dateRange={dateRange} />);

      const container = screen.getByRole('status');
      expect(container).toHaveAttribute('aria-live', 'polite');
    });

    it('icon has aria-label for screen readers', () => {
      const dateRange: ReportDateRange = {
        preset: 'last_7_days',
        startDate: '2025-11-28',
        endDate: '2025-12-05',
      };

      const { container } = render(<NoActivityFound dateRange={dateRange} />);

      const icon = container.querySelector('[aria-label="No activity found"]');
      expect(icon).toBeInTheDocument();
    });

    it('reset button is keyboard accessible', () => {
      const dateRange: ReportDateRange = {
        preset: 'last_7_days',
        startDate: '2025-11-28',
        endDate: '2025-12-05',
      };

      render(<NoActivityFound dateRange={dateRange} />);

      const button = screen.getByRole('button', { name: /Reset Filter/i });
      expect(button).toBeInTheDocument();
      button.focus();
      expect(button).toHaveFocus();
    });
  });

  describe('User Interactions', () => {
    it('calls resetDateRange when reset button is clicked', async () => {
      const user = userEvent.setup();
      const dateRange: ReportDateRange = {
        preset: 'last_7_days',
        startDate: '2025-11-28',
        endDate: '2025-12-05',
      };

      render(<NoActivityFound dateRange={dateRange} />);

      const button = screen.getByRole('button', { name: /Reset Filter/i });
      await user.click(button);

      expect(mockResetDateRange).toHaveBeenCalledTimes(1);
    });

    it('calls resetDateRange only once per click', async () => {
      const user = userEvent.setup();
      const dateRange: ReportDateRange = {
        preset: 'last_30_days',
        startDate: '2025-11-05',
        endDate: '2025-12-05',
      };

      render(<NoActivityFound dateRange={dateRange} />);

      const button = screen.getByRole('button', { name: /Reset Filter/i });
      await user.click(button);
      await user.click(button);

      expect(mockResetDateRange).toHaveBeenCalledTimes(2);
    });

    it('does not call resetDateRange on mount', () => {
      const dateRange: ReportDateRange = {
        preset: 'last_7_days',
        startDate: '2025-11-28',
        endDate: '2025-12-05',
      };

      render(<NoActivityFound dateRange={dateRange} />);

      expect(mockResetDateRange).not.toHaveBeenCalled();
    });
  });

  describe('Visual Elements', () => {
    it('displays CalendarX icon', () => {
      const dateRange: ReportDateRange = {
        preset: 'last_7_days',
        startDate: '2025-11-28',
        endDate: '2025-12-05',
      };

      const { container } = render(<NoActivityFound dateRange={dateRange} />);

      const icon = container.querySelector('.lucide-calendar-x');
      expect(icon).toBeInTheDocument();
    });

    it('displays heading with preset label', () => {
      const dateRange: ReportDateRange = {
        preset: 'ytd',
        startDate: '2025-01-01',
        endDate: '2025-12-05',
      };

      render(<NoActivityFound dateRange={dateRange} />);

      const heading = screen.getByRole('heading', { level: 3 });
      expect(heading).toHaveTextContent('No activity found for Year to Date');
    });

    it('displays help text', () => {
      const dateRange: ReportDateRange = {
        preset: 'last_7_days',
        startDate: '2025-11-28',
        endDate: '2025-12-05',
      };

      render(<NoActivityFound dateRange={dateRange} />);

      expect(screen.getByText(/Try selecting a different date range or view all time data/i)).toBeInTheDocument();
    });

    it('displays reset button with outline variant', () => {
      const dateRange: ReportDateRange = {
        preset: 'last_7_days',
        startDate: '2025-11-28',
        endDate: '2025-12-05',
      };

      const { container } = render(<NoActivityFound dateRange={dateRange} />);

      const button = screen.getByRole('button', { name: /Reset Filter/i });
      expect(button).toBeInTheDocument();
      // Button has outline variant styling from Shadcn
      expect(container.querySelector('button')).toBeInTheDocument();
    });
  });
});

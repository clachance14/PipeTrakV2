import { CalendarX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useReportPreferencesStore } from '@/stores/useReportPreferencesStore';
import { DATE_RANGE_PRESET_LABELS, type ReportDateRange } from '@/types/reports';

export interface NoActivityFoundProps {
  dateRange: ReportDateRange;
}

/**
 * Empty state for reports with no activity in the selected date range
 *
 * Displays when a date filter is active but no progress changes occurred.
 * Shows the selected date range preset and offers a reset button to view all time data.
 *
 * Feature 033: Timeline Report Filter
 */
export function NoActivityFound({ dateRange }: NoActivityFoundProps) {
  const { resetDateRange } = useReportPreferencesStore();
  const presetLabel = DATE_RANGE_PRESET_LABELS[dateRange.preset];

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-col items-center justify-center py-12 text-center"
    >
      <CalendarX className="h-12 w-12 text-muted-foreground mb-4" aria-label="No activity found" />
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        No activity found for {presetLabel}
      </h3>
      <p className="text-sm text-muted-foreground mb-6 max-w-md">
        Try selecting a different date range or view all time data
      </p>
      <Button variant="outline" onClick={resetDateRange}>
        Reset Filter
      </Button>
    </div>
  );
}

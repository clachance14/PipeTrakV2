/**
 * Error Report Download Button
 * Allows users to download error report as CSV
 */

import type { ImportError } from '@/schemas/import';

interface ErrorReportDownloadProps {
  errors: ImportError[];
}

export function ErrorReportDownload({ errors }: ErrorReportDownloadProps) {
  const downloadErrorReport = () => {
    // Generate CSV content
    const header = 'Row,Column,Reason\n';
    const rows = errors.map(e =>
      `${e.row},"${e.column}","${e.reason.replace(/"/g, '""')}"`
    ).join('\n');

    const csvContent = header + rows;

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `import-errors-${new Date().toISOString()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <button
      onClick={downloadErrorReport}
      className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
    >
      Download Error Report
    </button>
  );
}

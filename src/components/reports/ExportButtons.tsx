/**
 * ExportButtons Component (Feature 019 - T036)
 * Button group for exporting reports to PDF, Excel, and CSV formats
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileDown } from 'lucide-react';
import type { ReportData } from '@/types/reports';

interface ExportButtonsProps {
  reportData: ReportData;
  projectName: string;
  disabled?: boolean;
  onExportPDF?: (reportData: ReportData, projectName: string) => void | Promise<void>;
  onExportExcel?: (reportData: ReportData, projectName: string) => void | Promise<void>;
  onExportCSV?: (reportData: ReportData, projectName: string) => void | Promise<void>;
}

export function ExportButtons({
  reportData,
  projectName,
  disabled = false,
  onExportPDF,
  onExportExcel,
  onExportCSV,
}: ExportButtonsProps) {
  const [loadingPDF, setLoadingPDF] = useState(false);
  const [loadingExcel, setLoadingExcel] = useState(false);
  const [loadingCSV, setLoadingCSV] = useState(false);

  const handleExportPDF = async () => {
    if (!onExportPDF || disabled || loadingPDF) return;

    setLoadingPDF(true);
    try {
      await onExportPDF(reportData, projectName);
    } catch (error) {
      console.error('PDF export failed:', error);
    } finally {
      setLoadingPDF(false);
    }
  };

  const handleExportExcel = async () => {
    if (!onExportExcel || disabled || loadingExcel) return;

    setLoadingExcel(true);
    try {
      await onExportExcel(reportData, projectName);
    } catch (error) {
      console.error('Excel export failed:', error);
    } finally {
      setLoadingExcel(false);
    }
  };

  const handleExportCSV = async () => {
    if (!onExportCSV || disabled || loadingCSV) return;

    setLoadingCSV(true);
    try {
      await onExportCSV(reportData, projectName);
    } catch (error) {
      console.error('CSV export failed:', error);
    } finally {
      setLoadingCSV(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-2 w-full lg:w-auto">
      <Button
        variant="outline"
        onClick={handleExportPDF}
        disabled={disabled || !onExportPDF || loadingPDF}
        aria-label="Export PDF"
        className="w-full lg:w-auto min-h-[44px]"
      >
        <FileDown className="w-4 h-4 mr-2" />
        {loadingPDF ? 'Exporting...' : 'Export PDF'}
      </Button>

      <Button
        variant="outline"
        onClick={handleExportExcel}
        disabled={disabled || !onExportExcel || loadingExcel}
        aria-label="Export Excel"
        className="w-full lg:w-auto min-h-[44px]"
      >
        <FileDown className="w-4 h-4 mr-2" />
        {loadingExcel ? 'Exporting...' : 'Export Excel'}
      </Button>

      <Button
        variant="outline"
        onClick={handleExportCSV}
        disabled={disabled || !onExportCSV || loadingCSV}
        aria-label="Export CSV"
        className="w-full lg:w-auto min-h-[44px]"
      >
        <FileDown className="w-4 h-4 mr-2" />
        {loadingCSV ? 'Exporting...' : 'Export CSV'}
      </Button>
    </div>
  );
}

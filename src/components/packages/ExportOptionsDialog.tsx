/**
 * ExportOptionsDialog Component
 * Feature 030: Enhanced Package Completion Report PDF
 *
 * Dialog for selecting PDF export options before generating the report.
 * Allows users to choose detail level (summary vs full weld log).
 * Includes warning for large packages (>500 welds).
 *
 * @example
 * ```tsx
 * <ExportOptionsDialog
 *   open={dialogOpen}
 *   onOpenChange={setDialogOpen}
 *   onExport={handleExport}
 *   onPreview={handlePreview}
 *   weldCount={reportData.overall_nde_summary.total_welds}
 *   isGenerating={isGenerating}
 * />
 * ```
 */

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { AlertTriangle, FileDown, Eye, Loader2 } from 'lucide-react';
import type { PackageExportOptions } from '@/hooks/usePackageCompletionPDFExport';

interface ExportOptionsDialogProps {
  /** Whether dialog is open */
  open: boolean;

  /** Callback when dialog open state changes */
  onOpenChange: (open: boolean) => void;

  /** Callback when user clicks Export */
  onExport: (options: PackageExportOptions) => void;

  /** Callback when user clicks Preview */
  onPreview: (options: PackageExportOptions) => void;

  /** Total weld count for large package warning */
  weldCount: number;

  /** Whether PDF is being generated */
  isGenerating?: boolean;

  /** Drawing count for extreme package warning */
  drawingCount?: number;
}

/** Threshold for showing large package warning */
const LARGE_PACKAGE_WELD_THRESHOLD = 500;

/** Threshold for forcing summary-only mode */
const EXTREME_PACKAGE_DRAWING_THRESHOLD = 100;

export function ExportOptionsDialog({
  open,
  onOpenChange,
  onExport,
  onPreview,
  weldCount,
  isGenerating = false,
  drawingCount = 0,
}: ExportOptionsDialogProps) {
  const [includeWeldDetails, setIncludeWeldDetails] = useState<'summary' | 'full'>('summary');

  // Force summary-only for extreme packages
  const forcesSummary = drawingCount > EXTREME_PACKAGE_DRAWING_THRESHOLD;
  const isLargePackage = weldCount > LARGE_PACKAGE_WELD_THRESHOLD;

  const handleExport = () => {
    onExport({
      includeWeldDetails: forcesSummary ? false : includeWeldDetails === 'full',
    });
  };

  const handlePreview = () => {
    onPreview({
      includeWeldDetails: forcesSummary ? false : includeWeldDetails === 'full',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Export Package Report</DialogTitle>
          <DialogDescription>
            Choose the detail level for your PDF export.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {/* Detail Level Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Detail Level</Label>
            <RadioGroup
              value={forcesSummary ? 'summary' : includeWeldDetails}
              onValueChange={(value) => setIncludeWeldDetails(value as 'summary' | 'full')}
              className="space-y-3"
              disabled={forcesSummary}
            >
              <div className="flex items-start space-x-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                <RadioGroupItem value="summary" id="summary" className="mt-1" />
                <div className="space-y-1">
                  <Label htmlFor="summary" className="font-medium cursor-pointer">
                    Summary only
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    NDE counts per drawing (pass/fail/pending). Smaller file size.
                  </p>
                </div>
              </div>

              <div
                className={`flex items-start space-x-3 p-3 rounded-lg border bg-card transition-colors ${
                  forcesSummary ? 'opacity-50' : 'hover:bg-accent/50'
                }`}
              >
                <RadioGroupItem
                  value="full"
                  id="full"
                  className="mt-1"
                  disabled={forcesSummary}
                />
                <div className="space-y-1">
                  <Label
                    htmlFor="full"
                    className={`font-medium ${forcesSummary ? '' : 'cursor-pointer'}`}
                  >
                    Include weld details
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Full weld log with welder, date, NDE result. Larger file size.
                  </p>
                  {forcesSummary && (
                    <p className="text-xs text-yellow-600 dark:text-yellow-500">
                      Disabled for packages with &gt;100 drawings.
                    </p>
                  )}
                </div>
              </div>
            </RadioGroup>
          </div>

          {/* Large Package Warning */}
          {isLargePackage && includeWeldDetails === 'full' && !forcesSummary && (
            <div className="p-3 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-900 rounded-md">
              <div className="flex gap-2">
                <AlertTriangle className="w-4 h-4 text-yellow-600 dark:text-yellow-500 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                    Large Package Warning
                  </p>
                  <p className="text-xs text-yellow-700 dark:text-yellow-300">
                    This package has {weldCount.toLocaleString()} welds. Export with full weld
                    details may take 30+ seconds and create a large file.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Weld Count Info */}
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Total welds:</span>
            <span className="font-medium">{weldCount.toLocaleString()}</span>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isGenerating}>
            Cancel
          </Button>
          <Button variant="outline" onClick={handlePreview} disabled={isGenerating}>
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Eye className="w-4 h-4 mr-2" />
                Preview
              </>
            )}
          </Button>
          <Button onClick={handleExport} disabled={isGenerating}>
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <FileDown className="w-4 h-4 mr-2" />
                Export PDF
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

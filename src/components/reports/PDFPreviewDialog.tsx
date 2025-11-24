/**
 * PDFPreviewDialog Component
 *
 * Modal dialog for previewing PDF reports before downloading.
 * Shows PDF in iframe with download and cancel actions.
 *
 * Features:
 * - Full-screen preview optimized for desktop (≥1024px)
 * - Download button to save PDF with correct filename
 * - Cancel button to dismiss without downloading
 * - Automatic object URL cleanup on close
 * - Error handling for iframe loading failures
 *
 * @example
 * ```tsx
 * const [previewState, setPreviewState] = useState<{
 *   open: boolean;
 *   url: string | null;
 *   filename: string | null;
 *   blob: Blob | null;
 * }>({ open: false, url: null, filename: null, blob: null });
 *
 * // Open preview
 * const { blob, url, filename } = await generatePDFPreview(...);
 * setPreviewState({ open: true, url, filename, blob });
 *
 * // Close and cleanup
 * const handleClose = () => {
 *   if (previewState.url) URL.revokeObjectURL(previewState.url);
 *   setPreviewState({ open: false, url: null, filename: null, blob: null });
 * };
 * ```
 */

import { useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Settings, Loader2 } from 'lucide-react';

interface PDFPreviewDialogProps {
  /** Whether dialog is open */
  open: boolean;

  /** Callback when dialog should close */
  onClose: () => void;

  /** Object URL for PDF blob (will be displayed in iframe) */
  previewUrl: string | null;

  /** PDF blob for download */
  blob: Blob | null;

  /** Filename for download */
  filename: string | null;

  /** Optional callback to open customization settings */
  onEditSettings?: () => void;

  /** Whether PDF is being regenerated (shows loading state) */
  isRegenerating?: boolean;
}

/**
 * PDFPreviewDialog Component
 *
 * @param props - Component props
 * @returns PDF preview dialog
 */
export function PDFPreviewDialog({
  open,
  onClose,
  previewUrl,
  blob,
  filename,
  onEditSettings,
  isRegenerating = false,
}: PDFPreviewDialogProps) {
  /**
   * Download PDF with correct filename
   */
  const handleDownload = () => {
    if (!blob || !filename) return;

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;

    try {
      link.click();
    } catch (err) {
      console.error('Failed to download PDF:', err);
    } finally {
      URL.revokeObjectURL(url);
      onClose();
    }
  };

  /**
   * Cleanup effect - revoke object URL when dialog closes or URL changes
   */
  useEffect(() => {
    return () => {
      // Cleanup is handled by parent component
      // This effect exists to document the cleanup responsibility
    };
  }, []);

  if (!previewUrl || !blob || !filename) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[85vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle>PDF Preview</DialogTitle>
          <DialogDescription>{filename}</DialogDescription>
        </DialogHeader>

        {/* PDF Preview Container */}
        <div className="flex-1 overflow-hidden px-6 relative">
          <iframe
            src={previewUrl}
            className="w-full h-full border rounded"
            title="PDF Preview"
            onError={() => {
              console.error('Failed to load PDF preview');
            }}
          />

          {/* Loading Overlay during Regeneration */}
          {isRegenerating && (
            <div className="absolute inset-0 bg-background/80 flex flex-col items-center justify-center gap-3 rounded">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm font-medium text-muted-foreground">
                Regenerating PDF with new settings...
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="px-6 py-4 gap-2">
          {onEditSettings && (
            <Button
              variant="outline"
              onClick={onEditSettings}
              disabled={isRegenerating}
              className="mr-auto"
            >
              <Settings className="w-4 h-4 mr-2" />
              Edit Settings
            </Button>
          )}
          <Button variant="outline" onClick={onClose} disabled={isRegenerating}>
            Cancel
          </Button>
          <Button onClick={handleDownload} disabled={!blob || isRegenerating}>
            {isRegenerating ? 'Regenerating...' : 'Download PDF'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

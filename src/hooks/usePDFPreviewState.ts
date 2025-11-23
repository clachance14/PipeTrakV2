/**
 * usePDFPreviewState Hook
 *
 * Encapsulates PDF preview dialog state management and cleanup logic.
 * Eliminates 30-40 lines of boilerplate per page that uses PDF previews.
 *
 * Key Features:
 * - Manages preview dialog open/closed state
 * - Stores blob, URL, and filename for download
 * - Automatically cleans up object URLs on close
 * - Automatically cleans up object URLs on unmount
 * - Provides simple API for opening and closing preview
 *
 * Benefits:
 * - Consistent preview state pattern across all pages
 * - Guaranteed cleanup behavior (no memory leaks)
 * - Single source of truth for preview state management
 * - Reduces code duplication
 *
 * @example
 * ```tsx
 * function ReportsPage() {
 *   const { previewState, openPreview, closePreview } = usePDFPreviewState();
 *   const { generatePDFPreview, isGenerating } = useFieldWeldPDFExport();
 *
 *   const handleExport = async () => {
 *     try {
 *       const { blob, url, filename } = await generatePDFPreview(data, projectName);
 *       openPreview(blob, url, filename);
 *     } catch (err) {
 *       toast.error('Failed to generate PDF');
 *     }
 *   };
 *
 *   return (
 *     <>
 *       <Button onClick={handleExport} disabled={isGenerating}>
 *         Preview & Export PDF
 *       </Button>
 *       <PDFPreviewDialog
 *         open={previewState.open}
 *         onClose={closePreview}
 *         previewUrl={previewState.url}
 *         blob={previewState.blob}
 *         filename={previewState.filename}
 *       />
 *     </>
 *   );
 * }
 * ```
 */

import { useState, useEffect } from 'react';

/**
 * Preview state object
 */
interface PreviewState {
  /** Whether the preview dialog is open */
  open: boolean;
  /** Object URL for the PDF blob (for iframe display) */
  url: string | null;
  /** Filename for download */
  filename: string | null;
  /** PDF blob for download */
  blob: Blob | null;
}

/**
 * Return type for usePDFPreviewState hook
 */
export interface UsePDFPreviewStateReturn {
  /** Current preview state */
  previewState: PreviewState;

  /**
   * Open the preview dialog with PDF data
   *
   * @param blob - PDF blob for download
   * @param url - Object URL for iframe display (created from blob)
   * @param filename - Filename for download
   */
  openPreview: (blob: Blob, url: string, filename: string) => void;

  /**
   * Update the preview with new PDF data without closing the dialog
   * Useful for regenerating PDF with new settings while preview is open
   *
   * @param blob - New PDF blob for download
   * @param url - New object URL for iframe display (created from blob)
   * @param filename - New filename for download
   */
  updatePreview: (blob: Blob, url: string, filename: string) => void;

  /**
   * Close the preview dialog and cleanup object URL
   * Automatically revokes the object URL to prevent memory leaks
   */
  closePreview: () => void;
}

/**
 * usePDFPreviewState Hook
 *
 * Manages PDF preview dialog state with automatic cleanup.
 *
 * @returns {UsePDFPreviewStateReturn} Hook API with preview state and control functions
 */
export function usePDFPreviewState(): UsePDFPreviewStateReturn {
  const [previewState, setPreviewState] = useState<PreviewState>({
    open: false,
    url: null,
    filename: null,
    blob: null,
  });

  /**
   * Open preview dialog with PDF data
   */
  const openPreview = (blob: Blob, url: string, filename: string) => {
    setPreviewState({
      open: true,
      url,
      filename,
      blob,
    });
  };

  /**
   * Update preview with new PDF data (keeps dialog open)
   * Cleans up old object URL before replacing
   */
  const updatePreview = (blob: Blob, url: string, filename: string) => {
    // Clean up old object URL
    if (previewState.url) {
      URL.revokeObjectURL(previewState.url);
    }

    // Update state with new PDF data (keep dialog open)
    setPreviewState({
      open: true, // Keep dialog open
      url,
      filename,
      blob,
    });
  };

  /**
   * Close preview dialog and cleanup object URL
   */
  const closePreview = () => {
    // Revoke object URL to free memory
    if (previewState.url) {
      URL.revokeObjectURL(previewState.url);
    }

    // Reset state
    setPreviewState({
      open: false,
      url: null,
      filename: null,
      blob: null,
    });
  };

  /**
   * Cleanup effect - revoke object URL on unmount
   * Prevents memory leaks if component unmounts with open preview
   */
  useEffect(() => {
    return () => {
      if (previewState.url) {
        URL.revokeObjectURL(previewState.url);
      }
    };
  }, [previewState.url]);

  return {
    previewState,
    openPreview,
    updatePreview,
    closePreview,
  };
}

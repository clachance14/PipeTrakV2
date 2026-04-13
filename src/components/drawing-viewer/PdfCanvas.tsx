/**
 * PdfCanvas Component
 * Renders a PDF file with zoom, pan, and page navigation using pdf.js.
 * Simplified from TakeOffTrak's PdfCanvas — no overlays, no render workers.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import { pdfjsLib } from '@/lib/pdf-worker';
import type { PDFDocumentProxy } from 'pdfjs-dist';

interface PdfCanvasProps {
  fileUrl: string;
  currentPage: number;
  onPageChange: (page: number) => void;
  onPageCountChange: (count: number) => void;
  zoom?: number;
  onZoomChange?: (zoom: number) => void;
}

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 10.0;
const WHEEL_ZOOM_STEP = 1.15;

export function PdfCanvas({
  fileUrl,
  currentPage,
  onPageChange,
  onPageCountChange,
  zoom: externalZoom,
  onZoomChange,
}: PdfCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nativeDims, setNativeDims] = useState({ width: 0, height: 0 });

  // Internal zoom if not controlled externally
  const [internalZoom, setInternalZoom] = useState(1);
  const zoom = externalZoom ?? internalZoom;
  const setZoom = useCallback(
    (z: number) => {
      const clamped = Math.max(MIN_ZOOM, Math.min(z, MAX_ZOOM));
      if (onZoomChange) {
        onZoomChange(clamped);
      } else {
        setInternalZoom(clamped);
      }
    },
    [onZoomChange],
  );

  // Pan state
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const panStartRef = useRef({ x: 0, y: 0 });

  // Refs for wheel handler
  const zoomRef = useRef(zoom);
  const panRef = useRef(panOffset);
  const setZoomRef = useRef(setZoom);
  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);
  useEffect(() => {
    panRef.current = panOffset;
  }, [panOffset]);
  useEffect(() => {
    setZoomRef.current = setZoom;
  }, [setZoom]);

  // Render task ref for cancellation
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const renderTaskRef = useRef<any>(null);

  // Load PDF document
  useEffect(() => {
    if (!fileUrl) return;

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    const loadingTask = pdfjsLib.getDocument(fileUrl);

    loadingTask.promise
      .then((doc) => {
        if (cancelled) return;
        setPdfDoc(doc);
        onPageCountChange(doc.numPages);

        // Fit to container on first load
        doc.getPage(1).then((page) => {
          if (cancelled) return;
          const viewport = page.getViewport({ scale: 1.0 });
          setNativeDims({ width: viewport.width, height: viewport.height });

          const container = containerRef.current;
          if (container) {
            const rect = container.getBoundingClientRect();
            const fitZoom =
              Math.min(rect.width / viewport.width, rect.height / viewport.height) * 0.95;
            const clamped = Math.max(MIN_ZOOM, Math.min(fitZoom, MAX_ZOOM));
            setZoom(clamped);
            setPanOffset({
              x: (rect.width - viewport.width * clamped) / 2,
              y: (rect.height - viewport.height * clamped) / 2,
            });
          }

          setIsLoading(false);
        });
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load PDF');
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
      loadingTask.destroy();
    };
  // onPageCountChange and setZoom are stable
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileUrl]);

  // Render current page
  useEffect(() => {
    if (!pdfDoc || !canvasRef.current) return;

    let cancelled = false;

    async function renderPage() {
      try {
        if (renderTaskRef.current) {
          renderTaskRef.current.cancel();
          renderTaskRef.current = null;
        }

        const page = await pdfDoc!.getPage(currentPage);
        if (cancelled) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const dpr = window.devicePixelRatio || 1;
        const renderScale = zoom * dpr;
        const viewport = page.getViewport({ scale: renderScale });

        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const task = page.render({ canvasContext: ctx, viewport, canvas });
        renderTaskRef.current = task;
        await task.promise;
        renderTaskRef.current = null;

        if (cancelled) return;

        // Update native dims if page changed
        const nativeViewport = page.getViewport({ scale: 1.0 });
        setNativeDims({ width: nativeViewport.width, height: nativeViewport.height });
      } catch (err) {
        if ((err as Error)?.name === 'RenderingCancelledException') return;
        if (!cancelled) {
          console.error('PDF render error:', err);
        }
      }
    }

    renderPage();

    return () => {
      cancelled = true;
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
        renderTaskRef.current = null;
      }
    };
  }, [pdfDoc, currentPage, zoom]);

  // Reset pan when page changes
  useEffect(() => {
    const container = containerRef.current;
    if (!container || nativeDims.width === 0) return;

    const rect = container.getBoundingClientRect();
    setPanOffset({
      x: (rect.width - nativeDims.width * zoom) / 2,
      y: Math.max(0, (rect.height - nativeDims.height * zoom) / 2),
    });
    // Only reset on page change, not zoom
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);

  // Wheel zoom
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    function handleWheel(e: WheelEvent) {
      e.preventDefault();
      if (!container) return;

      const curZoom = zoomRef.current;
      const pan = panRef.current;

      const factor = e.ctrlKey
        ? Math.pow(WHEEL_ZOOM_STEP, -e.deltaY / 3)
        : e.deltaY > 0
          ? 1 / WHEEL_ZOOM_STEP
          : WHEEL_ZOOM_STEP;
      const newZoom = Math.min(Math.max(curZoom * factor, MIN_ZOOM), MAX_ZOOM);
      if (newZoom === curZoom) return;

      const ratio = newZoom / curZoom;
      const rect = container.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;

      setPanOffset({
        x: cx - ratio * (cx - pan.x),
        y: cy - ratio * (cy - pan.y),
      });
      setZoomRef.current(newZoom);
    }

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, []);

  // Pan handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0 && e.button !== 1) return;
    e.preventDefault();
    setIsPanning(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    panStartRef.current = { x: panRef.current.x, y: panRef.current.y };
  }, []);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isPanning) return;
      e.preventDefault();
      setPanOffset({
        x: panStartRef.current.x + (e.clientX - dragStartRef.current.x),
        y: panStartRef.current.y + (e.clientY - dragStartRef.current.y),
      });
    },
    [isPanning],
  );

  const handleMouseUp = useCallback(() => setIsPanning(false), []);

  // Keyboard page navigation
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (!pdfDoc) return;

      if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        e.preventDefault();
        onPageChange(Math.min(currentPage + 1, pdfDoc.numPages));
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        onPageChange(Math.max(currentPage - 1, 1));
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pdfDoc, currentPage, onPageChange]);

  return (
    <div
      ref={containerRef}
      data-testid="pdf-canvas-container"
      className="relative h-full w-full overflow-hidden bg-gray-200"
      style={{ cursor: isPanning ? 'grabbing' : 'grab' }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-200/80 z-10">
          <div className="flex items-center gap-2 text-gray-600">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Loading PDF...</span>
          </div>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className="flex flex-col items-center gap-2 text-red-600">
            <AlertCircle className="h-8 w-8" />
            <p className="text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* PDF canvas */}
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          left: panOffset.x,
          top: panOffset.y,
          width: nativeDims.width * zoom,
          height: nativeDims.height * zoom,
          display: 'block',
          userSelect: 'none',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        }}
      />
    </div>
  );
}

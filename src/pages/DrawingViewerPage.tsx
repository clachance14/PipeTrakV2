/**
 * DrawingViewerPage
 * Full-page layout showing a PDF drawing with a component milestone sidebar.
 * Desktop-only — accessible from drawing table PDF icon.
 * Route: /projects/:projectId/drawings/:drawingId/viewer
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { useDrawingsWithProgress } from '@/hooks/useDrawingsWithProgress';
import { useDrawingFile } from '@/hooks/useDrawingFile';
import { usePermissions } from '@/hooks/usePermissions';
import { useAuth } from '@/contexts/AuthContext';
import { useCreateManualComponent } from '@/hooks/useCreateManualComponent';
import { PdfCanvas } from '@/components/drawing-viewer/PdfCanvas';
import { DrawingComponentSidebar } from '@/components/drawing-viewer/DrawingComponentSidebar';
import { AddComponentModal } from '@/components/component-metadata/AddComponentModal';
import type { CreateManualComponentData } from '@/components/component-metadata/AddComponentModal';
import { Button } from '@/components/ui/button';

export function DrawingViewerPage() {
  const { projectId, drawingId } = useParams<{ projectId: string; drawingId: string }>();
  const navigate = useNavigate();

  const [currentPage, setCurrentPage] = useState(1);
  const [pageCount, setPageCount] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [initialPageSet, setInitialPageSet] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);

  const { canEditComponents } = usePermissions();
  const { user } = useAuth();
  const createMutation = useCreateManualComponent();

  const { data: drawings } = useDrawingsWithProgress(projectId ?? '');
  const drawing = drawings?.find((d) => d.id === drawingId);

  // Map PDF page numbers to drawing IDs for all drawings sharing the same file
  const pageMap = useMemo(() => {
    if (!drawing || !drawings) return new Map<number, string>();
    const map = new Map<number, string>();
    drawings
      .filter((d) => d.file_path === drawing.file_path && d.file_path !== null)
      .forEach((d) => {
        // Use source_page (original PDF page) if available, fall back to sheet_number
        const page = d.source_page ?? parseInt(d.sheet_number ?? '1', 10);
        if (!isNaN(page)) map.set(page, d.id);
      });
    return map;
  }, [drawings, drawing]);

  // The drawing record for the currently viewed page
  const activeDrawingId = pageMap.get(currentPage) ?? drawingId ?? '';
  const activeDrawing = drawings?.find((d) => d.id === activeDrawingId) ?? drawing;

  // Set initial page to the drawing's source page (original PDF page number)
  useEffect(() => {
    if (drawing && !initialPageSet) {
      const page = drawing.source_page ?? parseInt(drawing.sheet_number ?? '1', 10);
      if (!isNaN(page) && page >= 1) {
        setCurrentPage(page);
      }
      setInitialPageSet(true);
    }
  }, [drawing, initialPageSet]);

  const { data: fileData, isLoading: fileLoading, error: fileError } = useDrawingFile(
    drawing?.file_path ?? null,
  );

  const handleGoBack = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  const handleAddComponent = useCallback(async (data: CreateManualComponentData) => {
    if (!drawingId || !projectId || !user?.id) return;
    await createMutation.mutateAsync({
      drawing_id: drawingId,
      project_id: projectId,
      component_type: data.component_type,
      identity: { commodity_code: data.commodity_code, size: data.size, spool_id: data.spool_id, weld_number: data.weld_number },
      attributes: { description: data.description, quantity: data.quantity, total_linear_feet: data.total_linear_feet },
      user_id: user.id,
    });
    setAddModalOpen(false);
  }, [drawingId, projectId, user, createMutation]);

  const handleZoomIn = useCallback(() => {
    setZoom((z) => Math.min(z * 1.25, 10));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((z) => Math.max(z / 1.25, 0.1));
  }, []);

  // Build metadata chips for the second toolbar line
  const metadataChips = useMemo(() => {
    if (!activeDrawing) return [];
    const chips: { label: string; value: string }[] = [];
    if (activeDrawing.line_number) chips.push({ label: 'Line', value: activeDrawing.line_number });
    if (activeDrawing.area) chips.push({ label: 'Area', value: activeDrawing.area.name });
    if (activeDrawing.system) chips.push({ label: 'System', value: activeDrawing.system.name });
    if (activeDrawing.test_package) chips.push({ label: 'TP', value: activeDrawing.test_package.name });
    if (activeDrawing.spec) chips.push({ label: 'Spec', value: activeDrawing.spec });
    return chips;
  }, [activeDrawing]);

  if (!projectId || !drawingId) {
    return (
      <div className="flex items-center justify-center h-screen">
        <AlertCircle className="h-8 w-8 text-red-500 mr-2" />
        <span>Invalid URL parameters</span>
      </div>
    );
  }

  return (
    <div className="hidden lg:flex flex-col h-screen bg-gray-100">
      {/* Toolbar */}
      <div className="px-4 py-2 bg-white border-b shadow-sm">
        {/* Line 1: Back + drawing number + zoom + page nav */}
        <div className="flex items-center gap-3">
          {/* Back button */}
          <Button variant="ghost" size="sm" onClick={handleGoBack}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>

          {/* Drawing number + sheet */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-900 truncate">
                {activeDrawing?.drawing_no_raw ?? 'Loading...'}
              </span>
              {pageCount > 1 && (
                <span className="text-xs text-gray-500">Sheet {currentPage}</span>
              )}
            </div>
          </div>

          {/* Zoom controls */}
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={handleZoomOut}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-xs text-gray-600 w-12 text-center">
              {Math.round(zoom * 100)}%
            </span>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={handleZoomIn}>
              <ZoomIn className="h-4 w-4" />
            </Button>
          </div>

          {/* Page navigation */}
          {pageCount > 1 && (
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-xs text-gray-600 w-16 text-center">
                {currentPage} / {pageCount}
              </span>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                disabled={currentPage >= pageCount}
                onClick={() => setCurrentPage((p) => Math.min(p + 1, pageCount))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Line 2: Metadata (only if any chips exist) */}
        {metadataChips.length > 0 && (
          <div className="flex items-center gap-1 ml-[88px] mt-1 text-xs text-gray-500">
            {metadataChips.map((chip, i) => (
              <span key={chip.label} className="flex items-center gap-1">
                {i > 0 && <span className="text-gray-300">|</span>}
                <span>{chip.label}:</span>
                <span className="text-gray-700">{chip.value}</span>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Main content */}
      <div className="flex flex-1 min-h-0">
        {/* PDF Canvas */}
        <div className="flex-1 relative">
          {fileLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-200">
              <Loader2 className="h-6 w-6 text-gray-400 animate-spin" />
            </div>
          )}
          {fileError && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-200">
              <div className="text-center">
                <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
                <p className="text-sm text-gray-600">Failed to load PDF</p>
              </div>
            </div>
          )}
          {fileData?.signedUrl && (
            <PdfCanvas
              fileUrl={fileData.signedUrl}
              currentPage={currentPage}
              onPageChange={setCurrentPage}
              onPageCountChange={setPageCount}
              zoom={zoom}
              onZoomChange={setZoom}
            />
          )}
        </div>

        {/* Component Sidebar — switches with active page/sheet */}
        <div className="w-80 flex-shrink-0">
          <DrawingComponentSidebar
            drawingId={activeDrawingId}
            canEditComponents={canEditComponents}
            onAddComponent={() => setAddModalOpen(true)}
          />
        </div>
      </div>

      <AddComponentModal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onSubmit={handleAddComponent}
        isSubmitting={createMutation.isPending}
      />
    </div>
  );
}

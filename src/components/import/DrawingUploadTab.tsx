/**
 * DrawingUploadTab Component
 * Handles PDF drawing upload via drag-and-drop, uploads to Supabase Storage,
 * and triggers AI processing via the process-drawing edge function.
 * Multi-page PDFs are processed page-by-page (each page = one drawing).
 */

import { useCallback, useRef, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { FileText, Upload, AlertCircle, CheckCircle2, Loader2, ChevronDown, ChevronRight, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { pdfjsLib } from '@/lib/pdf-worker';
import { useProcessDrawing } from '@/hooks/useProcessDrawing';
import { Button } from '@/components/ui/button';

/** Max concurrent edge function calls for drawing processing */
const PROCESSING_CONCURRENCY = 5;
/** Max automatic retries for failed pages */
const MAX_PAGE_RETRIES = 2;
/** Delay (ms) before each retry round to avoid rate limits */
const RETRY_DELAY_MS = 5000;

interface DrawingUploadTabProps {
  projectId: string;
  onProcessingStarted?: () => void;
}

interface PageResult {
  page: number;
  status: 'success' | 'error' | 'retrying';
  componentsCreated: number;
  error?: string;
  retryCount?: number;
}

interface UploadedFile {
  fileName: string;
  filePath: string;
  status: 'uploading' | 'processing' | 'complete' | 'error';
  error?: string;
  componentsCreated?: number;
  /** For multi-page: current page being processed */
  currentPage?: number;
  /** For multi-page: total pages in the PDF */
  totalPages?: number;
  /** Per-page processing results */
  pageResults?: PageResult[];
}

export function DrawingUploadTab({ projectId, onProcessingStarted }: DrawingUploadTabProps) {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());
  const [isUploading, setIsUploading] = useState(false);
  const { mutateAsync: processDrawing } = useProcessDrawing();

  const updateFileStatus = useCallback(
    (filePath: string, update: Partial<UploadedFile>) => {
      setUploadedFiles((prev) =>
        prev.map((f) => (f.filePath === filePath ? { ...f, ...update } : f)),
      );
    },
    [],
  );

  // Track per-file page results for concurrent updates
  const pageResultsRef = useRef(new Map<string, PageResult[]>());

  /** Upsert a page result into the ref map and update UI */
  const upsertPageResult = useCallback(
    (filePath: string, pageResult: PageResult) => {
      const current = pageResultsRef.current.get(filePath) ?? [];
      const idx = current.findIndex((r) => r.page === pageResult.page);
      if (idx >= 0) {
        current[idx] = pageResult;
      } else {
        current.push(pageResult);
      }
      pageResultsRef.current.set(filePath, current);
      const sorted = [...current].sort((a, b) => a.page - b.page);
      updateFileStatus(filePath, { pageResults: sorted });
    },
    [updateFileStatus],
  );

  /**
   * Process a single page of a drawing. Called concurrently across files/pages.
   * Updates file status progressively as results come in.
   */
  const processPage = useCallback(
    async (_fileName: string, filePath: string, page: number, totalPages: number) => {
      try {
        const result = await processDrawing({
          projectId,
          filePath,
          pageNumber: totalPages > 1 ? page : undefined,
          totalPages: totalPages > 1 ? totalPages : undefined,
        });

        const existing = pageResultsRef.current.get(filePath)?.find((r) => r.page === page);
        const pageResult: PageResult = result.success
          ? { page, status: 'success', componentsCreated: result.componentsCreated, retryCount: existing?.retryCount }
          : { page, status: 'error', componentsCreated: 0, error: result.errors[0] || 'Failed', retryCount: existing?.retryCount };

        upsertPageResult(filePath, pageResult);
        return pageResult;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Processing failed';
        const existingOnErr = pageResultsRef.current.get(filePath)?.find((r) => r.page === page);
        const pageResult: PageResult = { page, status: 'error', componentsCreated: 0, error: msg, retryCount: existingOnErr?.retryCount };

        upsertPageResult(filePath, pageResult);
        return pageResult;
      }
    },
    [projectId, processDrawing, upsertPageResult],
  );

  /**
   * Finalize a file after all its pages have been processed.
   */
  const finalizeFile = useCallback(
    (fileName: string, filePath: string, totalPages: number) => {
      const results = pageResultsRef.current.get(filePath) ?? [];
      const totalComponentsCreated = results.reduce((sum, r) => sum + r.componentsCreated, 0);
      const errorCount = results.filter((r) => r.status === 'error').length;
      const sorted = [...results].sort((a, b) => a.page - b.page);

      if (errorCount === 0) {
        updateFileStatus(filePath, {
          status: 'complete',
          componentsCreated: totalComponentsCreated,
          currentPage: undefined,
          pageResults: sorted,
        });
        toast.success(`${fileName} processed`, {
          description: `${totalPages} sheet${totalPages !== 1 ? 's' : ''}, ${totalComponentsCreated} component${totalComponentsCreated !== 1 ? 's' : ''} created`,
        });
      } else if (totalComponentsCreated > 0) {
        updateFileStatus(filePath, {
          status: 'complete',
          componentsCreated: totalComponentsCreated,
          error: `${errorCount} page(s) had errors`,
          currentPage: undefined,
          pageResults: sorted,
        });
        toast.warning(`${fileName} partially processed`, {
          description: `${totalComponentsCreated} components created, ${errorCount} page(s) failed`,
        });
      } else {
        updateFileStatus(filePath, {
          status: 'error',
          error: sorted[0]?.error || 'Processing failed',
          currentPage: undefined,
          pageResults: sorted,
        });
        toast.error(`${fileName} processing failed`, {
          description: sorted[0]?.error || 'Unknown error',
        });
      }
    },
    [updateFileStatus],
  );

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0 || !projectId) return;

      setIsUploading(true);
      onProcessingStarted?.();

      // Step 1: Add ALL files to the UI list immediately
      const fileEntries = acceptedFiles.map((file) => ({
        file,
        filePath: `${projectId}/${file.name}`,
      }));

      setUploadedFiles((prev) => [
        ...prev,
        ...fileEntries.map(({ file, filePath }) => ({
          fileName: file.name,
          filePath,
          status: 'uploading' as const,
        })),
      ]);

      // Step 2: Upload all files (sequentially — storage is fast, no need to parallelize)
      interface PageTask {
        fileName: string;
        filePath: string;
        page: number;
        totalPages: number;
      }
      const pageTasks: PageTask[] = [];

      for (const { file, filePath } of fileEntries) {
        try {
          const arrayBuffer = await file.arrayBuffer();
          const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
          const pageCount = pdfDoc.numPages;
          pdfDoc.destroy();

          const { error: uploadError } = await supabase.storage
            .from('drawing-pdfs')
            .upload(filePath, file, { upsert: true, contentType: 'application/pdf' });

          if (uploadError) {
            updateFileStatus(filePath, { status: 'error', error: uploadError.message });
            toast.error(`Failed to upload ${file.name}`, { description: uploadError.message });
            continue;
          }

          // Initialize file for processing
          pageResultsRef.current.set(filePath, []);
          updateFileStatus(filePath, { status: 'processing', totalPages: pageCount, pageResults: [] });

          // Queue all pages for concurrent processing
          for (let page = 1; page <= pageCount; page++) {
            pageTasks.push({ fileName: file.name, filePath, page, totalPages: pageCount });
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Upload failed';
          updateFileStatus(filePath, { status: 'error', error: msg });
          toast.error(`Failed to upload ${file.name}`, { description: msg });
        }
      }

      // Step 3: Process all pages concurrently with a limit of PROCESSING_CONCURRENCY
      if (pageTasks.length > 0) {
        const executing = new Set<Promise<void>>();

        for (const task of pageTasks) {
          const p = processPage(task.fileName, task.filePath, task.page, task.totalPages)
            .then(() => { executing.delete(p); });
          executing.add(p);

          if (executing.size >= PROCESSING_CONCURRENCY) {
            await Promise.race(executing);
          }
        }

        // Wait for remaining tasks
        await Promise.all(executing);
      }

      // Step 4: Automatic retry of failed pages
      const processedFiles = new Set(pageTasks.map((t) => t.filePath));
      for (const filePath of processedFiles) {
        let retryRound = 0;
        while (retryRound < MAX_PAGE_RETRIES) {
          const results = pageResultsRef.current.get(filePath) ?? [];
          const failedPages = results.filter((r) => r.status === 'error');
          if (failedPages.length === 0) break;

          retryRound++;
          const failedTasks = failedPages
            .map((fp) => pageTasks.find((t) => t.filePath === filePath && t.page === fp.page))
            .filter((t): t is NonNullable<typeof t> => t != null);

          if (failedTasks.length === 0) break;

          // Mark failed pages as retrying in the UI
          const current = pageResultsRef.current.get(filePath) ?? [];
          for (const ft of failedTasks) {
            const idx = current.findIndex((r) => r.page === ft.page);
            if (idx >= 0) {
              const prev = current[idx]!;
              current[idx] = { page: prev.page, status: 'retrying', componentsCreated: 0, error: prev.error, retryCount: retryRound };
            }
          }
          pageResultsRef.current.set(filePath, current);
          const sorted = [...current].sort((a, b) => a.page - b.page);
          updateFileStatus(filePath, { pageResults: sorted });

          // Wait before retrying to let rate limits reset
          await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));

          // Retry failed pages sequentially to minimize rate limit risk
          for (const task of failedTasks) {
            await processPage(task.fileName, task.filePath, task.page, task.totalPages);
          }
        }
      }

      // Step 5: Finalize each file with summary toast
      for (const filePath of processedFiles) {
        const task = pageTasks.find((t) => t.filePath === filePath);
        if (task) {
          finalizeFile(task.fileName, filePath, task.totalPages);
        }
      }

      setIsUploading(false);
    },
    [projectId, processPage, finalizeFile, updateFileStatus, onProcessingStarted],
  );

  const completedCount = uploadedFiles.filter((f) => f.status === 'complete').length;
  const errorCount = uploadedFiles.filter((f) => f.status === 'error').length;
  const processingCount = uploadedFiles.filter(
    (f) => f.status === 'uploading' || f.status === 'processing',
  ).length;
  const totalComponents = uploadedFiles.reduce((sum, f) => sum + (f.componentsCreated ?? 0), 0);

  const isBusy = isUploading || processingCount > 0;

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    maxSize: 150 * 1024 * 1024, // 150MB
    disabled: isBusy || !projectId,
  });

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">Drawing Upload</h2>
        <p className="text-gray-600">
          Upload ISO drawing PDFs. AI will extract the title block and bill of materials to create
          tracked field components. Multi-sheet PDFs are processed page by page.
        </p>
      </div>

      {/* Drop zone */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          isDragActive
            ? 'border-blue-500 bg-blue-50'
            : isBusy
              ? 'border-gray-200 bg-gray-50 cursor-not-allowed'
              : 'border-gray-300 hover:border-gray-400'
        }`}
      >
        <input {...getInputProps()} />
        <Upload className="h-10 w-10 mx-auto mb-3 text-gray-400" />
        {isDragActive ? (
          <p className="text-lg text-blue-600">Drop PDF files here</p>
        ) : (
          <div>
            <p className="text-lg mb-2">Drag and drop PDF drawings, or click to select</p>
            <p className="text-sm text-gray-500">PDF files only, max 150 MB each</p>
          </div>
        )}
      </div>

      {/* Upload progress list */}
      {uploadedFiles.length > 0 && (
        <div className="mt-6 space-y-2">
          {/* File count header + summary */}
          <div className="flex items-center justify-between px-1 mb-3">
            <h3 className="text-sm font-semibold text-gray-900">
              {uploadedFiles.length} file{uploadedFiles.length !== 1 ? 's' : ''} uploaded
            </h3>
            <div className="flex items-center gap-3 text-xs text-gray-500">
              {completedCount > 0 && (
                <span className="text-green-700">
                  {completedCount} complete ({totalComponents} component{totalComponents !== 1 ? 's' : ''})
                </span>
              )}
              {processingCount > 0 && (
                <span className="text-blue-700">{processingCount} processing</span>
              )}
              {errorCount > 0 && <span className="text-red-700">{errorCount} failed</span>}
            </div>
          </div>

          {uploadedFiles.map((file, index) => {
            const hasMultiplePages = (file.totalPages ?? 0) > 1;
            const hasPageResults = (file.pageResults?.length ?? 0) > 0;
            const isExpanded = expandedFiles.has(file.filePath);
            const canExpand = hasMultiplePages && hasPageResults;

            return (
              <div key={file.filePath} className="bg-gray-50 rounded-md overflow-hidden">
                <div
                  className={`flex items-center gap-3 p-3 ${canExpand ? 'cursor-pointer hover:bg-gray-100' : ''}`}
                  onClick={() => {
                    if (!canExpand) return;
                    setExpandedFiles((prev) => {
                      const next = new Set(prev);
                      if (next.has(file.filePath)) next.delete(file.filePath);
                      else next.add(file.filePath);
                      return next;
                    });
                  }}
                >
                  <div className="flex items-center justify-center h-6 w-6 rounded-full bg-gray-200 text-xs font-medium text-gray-600 flex-shrink-0">
                    {index + 1}
                  </div>
                  <FileText className="h-5 w-5 text-gray-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{file.fileName}</p>
                    {file.status === 'uploading' && (
                      <p className="text-xs text-gray-500 mt-0.5">Uploading...</p>
                    )}
                    {file.status === 'processing' && hasMultiplePages && (
                      <p className="text-xs text-blue-600 mt-0.5">
                        Processing page {file.currentPage ?? '...'} of {file.totalPages}
                      </p>
                    )}
                    {file.status === 'processing' && !hasMultiplePages && (
                      <p className="text-xs text-blue-600 mt-0.5">Processing...</p>
                    )}
                    {file.status === 'error' && file.error && (
                      <p className="text-xs text-red-600 mt-0.5 truncate">{file.error}</p>
                    )}
                    {file.status === 'complete' && file.componentsCreated !== undefined && (
                      <p className="text-xs text-green-600 mt-0.5">
                        {hasMultiplePages ? `${file.totalPages} pages, ` : ''}
                        {file.componentsCreated} component{file.componentsCreated !== 1 ? 's' : ''}{' '}
                        created
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {(file.status === 'uploading' || file.status === 'processing') && (
                      <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
                    )}
                    {file.status === 'complete' && (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    )}
                    {file.status === 'error' && (
                      <AlertCircle className="h-5 w-5 text-red-500" />
                    )}
                    {canExpand && (
                      isExpanded
                        ? <ChevronDown className="h-4 w-4 text-gray-400" />
                        : <ChevronRight className="h-4 w-4 text-gray-400" />
                    )}
                  </div>
                </div>

                {/* Expanded page details */}
                {canExpand && isExpanded && file.pageResults && (
                  <div className="border-t border-gray-200 px-3 pb-3">
                    <div className="ml-11 mt-2 space-y-1">
                      {file.pageResults.map((pr) => (
                        <div key={pr.page} className="flex items-center gap-2 text-xs">
                          {pr.status === 'success' ? (
                            <CheckCircle2 className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                          ) : pr.status === 'retrying' ? (
                            <RotateCcw className="h-3.5 w-3.5 text-amber-500 animate-spin flex-shrink-0" />
                          ) : (
                            <AlertCircle className="h-3.5 w-3.5 text-red-500 flex-shrink-0" />
                          )}
                          <span className="text-gray-600">Page {pr.page}</span>
                          {pr.status === 'success' && (
                            <span className="text-green-600">
                              {pr.componentsCreated} component{pr.componentsCreated !== 1 ? 's' : ''}
                              {pr.retryCount ? ` (retry ${pr.retryCount})` : ''}
                            </span>
                          )}
                          {pr.status === 'retrying' && (
                            <span className="text-amber-600">
                              Retrying (attempt {pr.retryCount ?? 1} of {MAX_PAGE_RETRIES})...
                            </span>
                          )}
                          {pr.status === 'error' && pr.error && (
                            <span className="text-red-600 truncate">
                              {pr.error}
                              {pr.retryCount ? ` (failed ${pr.retryCount} retries)` : ''}
                            </span>
                          )}
                        </div>
                      ))}
                      {/* Show pending pages during processing */}
                      {file.status === 'processing' && file.totalPages && file.pageResults.length < file.totalPages && (
                        Array.from({ length: file.totalPages - file.pageResults.length }, (_, i) => (
                          <div key={`pending-${file.pageResults!.length + i + 1}`} className="flex items-center gap-2 text-xs">
                            <div className="h-3.5 w-3.5 rounded-full border border-gray-300 flex-shrink-0" />
                            <span className="text-gray-400">Page {file.pageResults!.length + i + 1}</span>
                            {file.pageResults!.length + i + 1 === file.currentPage && (
                              <Loader2 className="h-3 w-3 text-blue-500 animate-spin" />
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Clear completed button */}
          {completedCount > 0 && processingCount === 0 && (
            <div className="pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setUploadedFiles((prev) => prev.filter((f) => f.status !== 'complete'))
                }
              >
                Clear completed
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Import Page Component
 * Handles CSV file upload with drag-and-drop and displays import results
 */

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import Papa from 'papaparse';
import { Download } from 'lucide-react';
import { useImport } from '@/hooks/useImport';
import { ImportPreview } from './ImportPreview';
import { ImportPreviewErrorBoundary } from './ImportPreviewErrorBoundary';
import { mapColumns, createColumnLookupMap } from '@/lib/csv/column-mapper';
import { validateRows, createValidationSummary, getValidRows } from '@/lib/csv/csv-validator';
import type { ImportResult, ImportPreviewState } from '@/types/csv-import.types';

interface ImportPageProps {
  projectId?: string;
}

export function ImportPage({ projectId }: ImportPageProps) {
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewState, setPreviewState] = useState<ImportPreviewState | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [parsingProgress, setParsingProgress] = useState<string>('');
  const [payloadSizeWarning, setPayloadSizeWarning] = useState<string>('');
  const { mutate: importCsv, isPending } = useImport();

  // Calculate payload size in bytes
  const calculatePayloadSize = useCallback((rows: any[]): number => {
    const payload = {
      projectId,
      rows,
      columnMappings: previewState?.columnMappings || [],
      metadata: { areas: [], systems: [], testPackages: [] }
    };
    return new Blob([JSON.stringify(payload)]).size;
  }, [projectId, previewState]);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];
    if (!file) return;

    // Check file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      setImportResult({
        success: false,
        componentsCreated: 0,
        drawingsCreated: 0,
        drawingsUpdated: 0,
        metadataCreated: { areas: 0, systems: 0, testPackages: 0 },
        componentsByType: {},
        duration: 0,
        error: 'File too large. Maximum 5MB',
        details: [{
          row: 0,
          issue: 'File too large. Maximum 5MB'
        }]
      });
      return;
    }

    setSelectedFile(file);
    setIsParsing(true);
    setParsingProgress('Reading file...');

    try {
      // Read file as text
      const csvContent = await file.text();

      setParsingProgress('Parsing CSV...');
      // Parse CSV with Papa Parse - configured for maximum flexibility
      const parseResult = Papa.parse<Record<string, string>>(csvContent, {
        header: true,
        skipEmptyLines: 'greedy', // Skip lines that are completely empty, but preserve line breaks in quoted fields
        transformHeader: (header) => header.trim(),
        delimitersToGuess: [',', '\t', '|', ';', ':'], // Try common delimiters
        quoteChar: '"',
        escapeChar: '"',
        comments: false, // Don't treat any lines as comments
        dynamicTyping: false, // Keep all values as strings (we'll validate types ourselves)
        skipFirstNLines: 0
      });

      // Papa Parse errors do not block import
      // Papa Parse is very good at recovering from malformed CSV - trust it
      // Continue processing even if there were recoverable issues

      // Filter out any empty rows that Papa Parse may have created
      // (Can happen with multi-line quoted fields or trailing commas)
      const nonEmptyRows = parseResult.data.filter(row => {
        // Keep row if it has at least one non-empty value
        return Object.values(row).some(val => val && val.trim() !== '');
      });

      if (nonEmptyRows.length === 0) {
        setImportResult({
          success: false,
          componentsCreated: 0,
          drawingsCreated: 0,
          drawingsUpdated: 0,
          metadataCreated: { areas: 0, systems: 0, testPackages: 0 },
          componentsByType: {},
          duration: 0,
          error: 'CSV file appears to be empty or contains no valid data rows.',
          details: [{
            row: 0,
            issue: 'CSV file appears to be empty or contains no valid data rows.'
          }]
        });
        setIsParsing(false);
        return;
      }

      // Use filtered data for processing
      parseResult.data = nonEmptyRows;

      setParsingProgress('Mapping columns...');
      // Generate column mappings
      const mappingResult = mapColumns(parseResult.meta.fields || []);

      // Check if all required fields are present
      if (!mappingResult.hasAllRequiredFields) {
        setImportResult({
          success: false,
          componentsCreated: 0,
          drawingsCreated: 0,
          drawingsUpdated: 0,
          metadataCreated: { areas: 0, systems: 0, testPackages: 0 },
          componentsByType: {},
          duration: 0,
          error: `Missing required columns: ${mappingResult.missingRequiredFields.join(', ')}`,
          details: [{
            row: 0,
            issue: `Missing required columns: ${mappingResult.missingRequiredFields.join(', ')}`
          }]
        });
        setIsParsing(false);
        return;
      }

      // Create column lookup map for validation
      const columnLookupMap = createColumnLookupMap(mappingResult);

      setParsingProgress(`Validating ${parseResult.data.length} rows...`);
      // Validate rows
      const validationResults = validateRows(parseResult.data, columnLookupMap);
      const validationSummary = createValidationSummary(validationResults);

      setParsingProgress('Generating preview...');

      // Get valid rows for sample data
      const validRows = getValidRows(validationResults);
      const sampleData = validRows.slice(0, 10);

      // Calculate component counts
      const componentCounts: Record<string, number> = {};
      validRows.forEach(row => {
        const type = row.type;
        componentCounts[type] = (componentCounts[type] || 0) + 1;
      });

      // Generate preview state
      const preview: ImportPreviewState = {
        fileName: file.name,
        fileSize: file.size,
        totalRows: parseResult.data.length,
        validRows: validationSummary.validCount,
        skippedRows: validationSummary.skippedCount,
        errorRows: validationSummary.errorCount,
        columnMappings: mappingResult.mappings,
        validationResults: validationResults,
        validationSummary: validationSummary,
        metadataDiscovery: {
          areas: [],
          systems: [],
          testPackages: [],
          totalCount: 0,
          existingCount: 0,
          willCreateCount: 0
        }, // Phase 5 will populate this
        sampleData: sampleData,
        componentCounts: componentCounts,
        canImport: validationSummary.canImport
      };

      setPreviewState(preview);

      // Check payload size
      const payloadSize = calculatePayloadSize(validRows);
      const maxSize = 5.5 * 1024 * 1024; // 5.5MB limit with some buffer
      if (payloadSize > maxSize) {
        const sizeMB = (payloadSize / (1024 * 1024)).toFixed(2);
        setPayloadSizeWarning(`Warning: Payload size (${sizeMB} MB) exceeds the 5.5 MB limit. Please reduce the number of rows.`);
      } else if (payloadSize > maxSize * 0.8) {
        const sizeMB = (payloadSize / (1024 * 1024)).toFixed(2);
        setPayloadSizeWarning(`Notice: Payload size is ${sizeMB} MB (approaching the 5.5 MB limit).`);
      } else {
        setPayloadSizeWarning('');
      }
    } catch (error) {
      setImportResult({
        success: false,
        componentsCreated: 0,
        drawingsCreated: 0,
        drawingsUpdated: 0,
        metadataCreated: { areas: 0, systems: 0, testPackages: 0 },
        componentsByType: {},
        duration: 0,
        error: `Failed to parse CSV: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: [{
          row: 0,
          issue: `Failed to parse CSV: ${error instanceof Error ? error.message : 'Unknown error'}`
        }]
      });
    } finally {
      setIsParsing(false);
      setParsingProgress('');
    }
  }, []);

  // Handle confirm import action
  const handleConfirmImport = useCallback(async () => {
    if (!previewState || !selectedFile || !projectId) return;

    // Get valid rows from validation results
    const validRows = getValidRows(previewState.validationResults);

    // Extract unique metadata values from valid rows
    const uniqueAreas = new Set<string>();
    const uniqueSystems = new Set<string>();
    const uniqueTestPackages = new Set<string>();

    validRows.forEach(row => {
      if (row.area) uniqueAreas.add(row.area);
      if (row.system) uniqueSystems.add(row.system);
      if (row.testPackage) uniqueTestPackages.add(row.testPackage);
    });

    // Create JSON payload for Phase 8 Edge Function
    const payload = {
      projectId,
      rows: validRows,
      columnMappings: previewState.columnMappings,
      metadata: {
        areas: Array.from(uniqueAreas),
        systems: Array.from(uniqueSystems),
        testPackages: Array.from(uniqueTestPackages)
      }
    };

    // Call import mutation with JSON payload
    importCsv(
      payload as any,
      {
        onSuccess: (data) => {
          setImportResult(data);
          setPreviewState(null);
          setSelectedFile(null);
        },
        onError: (error) => {
          console.error('Import error:', error);
          setImportResult({
            success: false,
            componentsCreated: 0,
            drawingsCreated: 0,
            drawingsUpdated: 0,
            metadataCreated: { areas: 0, systems: 0, testPackages: 0 },
            componentsByType: {},
            duration: 0,
            error: error.message || 'An unexpected error occurred during import.',
            details: [{
              row: 0,
              issue: error.message || 'An unexpected error occurred during import.'
            }]
          });
          setPreviewState(null);
          setSelectedFile(null);
        }
      }
    );
  }, [previewState, selectedFile, projectId, importCsv]);

  // Handle cancel action
  const handleCancelPreview = useCallback(() => {
    setPreviewState(null);
    setSelectedFile(null);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'text/csv': ['.csv'] },
    maxSize: 5 * 1024 * 1024,
    multiple: false,
    disabled: isParsing || !!previewState // Disable during parsing or when preview is shown
  });


  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">Material Takeoff Import</h2>
        <p className="text-gray-600">
          Upload a CSV file to import components from material takeoff
        </p>
      </div>

      {/* Show preview if available, otherwise show upload UI */}
      {previewState ? (
        <ImportPreviewErrorBoundary onReset={handleCancelPreview}>
          <ImportPreview
            state={previewState}
            onCancel={handleCancelPreview}
            onConfirm={handleConfirmImport}
            isImporting={isPending}
            payloadSizeWarning={payloadSizeWarning}
          />
        </ImportPreviewErrorBoundary>
      ) : (
        <>
          {/* CSV Template Download */}
          <div className="mb-4">
            <a
              href="/templates/material-takeoff-template.csv"
              download="material-takeoff-template.csv"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors"
            >
              <Download className="h-4 w-4" />
              Download Template CSV
            </a>
            <p className="mt-2 text-sm text-muted-foreground">
              Download a template with sample data. Columns marked with * are required.
            </p>
          </div>

          {/* Dropzone */}
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragActive
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <input {...getInputProps()} />
            {isDragActive ? (
              <p className="text-lg text-blue-600">Drop CSV here</p>
            ) : (
              <div>
                <p className="text-lg mb-2">Drag CSV or click to upload</p>
                <p className="text-sm text-gray-500">Maximum file size: 5MB</p>
              </div>
            )}
          </div>

          {/* Progress Indicator */}
          {isParsing && (
            <div className="mt-6">
              <div className="flex flex-col items-center justify-center gap-3">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="text-gray-700 font-medium">{parsingProgress}</span>
              </div>
            </div>
          )}

          {/* Import Results */}
          {importResult && !isPending && (
            <div className="mt-6">
              {importResult.success ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-green-800 mb-2">
                    Import Successful
                  </h3>
                  <p className="text-green-700">
                    Successfully imported {importResult.componentsCreated} components.
                  </p>
                  <p className="text-green-600 text-sm mt-2">
                    Created {importResult.drawingsCreated} drawings, {importResult.metadataCreated.areas} areas, {importResult.metadataCreated.systems} systems
                  </p>
                </div>
              ) : (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-red-800 mb-2">
                    Import Failed
                  </h3>
                  {importResult.error && (
                    <p className="text-red-700 mb-4">
                      {importResult.error}
                    </p>
                  )}
                  {importResult.details && importResult.details.length > 0 && (
                    <div className="mt-4">
                      <div className="max-h-96 overflow-y-auto border border-red-300 rounded">
                        <table className="min-w-full divide-y divide-red-200">
                          <thead className="bg-red-100 sticky top-0">
                            <tr>
                              <th className="px-4 py-2 text-left text-xs font-medium text-red-900 uppercase tracking-wider">Row</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-red-900 uppercase tracking-wider">Issue</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-red-200">
                            {importResult.details.map((detail, index) => (
                              <tr key={index} className="hover:bg-red-50">
                                <td className="px-4 py-2 text-sm text-gray-900">{detail.row}</td>
                                <td className="px-4 py-2 text-sm text-gray-700">{detail.issue}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

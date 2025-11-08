/**
 * Import Preview Component
 *
 * Orchestrates the CSV import preview display, showing:
 * - File summary (name, size, row counts)
 * - Column mappings (via ColumnMappingDisplay)
 * - Validation results (via ValidationResults)
 * - Metadata discovery
 * - Sample data table
 * - Component counts summary
 * - Confirm/Cancel actions
 *
 * @module ImportPreview
 */

import { useState, useMemo, memo } from 'react';
import type { ImportPreviewState } from '@/types/csv-import.types';
import { REQUIRED_FIELDS } from '@/types/csv-import.types';
import { ColumnMappingDisplay } from './ColumnMappingDisplay';
import { ValidationResults } from './ValidationResults';

interface ImportPreviewProps {
  /** Preview state data */
  state: ImportPreviewState;

  /** Callback when user cancels (returns to upload) */
  onCancel: () => void;

  /** Callback when user confirms import */
  onConfirm: () => Promise<void>;

  /** Loading state during import execution */
  isImporting?: boolean;

  /** Payload size warning message */
  payloadSizeWarning?: string;
}

/**
 * ImportPreview component
 *
 * Main preview orchestration component that displays all import analysis
 * and provides confirm/cancel actions.
 */
export const ImportPreview = memo(function ImportPreview({
  state,
  onCancel,
  onConfirm,
  isImporting = false,
  payloadSizeWarning
}: ImportPreviewProps) {
  const [columnMappingsExpanded, setColumnMappingsExpanded] = useState(true);
  const [metadataExpanded, setMetadataExpanded] = useState(false);

  const hasMetadata = state.metadataDiscovery.totalCount > 0;
  const hasErrors = state.errorRows > 0;

  // Memoize missing required fields calculation
  const missingRequiredFields = useMemo(() => {
    if (state.validationSummary.canImport) return [];
    return REQUIRED_FIELDS.filter(
      field => !state.columnMappings.some(m => m.expectedField === field)
    );
  }, [state.columnMappings, state.validationSummary.canImport]);

  return (
    <div className="space-y-6">
      {/* File Summary */}
      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="text-xl font-semibold text-slate-900 mb-4">
          Import Preview
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* File Info */}
          <div>
            <p className="text-sm font-medium text-slate-700">File</p>
            <p className="text-lg font-mono text-slate-900 truncate">
              {state.fileName}
            </p>
            <p className="text-sm text-slate-600">
              {formatFileSize(state.fileSize)}
            </p>
          </div>

          {/* Row Counts */}
          <div>
            <p className="text-sm font-medium text-slate-700">Rows</p>
            <p className="text-lg font-semibold text-slate-900">
              {state.totalRows.toLocaleString()} rows
            </p>
            <p className="text-sm text-slate-600">
              {state.validRows} valid, {state.skippedRows} skipped,{' '}
              {state.errorRows} errors
            </p>
          </div>

          {/* Component Counts */}
          <div>
            <p className="text-sm font-medium text-slate-700">Components</p>
            <p className="text-lg font-semibold text-slate-900">
              {state.validRows.toLocaleString()} total
            </p>
            <p className="text-sm text-slate-600">
              {Object.keys(state.componentCounts).length} types
            </p>
          </div>
        </div>
      </div>

      {/* Column Mappings Section */}
      <div className="rounded-lg border border-slate-200 bg-white">
        <button
          onClick={() => setColumnMappingsExpanded(!columnMappingsExpanded)}
          className="w-full flex items-center justify-between p-6 text-left hover:bg-slate-50"
          aria-expanded={columnMappingsExpanded}
          aria-controls="column-mappings-content"
        >
          <h3 className="text-lg font-semibold text-slate-900">
            Column Mappings
          </h3>
          <svg
            className={`h-5 w-5 text-slate-500 transition-transform ${
              columnMappingsExpanded ? 'rotate-180' : ''
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>

        {columnMappingsExpanded && (
          <div id="column-mappings-content" className="px-6 pb-6">
            <ColumnMappingDisplay
              mappings={state.columnMappings}
              unmappedColumns={[]}
              missingRequiredFields={missingRequiredFields}
            />
          </div>
        )}
      </div>

      {/* Validation Results Section */}
      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">
          Validation Results
        </h3>
        <ValidationResults summary={state.validationSummary} />
      </div>

      {/* Metadata Discovery Section */}
      {hasMetadata && (
        <div className="rounded-lg border border-slate-200 bg-white">
          <button
            onClick={() => setMetadataExpanded(!metadataExpanded)}
            className="w-full flex items-center justify-between p-6 text-left hover:bg-slate-50"
            aria-expanded={metadataExpanded}
            aria-controls="metadata-content"
          >
            <div>
              <h3 className="text-lg font-semibold text-slate-900">
                Metadata Discovery
              </h3>
              <p className="text-sm text-slate-600 mt-1">
                {state.metadataDiscovery.willCreateCount} new, {state.metadataDiscovery.existingCount} existing
              </p>
            </div>
            <svg
              className={`h-5 w-5 text-slate-500 transition-transform ${
                metadataExpanded ? 'rotate-180' : ''
              }`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>

          {metadataExpanded && (
            <div id="metadata-content" className="px-6 pb-6 space-y-4">
              {state.metadataDiscovery.areas.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-slate-700 mb-2">Areas</h4>
                  <div className="flex flex-wrap gap-2">
                    {state.metadataDiscovery.areas.map((area, idx) => (
                      <span
                        key={idx}
                        className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
                          area.exists
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {area.value} {!area.exists && '(new)'}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {state.metadataDiscovery.systems.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-slate-700 mb-2">Systems</h4>
                  <div className="flex flex-wrap gap-2">
                    {state.metadataDiscovery.systems.map((system, idx) => (
                      <span
                        key={idx}
                        className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
                          system.exists
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {system.value} {!system.exists && '(new)'}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {state.metadataDiscovery.testPackages.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-slate-700 mb-2">Test Packages</h4>
                  <div className="flex flex-wrap gap-2">
                    {state.metadataDiscovery.testPackages.map((pkg, idx) => (
                      <span
                        key={idx}
                        className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
                          pkg.exists
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {pkg.value} {!pkg.exists && '(new)'}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Sample Data Table */}
      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">
          Sample Data (First {Math.min(10, state.sampleData.length)} Rows)
        </h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead>
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                  Drawing
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                  Qty
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                  Cmdty Code
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {state.sampleData.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-50">
                  <td className="px-3 py-2 text-sm font-mono text-slate-900">
                    {row.drawing}
                  </td>
                  <td className="px-3 py-2 text-sm text-slate-900">
                    {row.type}
                  </td>
                  <td className="px-3 py-2 text-sm text-slate-900">
                    {row.qty}
                  </td>
                  <td className="px-3 py-2 text-sm font-mono text-slate-600">
                    {row.cmdtyCode}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Component Counts Summary */}
      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">
          Components by Type
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(state.componentCounts).map(([type, count]) => (
            <div key={type} className="flex items-center justify-between">
              <span className="text-sm text-slate-700">{type}</span>
              <span className="text-sm font-semibold text-slate-900">
                {count.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Payload Size Warning */}
      {payloadSizeWarning && (
        <div className={`rounded-md p-4 ${
          payloadSizeWarning.startsWith('Warning:')
            ? 'bg-red-50 border border-red-200'
            : 'bg-yellow-50 border border-yellow-200'
        }`} role="alert">
          <div className="flex items-start gap-3">
            <svg
              className={`h-5 w-5 flex-shrink-0 ${
                payloadSizeWarning.startsWith('Warning:') ? 'text-red-600' : 'text-yellow-600'
              }`}
              fill="currentColor"
              viewBox="0 0 20 20"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
                clipRule="evenodd"
              />
            </svg>
            <p className={`text-sm ${
              payloadSizeWarning.startsWith('Warning:') ? 'text-red-800' : 'text-yellow-800'
            }`}>
              {payloadSizeWarning}
            </p>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-4">
        <button
          onClick={onCancel}
          disabled={isImporting}
          className="px-6 py-2 border border-slate-300 rounded-md text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Cancel import and return to file upload"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          disabled={
            !state.canImport ||
            isImporting ||
            hasErrors ||
            (payloadSizeWarning?.startsWith('Warning:') ?? false)
          }
          className="px-6 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label={isImporting ? 'Import in progress' : 'Confirm import'}
        >
          {isImporting ? 'Importing...' : 'Confirm Import'}
        </button>
      </div>
    </div>
  );
});

/**
 * Formats file size in bytes to human-readable string
 *
 * @param bytes - File size in bytes
 * @returns Formatted string (e.g., "1.5 MB", "500 KB")
 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  } else if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  } else {
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }
}

/**
 * Column Mapping Display Component
 *
 * Displays detected CSV column mappings with confidence scores,
 * unmapped columns, and missing required fields.
 *
 * @module ColumnMappingDisplay
 */

import { memo } from 'react';
import type { ColumnMapping, ExpectedField } from '@/types/csv-import.types';
import { REQUIRED_FIELDS } from '@/types/csv-import.types';

interface ColumnMappingDisplayProps {
  /** Successfully mapped columns with confidence scores */
  mappings: ColumnMapping[];

  /** CSV columns that couldn't be mapped */
  unmappedColumns: string[];

  /** Required fields not found in CSV */
  missingRequiredFields: ExpectedField[];
}

/**
 * ColumnMappingDisplay component
 *
 * Shows column mapping results in three sections:
 * 1. Successfully mapped columns (with confidence badges)
 * 2. Unmapped columns (warning)
 * 3. Missing required fields (error)
 */
export const ColumnMappingDisplay = memo(function ColumnMappingDisplay({
  mappings,
  unmappedColumns,
  missingRequiredFields
}: ColumnMappingDisplayProps) {
  const hasUnmapped = unmappedColumns.length > 0;
  const hasMissing = missingRequiredFields.length > 0;

  return (
    <div className="space-y-4">
      {/* Section Header */}
      <h3 className="text-lg font-semibold text-slate-900">
        Column Mappings Detected
      </h3>

      {/* Empty State */}
      {mappings.length === 0 && (
        <div className="rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-800">
            No columns mapped. Missing required fields.
          </p>
        </div>
      )}

      {/* Successfully Mapped Columns */}
      {mappings.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-slate-700">
            Mapped Columns ({mappings.length})
          </h4>
          <ul className="space-y-2" role="list">
            {mappings.map((mapping, index) => {
              const isRequired = REQUIRED_FIELDS.includes(mapping.expectedField);
              return (
                <li
                  key={index}
                  className="flex items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    {/* Show mapping: CSV Column → Expected Field (or just CSV Column if identical) */}
                    {mapping.csvColumn === mapping.expectedField ? (
                      // Exact match - show once
                      <>
                        <span className="font-mono text-slate-900 truncate">
                          {mapping.csvColumn}
                        </span>
                      </>
                    ) : (
                      // Different - show mapping
                      <>
                        <span className="font-mono text-slate-900 truncate">
                          {mapping.csvColumn}
                        </span>
                        <span className="text-slate-400 flex-shrink-0">→</span>
                        <span className="font-medium text-slate-900 truncate">
                          {mapping.expectedField}
                        </span>
                      </>
                    )}

                    {/* Required Badge */}
                    {isRequired && (
                      <span
                        className="ml-1 inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800 flex-shrink-0"
                        aria-label="Required field"
                      >
                        Required
                      </span>
                    )}
                  </div>

                  {/* Confidence Badge */}
                  <span
                    className={`ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium flex-shrink-0 badge ${getConfidenceBadgeClass(
                      mapping.confidence
                    )}`}
                    aria-label={`${mapping.confidence}% confidence`}
                  >
                    {mapping.confidence}%
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Unmapped Columns (Warning) */}
      {hasUnmapped && (
        <div className="rounded-md bg-yellow-50 p-4">
          <div className="flex items-start gap-3">
            <svg
              className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5"
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
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-medium text-yellow-800">
                Unmapped Columns ({unmappedColumns.length})
              </h4>
              <p className="mt-1 text-sm text-yellow-700">
                These columns were not recognized and will be stored as additional attributes.
              </p>
              <ul className="mt-2 space-y-1" role="list">
                {unmappedColumns.map((column, index) => (
                  <li
                    key={index}
                    className="text-sm font-mono text-yellow-900"
                  >
                    • {column}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Missing Required Fields (Error) */}
      {hasMissing && (
        <div className="rounded-md bg-red-50 p-4" role="alert">
          <div className="flex items-start gap-3">
            <svg
              className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5"
              fill="currentColor"
              viewBox="0 0 20 20"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
                clipRule="evenodd"
              />
            </svg>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-medium text-red-800">
                Missing Required Fields ({missingRequiredFields.length})
              </h4>
              <p className="mt-1 text-sm text-red-700">
                The following required fields were not found in the CSV. Import cannot proceed.
              </p>
              <ul className="mt-2 space-y-1" role="list">
                {missingRequiredFields.map((field, index) => (
                  <li key={index} className="text-sm font-mono text-red-900">
                    • {field}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

/**
 * Gets Tailwind CSS classes for confidence badge based on confidence level
 *
 * @param confidence - Confidence percentage (100, 95, or 85)
 * @returns CSS class string for badge styling
 */
function getConfidenceBadgeClass(confidence: number): string {
  if (confidence === 100) {
    return 'bg-green-100 text-green-800';
  } else if (confidence === 95) {
    return 'bg-blue-100 text-blue-800';
  } else if (confidence === 85) {
    return 'bg-yellow-100 text-yellow-800';
  }
  return 'bg-slate-100 text-slate-800';
}

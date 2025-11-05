/**
 * Validation Results Component
 *
 * Displays CSV validation results with counts, error details, and warning details.
 * Supports expandable sections for detailed error/warning information.
 *
 * @module ValidationResults
 */

import { useState, memo } from 'react';
import type { ValidationSummary } from '@/types/csv-import.types';

interface ValidationResultsProps {
  /** Aggregated validation summary */
  summary: ValidationSummary | null;
}

/**
 * ValidationResults component
 *
 * Shows validation results in sections:
 * 1. Summary with counts (valid, skipped, error)
 * 2. Error details (expandable, grouped by category)
 * 3. Warning details (skipped rows, expandable)
 */
export const ValidationResults = memo(function ValidationResults({ summary }: ValidationResultsProps) {
  const [showAllErrors, setShowAllErrors] = useState(false);
  const [showSkippedDetails, setShowSkippedDetails] = useState(false);

  if (!summary) {
    return null;
  }

  const hasErrors = summary.errorCount > 0;
  const hasSkipped = summary.skippedCount > 0;
  const hasIssues = hasErrors || hasSkipped;

  // Limit error display to first 10 by default
  const errorLimit = 10;
  const displayedErrors = showAllErrors
    ? summary.resultsByStatus.error
    : summary.resultsByStatus.error.slice(0, errorLimit);
  const hasMoreErrors = summary.resultsByStatus.error.length > errorLimit;

  return (
    <div className="space-y-4">
      {/* Summary Section */}
      <div
        className={`rounded-md p-4 ${
          hasErrors ? 'bg-red-50' : 'bg-green-50'
        }`}
        role="region"
        aria-label="Validation summary"
      >
        <div className="flex items-start gap-3">
          {/* Status Icon */}
          {hasErrors ? (
            <svg
              className="h-6 w-6 text-red-600 flex-shrink-0"
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
          ) : (
            <svg
              className="h-6 w-6 text-green-600 flex-shrink-0"
              fill="currentColor"
              viewBox="0 0 20 20"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                clipRule="evenodd"
              />
            </svg>
          )}

          {/* Summary Text */}
          <div className="flex-1">
            <h3
              className={`text-sm font-medium ${
                hasErrors ? 'text-red-800' : 'text-green-800'
              }`}
            >
              {hasErrors
                ? 'Validation Failed'
                : hasSkipped
                ? 'Validation Passed with Warnings'
                : 'Validation Successful'}
            </h3>
            <p
              className={`mt-1 text-sm ${
                hasErrors ? 'text-red-700' : 'text-green-700'
              }`}
            >
              Processed {summary.totalRows} rows: {summary.validCount} valid,{' '}
              {summary.skippedCount} skipped, {summary.errorCount} errors.{' '}
              {hasErrors
                ? 'Errors must be fixed before import.'
                : summary.canImport
                ? 'Ready to import.'
                : ''}
            </p>
          </div>
        </div>
      </div>

      {/* Error Details */}
      {hasErrors && (
        <div className="rounded-md bg-red-50 p-4" role="region" aria-label="Error details">
          <h4 className="text-sm font-medium text-red-800 mb-2">
            Errors ({summary.errorCount})
          </h4>
          <p className="text-sm text-red-700 mb-3">
            These issues must be fixed before import can proceed.
          </p>
          <ul className="space-y-2" role="list">
            {displayedErrors.map((result, index) => (
              <li
                key={index}
                className="text-sm text-red-900 bg-white rounded px-3 py-2 border border-red-200"
              >
                <span className="font-mono font-medium">Row {result.rowNumber}:</span>{' '}
                <span>{result.reason}</span>
                {result.category && (
                  <span className="ml-2 inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
                    {formatCategory(result.category)}
                  </span>
                )}
              </li>
            ))}
          </ul>

          {/* Show More/Less Button */}
          {hasMoreErrors && (
            <button
              onClick={() => setShowAllErrors(!showAllErrors)}
              className="mt-3 text-sm font-medium text-red-700 hover:text-red-900 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 rounded px-2 py-1"
              aria-expanded={showAllErrors}
              aria-controls="all-errors"
            >
              {showAllErrors
                ? 'Show less'
                : `Show all ${summary.errorCount} errors`}
            </button>
          )}
        </div>
      )}

      {/* Warning Details (Skipped Rows) */}
      {hasSkipped && (
        <div className="rounded-md bg-yellow-50 p-4" role="region" aria-label="Warning details">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h4 className="text-sm font-medium text-yellow-800">
                Warnings ({summary.skippedCount})
              </h4>
              <p className="mt-1 text-sm text-yellow-700">
                These rows will be skipped during import.
              </p>
            </div>
            <button
              onClick={() => setShowSkippedDetails(!showSkippedDetails)}
              className="ml-4 text-sm font-medium text-yellow-700 hover:text-yellow-900 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 rounded px-2 py-1"
              aria-expanded={showSkippedDetails}
              aria-controls="skipped-details"
            >
              {showSkippedDetails ? 'Hide details' : 'Show details'}
            </button>
          </div>

          {showSkippedDetails && (
            <ul className="mt-3 space-y-2" role="list" id="skipped-details">
              {summary.resultsByStatus.skipped.map((result, index) => (
                <li
                  key={index}
                  className="text-sm text-yellow-900 bg-white rounded px-3 py-2 border border-yellow-200"
                >
                  <span className="font-mono font-medium">Row {result.rowNumber}:</span>{' '}
                  <span>{result.reason}</span>
                  {result.category && (
                    <span className="ml-2 inline-flex items-center rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800">
                      {formatCategory(result.category)}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* All Valid - Success State */}
      {!hasIssues && (
        <div className="text-center py-4">
          <p className="text-sm text-slate-600">
            All rows passed validation. Ready to import.
          </p>
        </div>
      )}
    </div>
  );
});

/**
 * Formats validation category for display
 *
 * @param category - Validation category enum
 * @returns Human-readable category label
 */
function formatCategory(category: string): string {
  return category
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

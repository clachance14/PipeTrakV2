/**
 * Import Page Component
 * Handles CSV file upload with drag-and-drop and displays import results
 */

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { useImport } from '@/hooks/useImport';
import { ImportProgress } from './ImportProgress';
import { ErrorReportDownload } from './ErrorReportDownload';
import type { ImportResult } from '@/schemas/import';

interface ImportPageProps {
  projectId?: string;
}

export function ImportPage({ projectId }: ImportPageProps) {
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const { mutate: importCsv, isPending } = useImport();

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];
    if (!file) return;

    // Check file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      setImportResult({
        success: false,
        errors: [{
          row: 0,
          column: '',
          reason: 'File too large. Maximum 5MB'
        }]
      });
      return;
    }

    // Read file content
    const csvContent = await file.text();

    // Call import mutation
    if (projectId) {
      importCsv(
        { projectId, csvContent },
        {
          onSuccess: (data) => {
            setImportResult(data);
          },
          onError: (error) => {
            setImportResult({
              success: false,
              errors: [{
                row: 0,
                column: '',
                reason: error.message
              }]
            });
          }
        }
      );
    }
  }, [projectId, importCsv]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'text/csv': ['.csv'] },
    maxSize: 5 * 1024 * 1024,
    multiple: false
  });

  const downloadTemplate = () => {
    const template = `DRAWING,TYPE,QTY,CMDTY CODE,SPEC,DESCRIPTION,SIZE,Comments
P-001,Valve,2,VBALU-001,ES-03,Ball Valve Cl150,1,Example valve
DRAIN-1,Flange,1,FBLAG2DFA2351215,ES-03,Blind Flange B16.5 cl150,2,Example flange
PW-55401,Instrument,1,ME-55402,EN-14,Pressure Gauge,1/2,Example instrument`;

    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'takeoff-template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">Material Takeoff Import</h2>
        <p className="text-gray-600">
          Upload a CSV file to import components from material takeoff
        </p>
      </div>

      {/* CSV Template Download */}
      <div className="mb-6">
        <button
          onClick={downloadTemplate}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Download CSV Template
        </button>
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
      <ImportProgress isLoading={isPending} />

      {/* Import Results */}
      {importResult && !isPending && (
        <div className="mt-6">
          {importResult.success ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-green-800 mb-2">
                Import Successful
              </h3>
              <p className="text-green-700">
                Successfully imported {importResult.componentsCreated} components from{' '}
                {importResult.rowsProcessed} rows.{' '}
                {importResult.rowsSkipped ? `${importResult.rowsSkipped} rows skipped.` : ''}
              </p>
            </div>
          ) : (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-red-800 mb-2">
                Import Failed
              </h3>
              <p className="text-red-700 mb-4">
                Found {importResult.errors?.length || 0} error{importResult.errors?.length !== 1 ? 's' : ''} in your CSV file.
              </p>
              {importResult.errors && importResult.errors.length > 0 && (
                <div className="mt-4">
                  <div className="max-h-96 overflow-y-auto border border-red-300 rounded">
                    <table className="min-w-full divide-y divide-red-200">
                      <thead className="bg-red-100 sticky top-0">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-red-900 uppercase tracking-wider">Row</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-red-900 uppercase tracking-wider">Column</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-red-900 uppercase tracking-wider">Error</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-red-200">
                        {importResult.errors.map((error, index) => (
                          <tr key={index} className="hover:bg-red-50">
                            <td className="px-4 py-2 text-sm text-gray-900">{error.row}</td>
                            <td className="px-4 py-2 text-sm text-gray-900">{error.column || '-'}</td>
                            <td className="px-4 py-2 text-sm text-gray-700">{error.reason}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-4">
                    <ErrorReportDownload errors={importResult.errors} />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

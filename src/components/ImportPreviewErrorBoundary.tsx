/**
 * Error Boundary for Import Preview Component
 *
 * Catches rendering errors in ImportPreview and displays a graceful fallback UI
 * with actionable error messages.
 *
 * @module ImportPreviewErrorBoundary
 */

import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ImportPreviewErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ImportPreview Error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-lg border border-red-200 bg-red-50 p-6">
          <div className="flex items-start gap-4">
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
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-red-800 mb-2">
                Preview Failed
              </h3>
              <p className="text-sm text-red-700 mb-4">
                An error occurred while displaying the import preview. This could be due to:
              </p>
              <ul className="text-sm text-red-700 mb-4 list-disc list-inside space-y-1">
                <li>Malformed CSV data that passed initial validation</li>
                <li>Unexpected column values or formatting</li>
                <li>Browser memory limitations (try a smaller file)</li>
              </ul>
              {this.state.error && (
                <details className="mb-4">
                  <summary className="text-sm font-medium text-red-800 cursor-pointer hover:text-red-900">
                    Technical Details
                  </summary>
                  <pre className="mt-2 text-xs text-red-900 bg-red-100 p-3 rounded overflow-x-auto">
                    {this.state.error.message}
                  </pre>
                </details>
              )}
              <div className="flex gap-3">
                <button
                  onClick={this.handleReset}
                  className="px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Demo Error Message Component
// Feature: 021-public-homepage
// Task: T036
// Description: Display specific error types with retry button

interface DemoErrorMessageProps {
  error: {
    error: string
    message: string
    field?: string
    retry_after?: number
    limit_type?: 'ip' | 'email'
  }
  onRetry: () => void
}

export function DemoErrorMessage({ error, onRetry }: DemoErrorMessageProps) {
  const getErrorTitle = () => {
    switch (error.error) {
      case 'VALIDATION_ERROR':
        return 'Invalid Input'
      case 'RATE_LIMIT_EXCEEDED':
        return 'Too Many Requests'
      case 'EMAIL_EXISTS':
        return 'Email Already Registered'
      case 'INTERNAL_ERROR':
        return 'Something Went Wrong'
      default:
        return 'Error'
    }
  }

  const getErrorIcon = () => {
    switch (error.error) {
      case 'RATE_LIMIT_EXCEEDED':
        return (
          <svg
            className="w-12 h-12 text-yellow-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        )
      case 'EMAIL_EXISTS':
        return (
          <svg
            className="w-12 h-12 text-blue-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        )
      default:
        return (
          <svg
            className="w-12 h-12 text-red-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        )
    }
  }

  return (
    <div
      className="max-w-md mx-auto bg-white rounded-lg shadow-xl p-8"
      role="alert"
      aria-live="assertive"
    >
      <div className="flex flex-col items-center text-center">
        {/* Icon */}
        <div className="mb-4">{getErrorIcon()}</div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-slate-900 mb-3">
          {getErrorTitle()}
        </h2>

        {/* Message */}
        <p className="text-slate-600 mb-6 leading-relaxed">
          {error.message}
        </p>

        {/* Retry After Info (for rate limiting) */}
        {error.retry_after && error.retry_after > 0 && (
          <p className="text-sm text-slate-500 mb-6">
            You can try again in{' '}
            {error.retry_after < 60
              ? `${error.retry_after} seconds`
              : error.retry_after < 3600
              ? `${Math.ceil(error.retry_after / 60)} minutes`
              : `${Math.ceil(error.retry_after / 3600)} hours`}
          </p>
        )}

        {/* Retry Button */}
        <button
          onClick={onRetry}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-300 font-semibold transition-colors"
          style={{ minHeight: '48px', minWidth: '120px' }}
        >
          Try Again
        </button>

        {/* Contact Support Link (for internal errors) */}
        {error.error === 'INTERNAL_ERROR' && (
          <p className="mt-6 text-sm text-slate-500">
            If this problem persists, please{' '}
            <a
              href="mailto:info@pipetrak.co"
              className="text-blue-600 hover:underline"
            >
              contact support
            </a>
          </p>
        )}
      </div>
    </div>
  )
}

// Demo Success Message Component
// Feature: 021-public-homepage
// Task: T037
// Description: Post-signup confirmation with email instructions

interface DemoSuccessMessageProps {
  email: string
  expiresAt?: string
}

export function DemoSuccessMessage({ email, expiresAt }: DemoSuccessMessageProps) {
  return (
    <div
      className="max-w-md mx-auto bg-white rounded-lg shadow-xl p-8"
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-col items-center text-center">
        {/* Success Icon */}
        <div className="mb-6">
          <svg
            className="w-16 h-16 text-green-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>

        {/* Title */}
        <h2 className="text-3xl font-bold text-slate-900 mb-4">
          Demo Account Created!
        </h2>

        {/* Instructions */}
        <p className="text-slate-600 mb-6 leading-relaxed">
          We've sent a confirmation email to:
        </p>

        <p className="text-lg font-semibold text-blue-600 mb-6">
          {email}
        </p>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-left w-full">
          <h3 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
            <svg
              className="w-5 h-5 text-blue-600"
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
            Next Steps:
          </h3>
          <ol className="text-sm text-slate-700 space-y-2 list-decimal list-inside">
            <li>Check your email inbox (and spam folder)</li>
            <li>Click the magic link in the email</li>
            <li>Start exploring your demo project!</li>
          </ol>
        </div>

        {/* Demo Details */}
        <div className="bg-slate-50 rounded-lg p-4 w-full text-left">
          <h3 className="font-semibold text-slate-900 mb-3">
            Your Demo Includes:
          </h3>
          <ul className="text-sm text-slate-700 space-y-2">
            <li className="flex items-start gap-2">
              <svg
                className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              <span>200 sample components</span>
            </li>
            <li className="flex items-start gap-2">
              <svg
                className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              <span>20 drawings</span>
            </li>
            <li className="flex items-start gap-2">
              <svg
                className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              <span>10 test packages</span>
            </li>
            <li className="flex items-start gap-2">
              <svg
                className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              <span>7 days of full access</span>
            </li>
          </ul>
        </div>

        {/* Expiration Notice */}
        {expiresAt && (
          <p className="mt-6 text-xs text-slate-500">
            Demo access expires on{' '}
            {new Date(expiresAt).toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric'
            })}
          </p>
        )}
      </div>
    </div>
  )
}

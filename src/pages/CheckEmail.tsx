import { useLocation, Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'

export function CheckEmail() {
  const location = useLocation()
  const email = location.state?.email || 'your email'

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <div className="bg-white py-8 px-6 shadow-lg rounded-lg text-center">
          {/* Success Icon */}
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
            <svg
              className="h-6 w-6 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Check Your Email
          </h2>

          <p className="text-gray-600 mb-6">
            We've sent a confirmation email to{' '}
            <span className="font-medium text-gray-900">{email}</span>
          </p>

          <div className="space-y-4">
            {/* Instructions Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left">
              <h3 className="font-medium text-blue-900 mb-2">Next Steps:</h3>
              <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                <li>Check your email inbox</li>
                <li>Click the confirmation link</li>
                <li>Your organization will be created automatically</li>
                <li>You'll be redirected to your dashboard</li>
              </ol>
            </div>

            {/* Help Text */}
            <p className="text-sm text-gray-500">
              Didn't receive the email? Check your spam folder or{' '}
              <Link
                to="/register"
                className="text-blue-600 hover:text-blue-500 font-medium"
              >
                try registering again
              </Link>
            </p>

            {/* Login Button */}
            <Button asChild className="w-full" variant="outline">
              <Link to="/login">Go to Login</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

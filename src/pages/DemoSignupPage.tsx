// Demo Signup Page
// Feature: 031-one-click-demo-access
// Description: Demo access with lead capture - sends credentials via email

import { useState } from 'react'
import { DemoSignupForm } from '@/components/demo/DemoSignupForm'
import { DemoErrorMessage } from '@/components/demo/DemoErrorMessage'
import { useDemoAccess } from '@/hooks/useDemoAccess'

type PageState = 'form' | 'success' | 'error'

interface DemoError {
  error: string
  message: string
  field?: string
  retry_after?: number
  limit_type?: 'ip' | 'email'
}

export function DemoSignupPage() {
  const [pageState, setPageState] = useState<PageState>('form')
  const [demoError, setDemoError] = useState<DemoError | null>(null)
  const [sentToEmail, setSentToEmail] = useState<string>('')

  const { mutate: accessDemo, isPending, reset } = useDemoAccess({
    onSuccess: (data) => {
      setSentToEmail(data.email_sent_to || '')
      setPageState('success')
    },
    onError: (error: Error & { code?: string; retryAfter?: number; limitType?: string; field?: string }) => {
      setDemoError({
        error: error.code || 'INTERNAL_ERROR',
        message: error.message || 'An unexpected error occurred. Please try again.',
        field: error.field,
        retry_after: error.retryAfter,
        limit_type: error.limitType as 'ip' | 'email' | undefined
      })
      setPageState('error')
    }
  })

  const handleSubmit = (email: string, fullName: string) => {
    accessDemo({
      email,
      full_name: fullName
    })
  }

  const handleRetry = () => {
    reset()
    setDemoError(null)
    setPageState('form')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center px-4 py-12">
      {/* Back to Home Link */}
      <div className="absolute top-6 left-6">
        <a
          href="/"
          className="text-white hover:text-slate-300 transition-colors flex items-center gap-2 text-sm font-medium"
          style={{ minHeight: '44px', minWidth: '44px' }}
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
          Back to Home
        </a>
      </div>

      {/* Main Content */}
      <div className="w-full max-w-2xl">
        {pageState === 'form' && (
          <DemoSignupForm onSubmit={handleSubmit} isLoading={isPending} />
        )}

        {pageState === 'success' && (
          <div className="max-w-md mx-auto bg-white rounded-lg shadow-xl p-8 text-center">
            <div className="mb-6">
              <svg
                className="w-16 h-16 mx-auto text-green-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">
              Check Your Email!
            </h2>
            <p className="text-slate-600 mb-6">
              We&apos;ve sent your demo login credentials to:
            </p>
            <p className="text-lg font-semibold text-slate-800 mb-6 bg-slate-100 py-2 px-4 rounded-lg inline-block">
              {sentToEmail}
            </p>
            <p className="text-slate-500 text-sm">
              Click the link in the email to log in with pre-filled credentials.
            </p>
          </div>
        )}

        {pageState === 'error' && demoError && (
          <DemoErrorMessage
            error={demoError}
            onRetry={handleRetry}
          />
        )}
      </div>
    </div>
  )
}

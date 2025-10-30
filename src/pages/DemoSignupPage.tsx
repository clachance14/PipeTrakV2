// Demo Signup Page
// Feature: 021-public-homepage
// Task: T040
// Description: Compose DemoSignupForm, DemoErrorMessage, DemoSuccessMessage

import { useState } from 'react'
import { DemoSignupForm } from '@/components/demo/DemoSignupForm'
import { DemoErrorMessage } from '@/components/demo/DemoErrorMessage'
import { DemoSuccessMessage } from '@/components/demo/DemoSuccessMessage'
import { useDemoSignup } from '@/hooks/useDemoSignup'

type PageState = 'form' | 'success' | 'error'

export function DemoSignupPage() {
  const [pageState, setPageState] = useState<PageState>('form')
  const [successData, setSuccessData] = useState<{ email: string; expiresAt?: string } | null>(null)

  const { mutate: signupDemo, isPending, error, reset } = useDemoSignup()

  const handleSubmit = (email: string, fullName: string) => {
    signupDemo(
      { email, full_name: fullName },
      {
        onSuccess: (data) => {
          if (data.success) {
            setSuccessData({
              email,
              expiresAt: data.demo_expires_at
            })
            setPageState('success')
          } else {
            setPageState('error')
          }
        },
        onError: () => {
          setPageState('error')
        }
      }
    )
  }

  const handleRetry = () => {
    reset()
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

        {pageState === 'success' && successData && (
          <DemoSuccessMessage
            email={successData.email}
            expiresAt={successData.expiresAt}
          />
        )}

        {pageState === 'error' && error && (
          <DemoErrorMessage
            error={error as any}
            onRetry={handleRetry}
          />
        )}
      </div>
    </div>
  )
}

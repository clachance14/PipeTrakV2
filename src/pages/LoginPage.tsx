import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'

export function LoginPage() {
  const [searchParams] = useSearchParams()
  const isDemo = searchParams.get('demo') === 'true'
  const demoEmail = searchParams.get('email') || ''
  const demoPassword = searchParams.get('password') || ''

  const [email, setEmail] = useState(demoEmail)
  const [password, setPassword] = useState(demoPassword)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { signIn } = useAuth()
  const navigate = useNavigate()

  // Pre-fill credentials from URL params (for demo access)
  useEffect(() => {
    if (isDemo && demoEmail) {
      setEmail(demoEmail)
    }
    if (isDemo && demoPassword) {
      setPassword(demoPassword)
    }
  }, [isDemo, demoEmail, demoPassword])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await signIn(email, password)
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign in')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md space-y-8 rounded-lg bg-white p-8 shadow">
        {/* Demo mode banner */}
        {isDemo && (
          <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 mb-4">
            <div className="flex items-center gap-2 text-amber-800">
              <svg className="h-5 w-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm font-medium">Demo credentials pre-filled! Just click Sign in.</span>
            </div>
          </div>
        )}

        <div>
          <h2 className="text-center text-3xl font-bold text-gray-900">
            PipeTrak V2
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Sign in to your account
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded bg-red-50 p-3 text-sm text-red-600">
              {error}
            </div>
          )}
          <div className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-gray-700"
                >
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-sm font-medium text-blue-600 hover:text-blue-500"
                >
                  Forgot password?
                </Link>
              </div>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>
          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white hover:bg-blue-700 font-semibold py-2.5"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </Button>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Don't have an account?{' '}
              <Link to="/register" className="font-medium text-blue-600 hover:text-blue-500">
                Create account
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  )
}

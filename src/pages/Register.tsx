import { Link } from 'react-router-dom'
import { RegistrationForm } from '@/components/auth/RegistrationForm'

export function Register() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Create Your PipeTrak Account
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Start tracking your construction projects today
          </p>
        </div>

        <div className="bg-white py-8 px-6 shadow-lg rounded-lg">
          <RegistrationForm />

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

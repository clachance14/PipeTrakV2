import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import type { UserRole } from '@/lib/permissions'
import { getRoleRedirectPath } from '@/lib/permissions'

interface RoleBasedRedirectProps {
  role: UserRole
}

/**
 * Redirects user to role-appropriate dashboard
 * Used after login and invitation acceptance
 */
export function RoleBasedRedirect({ role }: RoleBasedRedirectProps) {
  const navigate = useNavigate()

  useEffect(() => {
    const path = getRoleRedirectPath(role)
    navigate(path, { replace: true })
  }, [role, navigate])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-gray-600">Redirecting...</p>
    </div>
  )
}

/**
 * Helper hook to get redirect path for a role
 * Use this in components that need conditional redirects
 */
export function useRoleBasedRedirect() {
  const navigate = useNavigate()

  return (role: UserRole) => {
    const path = getRoleRedirectPath(role)
    navigate(path, { replace: true })
  }
}

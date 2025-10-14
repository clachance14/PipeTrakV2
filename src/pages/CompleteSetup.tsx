import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'

export function CompleteSetup() {
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const setupInitiatedRef = useRef(false)

  useEffect(() => {
    // Prevent concurrent execution (React StrictMode runs effects twice)
    if (setupInitiatedRef.current) return
    setupInitiatedRef.current = true

    async function setupOrganization() {
      try {
        // Get authenticated user
        const { data: { user }, error: userError } = await supabase.auth.getUser()

        if (userError || !user) {
          throw new Error('Not authenticated. Please log in.')
        }

        // Get organization name from metadata
        const orgName = user.user_metadata?.organization_name

        if (!orgName) {
          throw new Error('Organization name not found. Please contact support.')
        }

        // SINGLE-ORG: Check if user already has organization
        const { data: existingUser } = await supabase
          .from('users')
          .select('organization_id')
          .eq('id', user.id)
          .single()

        if (existingUser?.organization_id) {
          // Already set up, just redirect
          navigate('/dashboard')
          return
        }

        // Create organization (user is now authenticated!)
        const { data: org, error: orgError } = await supabase
          .from('organizations')
          .insert({ name: orgName })
          .select()
          .single()

        if (orgError || !org) {
          throw new Error(orgError?.message || 'Failed to create organization')
        }

        // SINGLE-ORG: Atomically set organization_id and role on users table
        const { error: updateError } = await supabase
          .from('users')
          .update({
            organization_id: org.id,
            role: 'owner',
          })
          .eq('id', user.id)

        if (updateError) {
          // Cleanup organization if update fails
          await supabase.from('organizations').delete().eq('id', org.id)
          throw new Error(updateError.message || 'Failed to assign organization')
        }

        // Success! Redirect to dashboard
        navigate('/dashboard')
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Setup failed'
        setError(errorMessage)
        console.error('Setup error:', err)
      }
    }

    setupOrganization()
  }, [])

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="max-w-md w-full bg-white py-8 px-6 shadow-lg rounded-lg text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Setup Failed</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => navigate('/login')}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Go to Login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <h1 className="text-2xl font-bold mb-2">Setting up your account...</h1>
        <p className="text-gray-600">Please wait while we create your organization.</p>
      </div>
    </div>
  )
}

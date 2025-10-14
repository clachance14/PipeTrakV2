import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useInvitations } from '@/hooks/useInvitations'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { getRoleRedirectPath } from '@/lib/permissions'
import { toast } from 'sonner'

const newUserSchema = z.object({
  password: z.string().min(6, 'Password must be at least 6 characters'),
  full_name: z.string().min(1, 'Full name is required'),
})

type NewUserFormValues = z.infer<typeof newUserSchema>

export function AcceptInvitation() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const token = searchParams.get('token')

  const { useValidateToken, acceptInvitationMutation } = useInvitations()
  const { data: validationData, isLoading, error } = useValidateToken(token || '')

  const [accepting, setAccepting] = useState(false)

  const form = useForm<NewUserFormValues>({
    resolver: zodResolver(newUserSchema),
    defaultValues: {
      password: '',
      full_name: '',
    },
  })

  useEffect(() => {
    if (!token) {
      toast.error('Invalid invitation link')
      navigate('/login')
    }
  }, [token, navigate])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Validating invitation...</p>
        </div>
      </div>
    )
  }

  if (error || !validationData?.valid) {
    const errorMessage = validationData?.error || 'Invalid or expired invitation'
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-lg text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Invitation Invalid</h2>
          <p className="text-gray-600 mb-6">{errorMessage}</p>
          <Button onClick={() => navigate('/login')}>Go to Login</Button>
        </div>
      </div>
    )
  }

  const invitation = validationData?.invitation

  const handleAccept = async (formData?: NewUserFormValues) => {
    if (!token || !invitation) return

    setAccepting(true)
    acceptInvitationMutation.mutate(
      {
        token,
        password: formData?.password,
        full_name: formData?.full_name,
      },
      {
        onSuccess: (data) => {
          toast.success(`Welcome to ${invitation?.organization_name}!`)
          const redirectPath = getRoleRedirectPath(data.role)
          navigate(redirectPath)
        },
        onError: (err: Error) => {
          toast.error(err.message || 'Failed to accept invitation')
          setAccepting(false)
        },
      }
    )
  }

  if (!invitation) {
    return null
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-lg">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            You've been invited to join
          </h2>
          <p className="text-xl font-semibold text-blue-600 mt-2">
            {invitation.organization_name}
          </p>
        </div>

        <div className="bg-gray-50 p-4 rounded-md mb-6">
          <dl className="space-y-2">
            <div>
              <dt className="text-sm font-medium text-gray-500">Role</dt>
              <dd className="text-sm text-gray-900 capitalize">
                {invitation.role.replace('_', ' ')}
              </dd>
            </div>
            {invitation.invited_by_name && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Invited by</dt>
                <dd className="text-sm text-gray-900">{invitation.invited_by_name}</dd>
              </div>
            )}
            <div>
              <dt className="text-sm font-medium text-gray-500">Expires</dt>
              <dd className="text-sm text-gray-900">
                {new Date(invitation.expires_at).toLocaleDateString()}
              </dd>
            </div>
          </dl>
        </div>

        {user ? (
          // Existing user - just accept
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Click below to join this organization with your existing account.
            </p>
            <Button
              className="w-full"
              onClick={() => handleAccept()}
              disabled={accepting}
            >
              {accepting ? 'Accepting...' : 'Accept Invitation'}
            </Button>
          </div>
        ) : (
          // New user - need password and name
          <div>
            <p className="text-sm text-gray-600 mb-4">
              Create your account to accept this invitation:
            </p>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleAccept)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="full_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input placeholder="John Doe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="Minimum 6 characters"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" className="w-full" disabled={accepting}>
                  {accepting ? 'Creating Account...' : 'Accept & Create Account'}
                </Button>
              </form>
            </Form>
          </div>
        )}
      </div>
    </div>
  )
}

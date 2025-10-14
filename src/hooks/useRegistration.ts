// T035: Registration hook (TanStack Query)
import { useMutation, useQuery } from '@tanstack/react-query'
import { registerUser, checkEmailAvailable } from '@/lib/auth'
import { useState, useEffect } from 'react'

export function useRegistration() {
  const registerMutation = useMutation({
    mutationFn: ({
      email,
      password,
      fullName,
      orgName,
    }: {
      email: string
      password: string
      fullName: string
      orgName: string
    }) => registerUser(email, password, fullName, orgName),
    onError: (error: Error) => {
      // Handle specific error codes
      if (error.message.includes('already registered')) {
        throw new Error('EMAIL_ALREADY_REGISTERED')
      }
      if (error.message.includes('Password')) {
        throw new Error('PASSWORD_TOO_SHORT')
      }
      throw new Error('REGISTRATION_FAILED')
    },
  })

  return {
    register: registerMutation.mutate,
    isLoading: registerMutation.isPending,
    error: registerMutation.error,
    data: registerMutation.data,
  }
}

export function useCheckEmail(email: string, enabled = false) {
  const [debouncedEmail, setDebouncedEmail] = useState(email)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedEmail(email)
    }, 500) // 500ms debounce

    return () => clearTimeout(timer)
  }, [email])

  return useQuery({
    queryKey: ['checkEmail', debouncedEmail],
    queryFn: () => checkEmailAvailable(debouncedEmail),
    enabled: enabled && debouncedEmail.length > 0,
  })
}

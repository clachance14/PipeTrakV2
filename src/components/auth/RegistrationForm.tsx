import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useRegistration } from '@/hooks/useRegistration'
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
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'

const registrationSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  full_name: z.string().min(1, 'Full name is required'),
  organization_name: z.string().min(1, 'Organization name is required'),
  accept_terms: z.boolean().refine((val) => val === true, {
    message: 'You must accept the terms of service',
  }),
})

type RegistrationFormValues = z.infer<typeof registrationSchema>

export function RegistrationForm() {
  const navigate = useNavigate()
  const { register, isLoading, error } = useRegistration()
  const [submitting, setSubmitting] = useState(false)

  const form = useForm<RegistrationFormValues>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      email: '',
      password: '',
      full_name: '',
      organization_name: '',
      accept_terms: false,
    },
  })

  const onSubmit = async (values: RegistrationFormValues) => {
    setSubmitting(true)
    try {
      await new Promise<void>((resolve, reject) => {
        register(
          {
            email: values.email,
            password: values.password,
            fullName: values.full_name,
            orgName: values.organization_name,
          },
          {
            onSuccess: (data: any) => {
              if (data.requiresConfirmation) {
                toast.success('Account created! Check your email to confirm.')
                navigate('/check-email', { state: { email: values.email } })
              } else {
                toast.success('Account created successfully!')
                navigate('/dashboard')
              }
              resolve()
            },
            onError: (err) => {
              const errorMessage = err.message || 'Registration failed'
              if (errorMessage.includes('EMAIL_ALREADY_REGISTERED')) {
                toast.error('Email already registered')
                form.setError('email', {
                  message: 'This email is already registered',
                })
              } else if (errorMessage.includes('PASSWORD_TOO_SHORT')) {
                toast.error('Password too short')
                form.setError('password', {
                  message: 'Password must be at least 6 characters',
                })
              } else {
                toast.error('Registration failed. Please try again.')
              }
              reject(err)
            },
          }
        )
      })
    } catch (err) {
      // Error already handled above
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  placeholder="john.doe@example.com"
                  {...field}
                />
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
          name="organization_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Organization Name</FormLabel>
              <FormControl>
                <Input placeholder="Acme Construction Co." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="accept_terms"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>
                  I accept the{' '}
                  <a
                    href="/legal/terms"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 underline"
                  >
                    Terms of Service
                  </a>
                </FormLabel>
                <FormMessage />
              </div>
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full bg-blue-600 text-white hover:bg-blue-700 font-semibold py-2.5" disabled={submitting || isLoading}>
          {submitting || isLoading ? 'Creating Account...' : 'Create Account'}
        </Button>

        {error && (
          <div className="text-sm text-red-500">
            {error.message || 'An error occurred during registration'}
          </div>
        )}
      </form>
    </Form>
  )
}

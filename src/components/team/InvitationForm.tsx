import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useInvitations } from '@/hooks/useInvitations'
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
import { RoleSelector } from './RoleSelector'
import type { UserRole } from '@/lib/permissions'
import { toast } from 'sonner'

const invitationSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.enum([
    'owner',
    'admin',
    'project_manager',
    'foreman',
    'qc_inspector',
    'welder',
    'viewer',
  ]),
})

type InvitationFormValues = z.infer<typeof invitationSchema>

interface InvitationFormProps {
  currentUserRole?: UserRole
  onSuccess?: () => void
}

export function InvitationForm({ currentUserRole, onSuccess }: InvitationFormProps) {
  const { createInvitationMutation } = useInvitations()
  const [invitationLink, setInvitationLink] = useState<string | null>(null)

  const form = useForm<InvitationFormValues>({
    resolver: zodResolver(invitationSchema),
    defaultValues: {
      email: '',
      role: 'viewer',
    },
  })

  const onSubmit = async (values: InvitationFormValues) => {
    createInvitationMutation.mutate(
      {
        email: values.email,
        role: values.role,
      },
      {
        onSuccess: (data) => {
          if (data.email_sent) {
            toast.success(`Invitation sent to ${values.email}`)
          } else {
            // Email failed but invitation created (FR-041)
            toast.error(`Failed to send email to ${values.email}`)
            setInvitationLink(data.invitation.invitation_link)
          }
          form.reset()
          onSuccess?.()
        },
        onError: (error: Error) => {
          const message = error.message || 'Failed to create invitation'

          if (message.includes('DUPLICATE_INVITATION')) {
            toast.error('This user has already been invited')
            form.setError('email', {
              message: 'An invitation has already been sent to this email',
            })
          } else if (message.includes('USER_ALREADY_MEMBER')) {
            toast.error('This user is already a member')
            form.setError('email', {
              message: 'This email is already a member of the organization',
            })
          } else if (message.includes('INVALID_ROLE')) {
            toast.error('Invalid role selected')
          } else if (message.includes('INSUFFICIENT_PERMISSIONS')) {
            toast.error('You do not have permission to invite users')
          } else {
            toast.error('Failed to create invitation')
          }
        },
      }
    )
  }

  return (
    <div className="space-y-4">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email Address</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="colleague@example.com"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="role"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Role</FormLabel>
                <FormControl>
                  <RoleSelector
                    value={field.value}
                    onChange={field.onChange}
                    currentUserRole={currentUserRole}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button
            type="submit"
            className="w-full"
            disabled={createInvitationMutation.isPending}
          >
            {createInvitationMutation.isPending ? 'Sending...' : 'Send Invitation'}
          </Button>
        </form>
      </Form>

      {invitationLink && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
          <p className="text-sm font-medium text-yellow-800 mb-2">
            Email failed to send. Share this link manually:
          </p>
          <div className="flex items-center gap-2">
            <Input
              value={invitationLink}
              readOnly
              className="text-xs"
              onClick={(e) => e.currentTarget.select()}
            />
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                navigator.clipboard.writeText(invitationLink)
                toast.success('Link copied to clipboard')
              }}
            >
              Copy
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

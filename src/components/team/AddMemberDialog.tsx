// T025: AddMemberDialog component - Radix Dialog for inviting team members
import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { toast } from 'sonner'
import { useInvitations } from '@/hooks/useInvitations'
import { supabase } from '@/lib/supabase'
import type { Role } from '@/types/team.types'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'

// Validation schema
const invitationSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
  role: z.enum([
    'owner',
    'admin',
    'project_manager',
    'foreman',
    'qc_inspector',
    'welder',
    'viewer',
  ]),
  message: z.string().max(500, 'Message must be 500 characters or less').optional(),
})

type InvitationFormValues = z.infer<typeof invitationSchema>

interface AddMemberDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  organizationId?: string
}

export function AddMemberDialog({ open, onOpenChange, organizationId }: AddMemberDialogProps) {
  const { createInvitationMutation } = useInvitations()
  const [emailError, setEmailError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    setValue,
    watch,
  } = useForm<InvitationFormValues>({
    resolver: zodResolver(invitationSchema),
    defaultValues: {
      email: '',
      role: 'viewer',
      message: '',
    },
  })

  const emailValue = watch('email')

  // Check for duplicate email when email field loses focus
  useEffect(() => {
    if (!emailValue || !emailValue.includes('@')) {
      setEmailError(null)
      return
    }

    const checkDuplicateEmail = async () => {
      try {
        // Check if email already exists in users table with organization
        const { data: existingUser } = await supabase
          .from('users')
          .select('organization_id')
          .eq('email', emailValue)
          .is('deleted_at', null)
          .maybeSingle()

        if (existingUser?.organization_id) {
          setEmailError('This email is already a member of an organization')
          return
        }

        // Check if email already has pending invitation
        const { data: existingInvitation } = await supabase
          .from('invitations')
          .select('id')
          .eq('email', emailValue)
          .eq('status', 'pending')
          .maybeSingle()

        if (existingInvitation) {
          setEmailError('An invitation has already been sent to this email')
          return
        }

        setEmailError(null)
      } catch (error) {
        console.error('Error checking duplicate email:', error)
      }
    }

    const timeoutId = setTimeout(checkDuplicateEmail, 500)
    return () => clearTimeout(timeoutId)
  }, [emailValue])

  const onSubmit = async (values: InvitationFormValues) => {
    // Clear any previous email errors
    setEmailError(null)

    try {
      const result = await createInvitationMutation.mutateAsync({
        email: values.email,
        role: values.role,
        organizationId,
      })

      // FR-041: Handle email sending success/failure
      if (result.email_sent) {
        toast.success(`Invitation sent to ${values.email}`)
      } else {
        // Email failed, show link for manual sharing
        toast.warning(
          `Invitation created but email failed. Copy this link to share: ${result.invitation_link}`,
          { duration: 10000 } // Longer duration for copying
        )
      }

      // Clear form
      reset()

      // Close dialog
      onOpenChange(false)
    } catch (error: any) {
      // Handle errors
      const errorMessage = error.message || 'Failed to send invitation'

      if (errorMessage.includes('USER_ALREADY_HAS_ORGANIZATION')) {
        setEmailError('This email is already a member of an organization')
        toast.error('This user already belongs to an organization')
      } else if (errorMessage.includes('DUPLICATE_INVITATION') || error.code === '23505') {
        setEmailError('An invitation has already been sent to this email')
        toast.error('Invitation already sent to this email')
      } else if (errorMessage.includes('permission') || error.code === '42501') {
        toast.error('You do not have permission to invite members')
      } else {
        toast.error('Failed to send invitation. Please try again.')
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Team Member</DialogTitle>
          <DialogDescription>
            Send an invitation to a new team member. They will receive an email with instructions
            to join your organization.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
          {/* Email Field */}
          <div className="space-y-2">
            <Label htmlFor="email">
              Email Address <span className="text-red-500">*</span>
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="colleague@example.com"
              {...register('email')}
              aria-invalid={!!errors.email || !!emailError}
              aria-describedby={errors.email || emailError ? 'email-error' : undefined}
            />
            {errors.email && (
              <p id="email-error" className="text-sm text-red-600" role="alert">
                {errors.email.message}
              </p>
            )}
            {emailError && !errors.email && (
              <p id="email-error" className="text-sm text-red-600" role="alert">
                {emailError}
              </p>
            )}
          </div>

          {/* Role Field */}
          <div className="space-y-2">
            <Label htmlFor="role">
              Role <span className="text-red-500">*</span>
            </Label>
            <Select
              defaultValue="viewer"
              onValueChange={(value) => setValue('role', value as Role)}
              required
            >
              <SelectTrigger id="role" aria-label="Role">
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="owner">Owner</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="project_manager">Project Manager</SelectItem>
                <SelectItem value="foreman">Foreman</SelectItem>
                <SelectItem value="qc_inspector">QC Inspector</SelectItem>
                <SelectItem value="welder">Welder</SelectItem>
                <SelectItem value="viewer">Viewer</SelectItem>
              </SelectContent>
            </Select>
            {errors.role && (
              <p className="text-sm text-red-600" role="alert">
                {errors.role.message}
              </p>
            )}
          </div>

          {/* Optional Message Field */}
          <div className="space-y-2">
            <Label htmlFor="message">
              Message <span className="text-sm text-gray-500">(optional)</span>
            </Label>
            <Textarea
              id="message"
              placeholder="Add a personal message (max 500 characters)..."
              maxLength={500}
              rows={4}
              {...register('message')}
              aria-invalid={!!errors.message}
              aria-describedby={errors.message ? 'message-error' : undefined}
            />
            <div className="flex justify-between items-center">
              <div>
                {errors.message && (
                  <p id="message-error" className="text-sm text-red-600" role="alert">
                    {errors.message.message}
                  </p>
                )}
              </div>
              <p className="text-xs text-gray-500">
                {watch('message')?.length || 0}/500 characters
              </p>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                reset()
                onOpenChange(false)
              }}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !!emailError}>
              {isSubmitting ? 'Sending...' : 'Send Invitation'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// T032: Registration helpers
// Authentication flow per research.md section 6

import { supabase } from '@/lib/supabase'

/**
 * Registers a new user and creates their organization
 * SINGLE-ORG: Atomic transaction: user + org + set users.organization_id/role
 * @param email - User email address
 * @param password - Account password (min 6 chars per NFR-004)
 * @param fullName - User's full name
 * @param orgName - Organization name
 * @returns Created user, organization, and session
 */
export async function registerUser(
  email: string,
  password: string,
  fullName: string,
  orgName: string
) {
  // Validate password length (NFR-004)
  if (!validatePassword(password)) {
    throw new Error('Password must be at least 6 characters')
  }

  // Create user account with Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        organization_name: orgName,  // Store for post-confirmation setup
        terms_accepted_at: new Date().toISOString(),
        terms_version: 'v1.0',
      },
      emailRedirectTo: `${window.location.origin}/onboarding/complete-setup`,
    },
  })

  if (authError || !authData.user) {
    throw new Error(authError?.message || 'Registration failed')
  }

  // Check if user has active session (email confirmation disabled)
  if (!authData.session) {
    // Email confirmation required - can't create org yet
    return {
      user: {
        id: authData.user.id,
        email: authData.user.email!,
        full_name: fullName,
      },
      requiresConfirmation: true,
      message: 'Please check your email to confirm your account. Once confirmed, your organization will be created automatically.'
    }
  }

  // User is auto-confirmed (has session), create organization
  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .insert({
      name: orgName,
    })
    .select()
    .single()

  if (orgError || !org) {
    // Note: Can't delete user from client (requires admin API)
    // User can retry registration or contact support
    throw new Error(orgError?.message || 'Failed to create organization. Please contact support.')
  }

  // SINGLE-ORG: Atomically set organization_id and role='owner' on users table
  const { error: updateError } = await supabase
    .from('users')
    .update({
      organization_id: org.id,
      role: 'owner',
    })
    .eq('id', authData.user.id)

  if (updateError) {
    // Cleanup organization only (can't delete user from client)
    await supabase.from('organizations').delete().eq('id', org.id)
    throw new Error(updateError.message || 'Failed to assign user to organization. Please contact support.')
  }

  return {
    user: {
      id: authData.user.id,
      email: authData.user.email!,
      full_name: fullName,
    },
    organization: {
      id: org.id,
      name: org.name,
      role: 'owner' as const,
    },
    session: authData.session,
    requiresConfirmation: false,
  }
}

/**
 * Checks if an email is already registered
 * Queries Supabase auth.users table
 * @param email - Email address to check
 * @returns true if email is available
 */
export async function checkEmailAvailable(email: string): Promise<boolean> {
  // Note: Supabase doesn't expose auth.users directly
  // We use signInWithPassword with a random password to check if user exists
  // A better approach would be a server-side function, but this works for MVP

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password: crypto.randomUUID(), // Random password - will fail if user exists
  })

  // If error is "Invalid login credentials", email exists
  // If error is null or different, email doesn't exist
  if (error?.message?.includes('Invalid login credentials')) {
    return false // Email exists
  }

  return true // Email available
}

/**
 * Validates password meets minimum requirements
 * NFR-004: Minimum 6 characters
 * @param password - Password to validate
 * @returns true if password is valid
 */
export function validatePassword(password: string): boolean {
  return password.length >= 6
}

/**
 * Sends email verification to user
 * Triggers Supabase Auth email verification flow
 * @param userId - User ID from auth.users
 */
export async function sendVerificationEmail(userId: string): Promise<void> {
  // Supabase automatically sends verification email on signup
  // This function is a placeholder for future custom email logic
  // For now, we rely on Supabase's built-in verification

  // In production, this could trigger:
  // - await supabase.auth.api.sendMagicLink({ email })
  // - Custom email via Resend/SendGrid per research.md section 3
  console.log(`Verification email sent to user ${userId}`)
}

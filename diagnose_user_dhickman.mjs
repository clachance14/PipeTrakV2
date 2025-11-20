import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

// Read environment variables
const envContent = readFileSync('.env', 'utf-8')
let supabaseUrl = ''
let supabaseAnonKey = ''
let supabaseServiceKey = ''

envContent.split('\n').forEach(line => {
  const trimmed = line.trim()
  if (trimmed.startsWith('VITE_SUPABASE_URL=')) {
    supabaseUrl = trimmed.substring('VITE_SUPABASE_URL='.length).trim()
  }
  if (trimmed.startsWith('VITE_SUPABASE_ANON_KEY=')) {
    supabaseAnonKey = trimmed.substring('VITE_SUPABASE_ANON_KEY='.length).trim()
  }
  if (trimmed.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) {
    supabaseServiceKey = trimmed.substring('SUPABASE_SERVICE_ROLE_KEY='.length).trim()
  }
})

const userEmail = 'dhickman@ics.ac'

console.log('='.repeat(80))
console.log(`DIAGNOSTIC REPORT FOR USER: ${userEmail}`)
console.log('='.repeat(80))
console.log()

// Service role client (bypasses RLS, for admin queries)
const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false, autoRefreshToken: false }
})

// Anon client (respects RLS, for user-context queries)
const anonClient = createClient(supabaseUrl, supabaseAnonKey)

// 1. Check auth.users table (requires service role)
console.log('1. CHECKING AUTH.USERS TABLE (Supabase Auth)')
console.log('-'.repeat(80))
const { data: authUser, error: authError } = await adminClient.auth.admin.listUsers()

if (authError) {
  console.log('❌ Error querying auth.users:', authError.message)
} else {
  const user = authUser.users.find(u => u.email === userEmail)
  if (user) {
    console.log('✅ User found in auth.users')
    console.log('   - ID:', user.id)
    console.log('   - Email:', user.email)
    console.log('   - Email Confirmed:', user.email_confirmed_at ? '✅ YES' : '❌ NO')
    console.log('   - Created At:', user.created_at)
    console.log('   - Last Sign In:', user.last_sign_in_at || 'Never')
    console.log('   - Banned:', user.banned_until ? `❌ YES (until ${user.banned_until})` : '✅ NO')
    console.log('   - App Metadata:', JSON.stringify(user.app_metadata, null, 2))
    console.log('   - User Metadata:', JSON.stringify(user.user_metadata, null, 2))
  } else {
    console.log('❌ User NOT found in auth.users')
    console.log('   → This means the user has never signed up or the signup failed')
  }
}
console.log()

// 2. Check public.users table
console.log('2. CHECKING PUBLIC.USERS TABLE (Application User Profile)')
console.log('-'.repeat(80))
const { data: publicUsers, error: publicUsersError } = await adminClient
  .from('users')
  .select('*')
  .eq('email', userEmail)

if (publicUsersError) {
  console.log('❌ Error querying public.users:', publicUsersError.message)
} else {
  if (publicUsers && publicUsers.length > 0) {
    const user = publicUsers[0]
    console.log('✅ User found in public.users')
    console.log('   - User ID:', user.user_id)
    console.log('   - Email:', user.email)
    console.log('   - Full Name:', user.full_name || 'Not set')
    console.log('   - Role:', user.role || 'Not set')
    console.log('   - Organization ID:', user.organization_id || 'Not set')
    console.log('   - Created At:', user.created_at)
    console.log('   - Updated At:', user.updated_at)
  } else {
    console.log('❌ User NOT found in public.users')
    console.log('   → User may exist in auth but profile was not created')
  }
}
console.log()

// 3. Check invitations table
console.log('3. CHECKING INVITATIONS TABLE')
console.log('-'.repeat(80))
const { data: invitations, error: invitationsError } = await adminClient
  .from('invitations')
  .select('*')
  .eq('email', userEmail)

if (invitationsError) {
  console.log('❌ Error querying invitations:', invitationsError.message)
} else {
  if (invitations && invitations.length > 0) {
    console.log(`✅ Found ${invitations.length} invitation(s)`)
    invitations.forEach((inv, idx) => {
      console.log(`   Invitation ${idx + 1}:`)
      console.log('   - ID:', inv.id)
      console.log('   - Organization ID:', inv.organization_id)
      console.log('   - Role:', inv.role)
      console.log('   - Status:', inv.status)
      console.log('   - Accepted At:', inv.accepted_at || 'Not accepted')
      console.log('   - Expires At:', inv.expires_at)
      console.log('   - Created At:', inv.created_at)
      console.log()
    })
  } else {
    console.log('ℹ️  No invitations found')
  }
}
console.log()

// 4. Check organization_members (if user exists in public.users)
if (publicUsers && publicUsers.length > 0) {
  const userId = publicUsers[0].user_id

  console.log('4. CHECKING ORGANIZATION_MEMBERS TABLE')
  console.log('-'.repeat(80))
  const { data: orgMembers, error: orgMembersError } = await adminClient
    .from('organization_members')
    .select('*, organizations(*)')
    .eq('user_id', userId)

  if (orgMembersError) {
    console.log('❌ Error querying organization_members:', orgMembersError.message)
  } else {
    if (orgMembers && orgMembers.length > 0) {
      console.log(`✅ User is member of ${orgMembers.length} organization(s)`)
      orgMembers.forEach((member, idx) => {
        console.log(`   Organization ${idx + 1}:`)
        console.log('   - Org ID:', member.organization_id)
        console.log('   - Org Name:', member.organizations?.name || 'Unknown')
        console.log('   - Role:', member.role)
        console.log('   - Joined At:', member.created_at)
        console.log()
      })
    } else {
      console.log('❌ User NOT member of any organization')
      console.log('   → This will prevent access to any projects')
    }
  }
  console.log()

  // 5. Check project_members
  console.log('5. CHECKING PROJECT_MEMBERS TABLE')
  console.log('-'.repeat(80))
  const { data: projectMembers, error: projectMembersError } = await adminClient
    .from('project_members')
    .select('*, projects(id, name, organization_id)')
    .eq('user_id', userId)

  if (projectMembersError) {
    console.log('❌ Error querying project_members:', projectMembersError.message)
  } else {
    if (projectMembers && projectMembers.length > 0) {
      console.log(`✅ User has access to ${projectMembers.length} project(s)`)
      projectMembers.forEach((member, idx) => {
        console.log(`   Project ${idx + 1}:`)
        console.log('   - Project ID:', member.project_id)
        console.log('   - Project Name:', member.projects?.name || 'Unknown')
        console.log('   - Role:', member.role)
        console.log('   - Added At:', member.created_at)
        console.log()
      })
    } else {
      console.log('❌ User NOT member of any projects')
      console.log('   → User cannot access any project data')
    }
  }
  console.log()
}

// Summary and Recommendations
console.log('='.repeat(80))
console.log('DIAGNOSIS SUMMARY')
console.log('='.repeat(80))

const authUserExists = authUser?.users.find(u => u.email === userEmail)
const publicUserExists = publicUsers && publicUsers.length > 0

if (!authUserExists) {
  console.log('❌ BLOCKING ISSUE: User does not exist in Supabase Auth')
  console.log('   RECOMMENDATION: User needs to sign up or an invitation needs to be sent')
} else if (!authUserExists.email_confirmed_at) {
  console.log('❌ BLOCKING ISSUE: Email not verified')
  console.log('   RECOMMENDATION: Resend verification email or manually verify email in Supabase dashboard')
} else if (authUserExists.banned_until) {
  console.log('❌ BLOCKING ISSUE: Account is banned')
  console.log('   RECOMMENDATION: Unban the user in Supabase dashboard')
} else if (!publicUserExists) {
  console.log('❌ BLOCKING ISSUE: User exists in auth but not in public.users table')
  console.log('   RECOMMENDATION: Create user profile in public.users table')
} else {
  console.log('✅ User account appears to be in good standing')
  console.log('   - Check if user is using correct password')
  console.log('   - Check browser console for any client-side errors')
  console.log('   - Check Supabase Auth logs for failed login attempts')
}

console.log()
console.log('='.repeat(80))

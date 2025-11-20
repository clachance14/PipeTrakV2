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
console.log(`COMPREHENSIVE DIAGNOSTIC REPORT FOR USER: ${userEmail}`)
console.log(`Generated at: ${new Date().toISOString()}`)
console.log('='.repeat(80))
console.log()

// Service role client (bypasses RLS, for admin queries)
const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false, autoRefreshToken: false }
})

// 1. Check auth.users table (requires service role)
console.log('1. SUPABASE AUTH STATUS')
console.log('-'.repeat(80))
const { data: authUser, error: authError } = await adminClient.auth.admin.listUsers()

let authUserId = null

if (authError) {
  console.log('❌ Error querying auth.users:', authError.message)
} else {
  const user = authUser.users.find(u => u.email === userEmail)
  if (user) {
    authUserId = user.id
    console.log('✅ User found in Supabase Auth')
    console.log('   - Auth ID:', user.id)
    console.log('   - Email:', user.email)
    console.log('   - Email Confirmed:', user.email_confirmed_at ? `✅ YES (${user.email_confirmed_at})` : '❌ NO')
    console.log('   - Phone Confirmed:', user.phone_confirmed_at ? `✅ YES (${user.phone_confirmed_at})` : 'No')
    console.log('   - Created At:', user.created_at)
    console.log('   - Last Sign In:', user.last_sign_in_at || '❌ Never')

    if (user.last_sign_in_at) {
      const lastSignIn = new Date(user.last_sign_in_at)
      const now = new Date()
      const hoursSince = Math.floor((now - lastSignIn) / (1000 * 60 * 60))
      const minutesSince = Math.floor((now - lastSignIn) / (1000 * 60))

      if (minutesSince < 60) {
        console.log(`   - Time Since Last Login: ${minutesSince} minutes ago`)
      } else if (hoursSince < 24) {
        console.log(`   - Time Since Last Login: ${hoursSince} hours ago`)
      } else {
        console.log(`   - Time Since Last Login: ${Math.floor(hoursSince / 24)} days ago`)
      }
    }

    console.log('   - Banned:', user.banned_until ? `❌ YES (until ${user.banned_until})` : '✅ NO')
    console.log('   - Confirmed:', user.confirmed_at ? '✅ YES' : '❌ NO')
    console.log('   - App Metadata:', JSON.stringify(user.app_metadata, null, 2))
    console.log('   - User Metadata:', JSON.stringify(user.user_metadata, null, 2))
  } else {
    console.log('❌ User NOT found in Supabase Auth')
    console.log('   → User has never signed up')
  }
}
console.log()

// 2. Check public.users table
console.log('2. APPLICATION USER PROFILE')
console.log('-'.repeat(80))
const { data: publicUsers, error: publicUsersError } = await adminClient
  .from('users')
  .select('*')
  .eq('email', userEmail)

let publicUser = null

if (publicUsersError) {
  console.log('❌ Error querying public.users:', publicUsersError.message)
} else {
  if (publicUsers && publicUsers.length > 0) {
    publicUser = publicUsers[0]
    console.log('✅ User profile found in public.users')
    console.log('   - User ID:', publicUser.id)
    console.log('   - Email:', publicUser.email)
    console.log('   - Full Name:', publicUser.full_name || '❌ Not set')
    console.log('   - Role:', publicUser.role || '❌ Not set')
    console.log('   - Organization ID:', publicUser.organization_id || '❌ Not set')
    console.log('   - Is Demo User:', publicUser.is_demo_user ? 'Yes' : 'No')
    console.log('   - Is Super Admin:', publicUser.is_super_admin ? 'Yes' : 'No')
    console.log('   - Demo Expires At:', publicUser.demo_expires_at || 'N/A')
    console.log('   - Deleted At:', publicUser.deleted_at ? `❌ DELETED (${publicUser.deleted_at})` : '✅ Active')
    console.log('   - Terms Accepted:', publicUser.terms_accepted_at ? `✅ YES (${publicUser.terms_accepted_at})` : '❌ NO')
    console.log('   - Terms Version:', publicUser.terms_version || 'N/A')
    console.log('   - Created At:', publicUser.created_at)
    console.log('   - Updated At:', publicUser.updated_at)
  } else {
    console.log('❌ User profile NOT found in public.users')
    console.log('   → User exists in auth but profile was not created')
  }
}
console.log()

// 3. Check organization details
if (publicUser && publicUser.organization_id) {
  console.log('3. ORGANIZATION DETAILS')
  console.log('-'.repeat(80))

  const { data: org, error: orgError } = await adminClient
    .from('organizations')
    .select('*')
    .eq('id', publicUser.organization_id)
    .single()

  if (orgError) {
    console.log('❌ Error querying organization:', orgError.message)
  } else if (org) {
    console.log('✅ Organization found')
    console.log('   - Organization ID:', org.id)
    console.log('   - Name:', org.name)
    console.log('   - Status:', org.deleted_at ? `❌ DELETED (${org.deleted_at})` : '✅ Active')
    console.log('   - Created At:', org.created_at)
  } else {
    console.log('❌ Organization NOT found')
    console.log('   → Organization may have been deleted')
  }
  console.log()
}

// 4. Check projects for this organization
if (publicUser && publicUser.organization_id) {
  console.log('4. ACCESSIBLE PROJECTS')
  console.log('-'.repeat(80))

  const { data: projects, error: projectsError } = await adminClient
    .from('projects')
    .select('*')
    .eq('organization_id', publicUser.organization_id)

  if (projectsError) {
    console.log('❌ Error querying projects:', projectsError.message)
  } else if (projects && projects.length > 0) {
    console.log(`✅ Found ${projects.length} project(s) in user's organization`)
    projects.forEach((project, idx) => {
      console.log(`   Project ${idx + 1}:`)
      console.log('   - ID:', project.id)
      console.log('   - Name:', project.name)
      console.log('   - Code:', project.code || 'N/A')
      console.log('   - Status:', project.deleted_at ? `❌ DELETED (${project.deleted_at})` : '✅ Active')
      console.log('   - Created At:', project.created_at)
      console.log()
    })
  } else {
    console.log('❌ No projects found for this organization')
    console.log('   → User cannot access any project data')
  }
  console.log()
}

// 5. Check invitations
console.log('5. INVITATION HISTORY')
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
      const isExpired = new Date(inv.expires_at) < new Date()
      console.log(`   Invitation ${idx + 1}:`)
      console.log('   - ID:', inv.id)
      console.log('   - Organization ID:', inv.organization_id)
      console.log('   - Role:', inv.role)
      console.log('   - Status:', inv.status)
      console.log('   - Accepted At:', inv.accepted_at || '❌ Not accepted')
      console.log('   - Expires At:', inv.expires_at, isExpired ? '❌ EXPIRED' : '✅ Valid')
      console.log('   - Created At:', inv.created_at)
      console.log()
    })
  } else {
    console.log('ℹ️  No invitations found')
  }
}
console.log()

// 6. Check for any components owned by this user
if (publicUser) {
  console.log('6. USER ACTIVITY CHECK')
  console.log('-'.repeat(80))

  const { count: componentCount, error: componentError } = await adminClient
    .from('components')
    .select('*', { count: 'exact', head: true })
    .eq('created_by', publicUser.id)

  if (!componentError) {
    console.log('   - Components created:', componentCount || 0)
  }

  const { count: drawingCount, error: drawingError } = await adminClient
    .from('drawings')
    .select('*', { count: 'exact', head: true })
    .eq('created_by', publicUser.id)

  if (!drawingError) {
    console.log('   - Drawings created:', drawingCount || 0)
  }

  console.log()
}

// Summary and Recommendations
console.log('='.repeat(80))
console.log('DIAGNOSIS SUMMARY & RECOMMENDATIONS')
console.log('='.repeat(80))

const issues = []
const warnings = []

if (!authUserId) {
  issues.push('User does not exist in Supabase Auth - user needs to sign up')
} else {
  const user = authUser.users.find(u => u.email === userEmail)

  if (!user.email_confirmed_at) {
    issues.push('Email not verified - resend verification email')
  }

  if (user.banned_until) {
    issues.push('Account is banned - unban in Supabase dashboard')
  }

  if (!publicUser) {
    issues.push('User profile missing in public.users - needs to be created')
  } else {
    if (publicUser.deleted_at) {
      issues.push('User profile is deleted - restore or create new profile')
    }

    if (!publicUser.organization_id) {
      warnings.push('User not associated with any organization')
    }

    if (!publicUser.terms_accepted_at) {
      warnings.push('User has not accepted terms of service')
    }
  }

  if (user.last_sign_in_at) {
    const hoursSince = Math.floor((new Date() - new Date(user.last_sign_in_at)) / (1000 * 60 * 60))
    if (hoursSince < 24) {
      console.log(`✅ USER HAS LOGGED IN RECENTLY (${hoursSince} hours ago)`)
      console.log('   → Login credentials are working')
      console.log('   → Issue may be with application access, not authentication')
      console.log()
    }
  }
}

if (issues.length > 0) {
  console.log('❌ BLOCKING ISSUES:')
  issues.forEach((issue, idx) => {
    console.log(`   ${idx + 1}. ${issue}`)
  })
  console.log()
}

if (warnings.length > 0) {
  console.log('⚠️  WARNINGS (may affect functionality):')
  warnings.forEach((warning, idx) => {
    console.log(`   ${idx + 1}. ${warning}`)
  })
  console.log()
}

if (issues.length === 0 && warnings.length === 0) {
  console.log('✅ NO BLOCKING ISSUES FOUND')
  console.log()
  console.log('Possible next steps:')
  console.log('   1. Ask user to try logging in again and note exact error message')
  console.log('   2. Check browser console for JavaScript errors')
  console.log('   3. Check Supabase Auth logs for failed authentication attempts')
  console.log('   4. Verify user is using correct password')
  console.log('   5. Check if browser is blocking cookies or local storage')
  console.log()
}

console.log('='.repeat(80))

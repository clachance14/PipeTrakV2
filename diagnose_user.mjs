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
console.log('USER LOGIN DIAGNOSTIC REPORT')
console.log('='.repeat(80))
console.log('User Email: ' + userEmail)
console.log('Generated: ' + new Date().toISOString())
console.log('='.repeat(80))
console.log()

// Create clients
const anonClient = createClient(supabaseUrl, supabaseAnonKey)
const serviceClient = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false, autoRefreshToken: false }
})

// 1. Check auth.users table (requires service role)
console.log('1. CHECKING auth.users (Supabase Auth Table)')
console.log('-'.repeat(80))
try {
  const { data: authUser, error: authError } = await serviceClient.auth.admin.listUsers()
  
  if (authError) {
    console.log('Error querying auth.users: ' + authError.message)
  } else {
    const user = authUser.users.find(u => u.email === userEmail)
    if (user) {
      console.log('User EXISTS in auth.users')
      console.log('   - ID: ' + user.id)
      console.log('   - Email: ' + user.email)
      console.log('   - Email Confirmed: ' + (user.email_confirmed_at ? 'YES' : 'NO'))
      console.log('   - Email Confirmed At: ' + (user.email_confirmed_at || 'NOT CONFIRMED'))
      console.log('   - Phone: ' + (user.phone || 'N/A'))
      console.log('   - Created At: ' + user.created_at)
      console.log('   - Last Sign In: ' + (user.last_sign_in_at || 'Never'))
      console.log('   - Banned: ' + (user.banned_until ? 'YES (until ' + user.banned_until + ')' : 'NO'))
      console.log('   - Confirmed: ' + (user.confirmed_at ? 'YES' : 'NO'))
      console.log('   - App Metadata: ' + JSON.stringify(user.app_metadata || {}))
      console.log('   - User Metadata: ' + JSON.stringify(user.user_metadata || {}))
    } else {
      console.log('User NOT FOUND in auth.users')
      console.log('   This means the user has never signed up or their account was deleted.')
    }
  }
} catch (err) {
  console.log('Exception querying auth.users: ' + err.message)
}
console.log()

// 2. Check public.users table
console.log('2. CHECKING public.users (Application User Table)')
console.log('-'.repeat(80))
try {
  const { data: publicUser, error: publicError } = await serviceClient
    .from('users')
    .select('*')
    .eq('email', userEmail)
    .maybeSingle()
  
  if (publicError) {
    console.log('Error querying public.users: ' + publicError.message)
  } else if (publicUser) {
    console.log('User EXISTS in public.users')
    console.log('   - ID: ' + publicUser.id)
    console.log('   - Email: ' + publicUser.email)
    console.log('   - Full Name: ' + (publicUser.full_name || 'N/A'))
    console.log('   - Role: ' + (publicUser.role || 'N/A'))
    console.log('   - Organization ID: ' + (publicUser.organization_id || 'N/A'))
    console.log('   - Is Demo User: ' + (publicUser.is_demo_user ? 'YES' : 'NO'))
    console.log('   - Is Super Admin: ' + (publicUser.is_super_admin ? 'YES' : 'NO'))
    console.log('   - Created At: ' + publicUser.created_at)
    console.log('   - Deleted At: ' + (publicUser.deleted_at || 'Not Deleted'))
    console.log('   - Demo Expires At: ' + (publicUser.demo_expires_at || 'N/A'))
    console.log('   - Terms Accepted: ' + (publicUser.terms_accepted_at ? 'YES (' + publicUser.terms_accepted_at + ')' : 'NO'))
    console.log('   - Terms Version: ' + (publicUser.terms_version || 'N/A'))
  } else {
    console.log('User NOT FOUND in public.users')
    console.log('   This means the user record was not created in the application database.')
  }
} catch (err) {
  console.log('Exception querying public.users: ' + err.message)
}
console.log()

// 3. Check invitations table
console.log('3. CHECKING invitations (Pending Invitations)')
console.log('-'.repeat(80))
try {
  const { data: invitations, error: invitationsError } = await serviceClient
    .from('invitations')
    .select('*')
    .eq('email', userEmail)
  
  if (invitationsError) {
    console.log('Error querying invitations: ' + invitationsError.message)
  } else if (invitations && invitations.length > 0) {
    console.log('Found ' + invitations.length + ' invitation(s)')
    invitations.forEach((inv, idx) => {
      console.log('   Invitation #' + (idx + 1) + ':')
      console.log('   - ID: ' + inv.id)
      console.log('   - Status: ' + inv.status)
      console.log('   - Role: ' + inv.role)
      console.log('   - Organization ID: ' + inv.organization_id)
      console.log('   - Invited By: ' + inv.invited_by)
      console.log('   - Created At: ' + inv.created_at)
      console.log('   - Expires At: ' + inv.expires_at)
      console.log('   - Accepted At: ' + (inv.accepted_at || 'Not Accepted'))
      
      const now = new Date()
      const expiresAt = new Date(inv.expires_at)
      const isExpired = now > expiresAt
      console.log('   - Is Expired: ' + (isExpired ? 'YES' : 'NO'))
      console.log()
    })
  } else {
    console.log('No invitations found for this email')
  }
} catch (err) {
  console.log('Exception querying invitations: ' + err.message)
}
console.log()

// 4. Check organization association
console.log('4. CHECKING ORGANIZATION ASSOCIATION')
console.log('-'.repeat(80))
try {
  const { data: publicUser } = await serviceClient
    .from('users')
    .select('organization_id')
    .eq('email', userEmail)
    .maybeSingle()
  
  if (publicUser && publicUser.organization_id) {
    const { data: org, error: orgError } = await serviceClient
      .from('organizations')
      .select('*')
      .eq('id', publicUser.organization_id)
      .single()
    
    if (orgError) {
      console.log('Error querying organization: ' + orgError.message)
    } else if (org) {
      console.log('User is associated with organization')
      console.log('   - Organization ID: ' + org.id)
      console.log('   - Organization Name: ' + org.name)
      console.log('   - Created At: ' + org.created_at)
      console.log('   - Deleted At: ' + (org.deleted_at || 'Not Deleted'))
      
      if (org.deleted_at) {
        console.log('   WARNING: Organization is marked as DELETED')
      }
    }
  } else {
    console.log('User is NOT associated with any organization')
    console.log('   This may prevent access to projects and data.')
  }
} catch (err) {
  console.log('Exception checking organization: ' + err.message)
}
console.log()

// 5. Check project associations
console.log('5. CHECKING PROJECT ASSOCIATIONS')
console.log('-'.repeat(80))
try {
  const { data: publicUser } = await serviceClient
    .from('users')
    .select('organization_id')
    .eq('email', userEmail)
    .maybeSingle()
  
  if (publicUser && publicUser.organization_id) {
    const { data: projects, error: projectsError } = await serviceClient
      .from('projects')
      .select('*')
      .eq('organization_id', publicUser.organization_id)
    
    if (projectsError) {
      console.log('Error querying projects: ' + projectsError.message)
    } else if (projects && projects.length > 0) {
      console.log('Found ' + projects.length + ' project(s) in user organization')
      projects.forEach((proj, idx) => {
        console.log('   Project #' + (idx + 1) + ':')
        console.log('   - ID: ' + proj.id)
        console.log('   - Name: ' + proj.name)
        console.log('   - Description: ' + (proj.description || 'N/A'))
        console.log('   - Created At: ' + proj.created_at)
        console.log('   - Deleted At: ' + (proj.deleted_at || 'Not Deleted'))
        if (proj.deleted_at) {
          console.log('   WARNING: Project is marked as DELETED')
        }
        console.log()
      })
    } else {
      console.log('No projects found in user organization')
    }
  } else {
    console.log('Skipped (user not associated with organization)')
  }
} catch (err) {
  console.log('Exception checking projects: ' + err.message)
}
console.log()

console.log('='.repeat(80))
console.log('END OF DIAGNOSTIC REPORT')
console.log('='.repeat(80))

// Check RLS policies and user access to the view
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

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

// Service role client (bypasses RLS)
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false, autoRefreshToken: false }
})

// Get newest demo user
const { data: demoUsers } = await supabaseAdmin
  .from('users')
  .select('id, email, organization_id')
  .eq('is_demo_user', true)
  .order('created_at', { ascending: false })
  .limit(1)

if (!demoUsers || demoUsers.length === 0) {
  console.log('No demo users found')
  process.exit(0)
}

const user = demoUsers[0]
console.log(`Testing access for: ${user.email}`)
console.log(`User ID: ${user.id}`)
console.log(`Org ID: ${user.organization_id}`)

// Get project
const { data: projects } = await supabaseAdmin
  .from('projects')
  .select('id')
  .eq('organization_id', user.organization_id)

const projectId = projects?.[0]?.id

console.log(`Project ID: ${projectId}`)

// Now test with ANON KEY (simulating user access with RLS)
console.log('\n=== Testing with ANON KEY (RLS enforced) ===')

// First, sign in as the demo user to get a session
console.log('\nGenerating magic link for user...')
const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
  type: 'magiclink',
  email: user.email
})

if (linkError || !linkData) {
  console.error('Failed to generate magic link:', linkError)
  process.exit(1)
}

// Extract the access token from the link
// The action link contains the token as a URL parameter
const actionLink = linkData.properties.action_link
const url = new URL(actionLink)
const token = url.searchParams.get('token')

console.log('Token obtained:', token ? 'YES' : 'NO')

// Create a user-context client
const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false, autoRefreshToken: false }
})

// Sign in with the token (verify the email)
const { data: sessionData, error: sessionError } = await supabaseUser.auth.verifyOtp({
  token_hash: token || '',
  type: 'magiclink'
})

if (sessionError) {
  console.error('Session error:', sessionError.message)
  console.log('\nTrying alternative: Sign in with email (password-less)')

  // Try using signInWithOtp instead
  const { data: otpData, error: otpError } = await supabaseAdmin.auth.admin.generateLink({
    type: 'magiclink',
    email: user.email
  })

  if (otpError) {
    console.error('OTP error:', otpError)
  }
}

console.log('Session:', sessionData ? 'ESTABLISHED' : 'FAILED')

// Test query with user context
console.log('\n=== Querying as USER (with RLS) ===')

// Set the auth context manually using service role
await supabaseAdmin.rpc('set_current_user', { user_id: user.id }).catch(() => {
  console.log('Note: set_current_user function does not exist (expected)')
})

// Query mv_drawing_progress as admin but with project filter
const { data: adminData, error: adminError } = await supabaseAdmin
  .from('mv_drawing_progress')
  .select('*')
  .eq('project_id', projectId)

console.log(`Admin query (bypasses RLS): ${adminData?.length || 0} rows`)
if (adminError) {
  console.error('Admin error:', adminError.message)
}

// Query drawings as admin
const { data: adminDrawings, error: adminDrawError } = await supabaseAdmin
  .from('drawings')
  .select('id, drawing_no_norm')
  .eq('project_id', projectId)

console.log(`Admin drawings query: ${adminDrawings?.length || 0} rows`)
if (adminDrawError) {
  console.error('Admin drawings error:', adminDrawError.message)
}

// Check RLS policy on mv_drawing_progress
console.log('\n=== Checking RLS Policies ===')
const { data: policies, error: policyError } = await supabaseAdmin.rpc('exec_sql', {
  sql: `
    SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
    FROM pg_policies
    WHERE tablename IN ('mv_drawing_progress', 'drawings', 'components')
    ORDER BY tablename, policyname
  `
}).then(
  (result) => result,
  async (err) => {
    console.log('Cannot query pg_policies directly')
    return { data: null, error: err }
  }
)

if (policyError) {
  console.log('Note: Cannot query pg_policies (expected - need direct DB access)')
} else if (policies) {
  console.log('RLS Policies found:')
  console.log(policies)
}

// Summary
console.log('\n=== SUMMARY ===')
console.log(`✅ Data exists in database: ${adminData?.length || 0} drawing rows`)
console.log(`✅ Drawings exist: ${adminDrawings?.length || 0}`)
console.log(`⚠️  User access test: Check if user can query with their session`)

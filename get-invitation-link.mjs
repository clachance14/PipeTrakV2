// Quick script to get the latest invitation link
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const envContent = readFileSync('.env', 'utf-8')
let supabaseUrl = ''
let supabaseServiceKey = ''

envContent.split('\n').forEach(line => {
  const trimmed = line.trim()
  if (trimmed.startsWith('VITE_SUPABASE_URL=')) {
    supabaseUrl = trimmed.substring('VITE_SUPABASE_URL='.length).trim()
  }
  if (trimmed.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) {
    supabaseServiceKey = trimmed.substring('SUPABASE_SERVICE_ROLE_KEY='.length).trim()
  }
})

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false, autoRefreshToken: false }
})

// Get the most recent pending invitation
const { data, error } = await supabase
  .from('invitations')
  .select('*')
  .eq('status', 'pending')
  .order('created_at', { ascending: false })
  .limit(1)
  .single()

if (error) {
  console.error('Error:', error.message)
  process.exit(1)
}

if (!data) {
  console.log('No pending invitations found')
  process.exit(0)
}

// The token is hashed in the database, so we can't retrieve the original
// But we can show the invitation details
console.log('\n📧 Latest Pending Invitation:')
console.log('Email:', data.email)
console.log('Role:', data.role)
console.log('Created:', new Date(data.created_at).toLocaleString())
console.log('Expires:', new Date(data.expires_at).toLocaleString())
console.log('\n⚠️  The invitation token is hashed in the database for security.')
console.log('You need to check the browser console for the invitation_link from the response.')
console.log('\nOr resend the invitation and watch for the warning toast with the link.')

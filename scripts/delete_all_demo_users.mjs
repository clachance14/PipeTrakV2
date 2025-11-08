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

// Service role bypasses RLS
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false, autoRefreshToken: false }
})

console.log('🔍 Finding all demo users...\n')

const { data: demoUsers, error: fetchError } = await supabase
  .from('users')
  .select('id, email, full_name, is_demo_user, demo_expires_at')
  .eq('is_demo_user', true)

if (fetchError) {
  console.error('❌ Error fetching demo users:', fetchError.message)
  process.exit(1)
}

if (!demoUsers || demoUsers.length === 0) {
  console.log('✅ No demo users found. Nothing to delete.')
  process.exit(0)
}

console.log(`Found ${demoUsers.length} demo user(s):\n`)
demoUsers.forEach((user, index) => {
  console.log(`${index + 1}. ${user.email} (${user.full_name})`)
})

console.log('\n⚠️  DELETING ALL DEMO USERS...\n')

// Delete each demo user (will cascade to organizations, projects, and all data)
for (const user of demoUsers) {
  console.log(`Deleting: ${user.email}...`)

  // Delete from auth.users (this triggers cascade to public.users via trigger)
  const { error: deleteAuthError } = await supabase.auth.admin.deleteUser(user.id)

  if (deleteAuthError) {
    console.error(`  ❌ Error deleting auth user: ${deleteAuthError.message}`)
  } else {
    console.log(`  ✅ Deleted successfully`)
  }
}

console.log('\n✅ All demo users deleted!')
console.log('📊 Cleanup complete. Organizations, projects, and all related data have been removed via cascade.')

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

console.log('🔍 Finding orphaned test users...\n')

// Find users with test email patterns OR no organization
const { data: users, error: fetchError } = await supabase
  .from('users')
  .select('id, email, full_name, organization_id, created_at')
  .or('email.like.test%@example.com,organization_id.is.null')

if (fetchError) {
  console.error('❌ Error fetching users:', fetchError.message)
  process.exit(1)
}

if (!users || users.length === 0) {
  console.log('✅ No orphaned users found.')
  process.exit(0)
}

// Filter out production users (those with orgs)
const orphanedUsers = users.filter(u => !u.organization_id)

if (orphanedUsers.length === 0) {
  console.log('✅ No orphaned users found (all have organizations).')
  process.exit(0)
}

console.log(`Found ${orphanedUsers.length} orphaned user(s):\n`)
orphanedUsers.forEach((user, index) => {
  const age = Math.round((Date.now() - new Date(user.created_at).getTime()) / 1000 / 60)
  console.log(`${index + 1}. ${user.email} (${user.full_name}) - created ${age} min ago`)
})

console.log('\n⚠️  These users have no organization and appear to be incomplete signups.')
console.log('⚠️  DELETING ORPHANED USERS...\n')

let successCount = 0
let failCount = 0

// Delete from public.users first
for (const user of orphanedUsers) {
  const { error: deleteError } = await supabase
    .from('users')
    .delete()
    .eq('id', user.id)

  if (deleteError) {
    failCount++
    console.log(`  ❌ ${user.email}: ${deleteError.message}`)
  } else {
    successCount++
    console.log(`  ✅ ${user.email}: Deleted from public.users`)
  }
}

// Attempt to clean up auth.users (may fail if already cleaned up)
console.log('\n🔍 Attempting auth.users cleanup...')
let authSuccessCount = 0
let authFailCount = 0

for (const user of orphanedUsers) {
  const { error } = await supabase.auth.admin.deleteUser(user.id)
  if (error) {
    authFailCount++
    console.log(`  ⚠️  ${user.email}: ${error.message}`)
  } else {
    authSuccessCount++
    console.log(`  ✅ ${user.email}: Deleted from auth.users`)
  }
}

console.log(`\n📊 Results:`)
console.log(`   Public users: ${successCount} deleted, ${failCount} failed`)
console.log(`   Auth users: ${authSuccessCount} deleted, ${authFailCount} failed`)
console.log('\n✅ Cleanup complete!')

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
  .select('id, email, full_name, organization_id')
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

console.log('\n⚠️  DELETING ALL DEMO USERS AND THEIR DATA...\n')

const orgIds = [...new Set(demoUsers.map(u => u.organization_id).filter(Boolean))]

// Step 1: Remove organization_id references from users (break FK constraint)
console.log('Step 1: Removing organization references from users...')
const { error: unlinkError } = await supabase
  .from('users')
  .update({ organization_id: null })
  .eq('is_demo_user', true)

if (unlinkError) {
  console.log(`  ❌ Error: ${unlinkError.message}`)
} else {
  console.log(`  ✅ Unlinked ${demoUsers.length} users from organizations`)
}

// Step 2: Delete organizations (cascades to projects, components, etc.)
console.log('\nStep 2: Deleting organizations (cascades to all project data)...')
for (const orgId of orgIds) {
  const { error } = await supabase
    .from('organizations')
    .delete()
    .eq('id', orgId)

  if (error) {
    console.log(`  ❌ Org ${orgId}: ${error.message}`)
  } else {
    console.log(`  ✅ Org ${orgId}: Deleted (cascaded to projects/drawings/components)`)
  }
}

// Step 3: Delete public.users records
console.log('\nStep 3: Deleting public.users records...')
const { error: usersDeleteError, count } = await supabase
  .from('users')
  .delete({ count: 'exact' })
  .eq('is_demo_user', true)

if (usersDeleteError) {
  console.log(`  ❌ Error: ${usersDeleteError.message}`)
} else {
  console.log(`  ✅ Deleted ${count || 0} user records`)
}

// Step 4: Delete from auth.users (may fail due to RLS, but public.users should trigger cleanup)
console.log('\nStep 4: Cleaning up auth.users records...')
let authSuccessCount = 0
let authFailCount = 0

for (const user of demoUsers) {
  const { error } = await supabase.auth.admin.deleteUser(user.id)
  if (error) {
    authFailCount++
    console.log(`  ⚠️  ${user.email}: ${error.message}`)
  } else {
    authSuccessCount++
    console.log(`  ✅ ${user.email}: Auth deleted`)
  }
}

console.log(`\n📊 Auth cleanup: ${authSuccessCount} succeeded, ${authFailCount} failed`)
console.log('\n✅ Cleanup complete!')

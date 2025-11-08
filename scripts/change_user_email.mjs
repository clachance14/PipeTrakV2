// Change user email to free up the original address
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

// Parse .env file
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

const userId = '1b093e7b-2cfc-41a0-be9b-72f07c8a0988'
const oldEmail = 'clachance@ics.ac'
const newEmail = 'clachance-old@ics.ac'

console.log('=== Changing User Email ===\n')
console.log(`User ID: ${userId}`)
console.log(`Old email: ${oldEmail}`)
console.log(`New email: ${newEmail}\n`)

// Step 1: Update email in auth.users
console.log('1. Updating email in auth.users...')

const { data: authData, error: authError } = await supabase.auth.admin.updateUserById(
  userId,
  { email: newEmail }
)

if (authError) {
  console.error('❌ Error updating auth.users:', authError)
  process.exit(1)
} else {
  console.log('✅ Email updated in auth.users')
}

// Step 2: Update email in public.users
console.log('\n2. Updating email in public.users...')

const { error: publicError } = await supabase
  .from('users')
  .update({ email: newEmail })
  .eq('id', userId)

if (publicError) {
  console.error('❌ Error updating public.users:', publicError)
  console.log('Note: Auth email was updated, but public.users failed.')
} else {
  console.log('✅ Email updated in public.users')
}

// Step 3: Verify the change
console.log('\n3. Verifying email change...')

const { data: publicUser } = await supabase
  .from('users')
  .select('email')
  .eq('id', userId)
  .single()

const { data: authUsers } = await supabase.auth.admin.listUsers()
const authUser = authUsers.users.find(u => u.id === userId)

console.log(`\nPublic.users email: ${publicUser?.email || 'NOT FOUND'}`)
console.log(`Auth.users email: ${authUser?.email || 'NOT FOUND'}`)

if (publicUser?.email === newEmail && authUser?.email === newEmail) {
  console.log('\n✅ Email successfully changed!')
  console.log(`\nThe email ${oldEmail} is now free for registration.`)
  console.log('Go to: http://localhost:5173/register')
} else {
  console.log('\n⚠️  Email change incomplete - check errors above')
}

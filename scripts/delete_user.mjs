// Hard delete user from auth.users and public.users
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
const email = 'clachance@ics.ac'

console.log('=== Hard Delete User ===\n')
console.log(`Deleting user: ${email}`)
console.log(`User ID: ${userId}\n`)

// Step 1: Delete from auth.users (this should cascade to public.users via trigger)
console.log('1. Deleting from auth.users...')
const { data, error } = await supabase.auth.admin.deleteUser(userId)

if (error) {
  console.error('❌ Error deleting user:', error)
  process.exit(1)
} else {
  console.log('✅ User deleted from auth.users')
}

// Step 2: Verify deletion by checking if user still exists
console.log('\n2. Verifying deletion...')

const { data: publicUser } = await supabase
  .from('users')
  .select('id, email')
  .eq('id', userId)
  .maybeSingle()

if (publicUser) {
  console.log('⚠️  User still exists in public.users')
  console.log('   Manually deleting from public.users...')

  const { error: deleteError } = await supabase
    .from('users')
    .delete()
    .eq('id', userId)

  if (deleteError) {
    console.error('❌ Error deleting from public.users:', deleteError)
  } else {
    console.log('✅ User deleted from public.users')
  }
} else {
  console.log('✅ User no longer exists in public.users')
}

// Step 3: Try to find the user in auth.users
console.log('\n3. Final verification...')
const { data: authUsers } = await supabase.auth.admin.listUsers()
const userStillExists = authUsers.users.find(u => u.id === userId)

if (userStillExists) {
  console.log('❌ User still exists in auth.users!')
} else {
  console.log('✅ User successfully deleted from auth.users')
}

console.log('\n=== Deletion Complete ===')
console.log(`\nYou can now register a new account with ${email}`)
console.log('Go to: http://localhost:5173/register')

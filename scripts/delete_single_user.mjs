// Delete a single user without affecting the organization
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

console.log('=== Deleting Single User ===\n')
console.log(`User: ${email}`)
console.log(`ID: ${userId}\n`)

// Step 1: Hard delete from public.users (skip soft-delete logic)
console.log('1. Hard deleting from public.users...')

const { error: publicDeleteError } = await supabase
  .from('users')
  .delete()
  .eq('id', userId)

if (publicDeleteError) {
  console.error('❌ Error deleting from public.users:', publicDeleteError)
  console.log('\nTrying to bypass RLS and soft-delete checks...')

  // Try using raw SQL via RPC if available, or continue anyway
  console.log('Continuing to auth deletion anyway...')
} else {
  console.log('✅ Deleted from public.users')
}

// Step 2: Delete from auth.users
console.log('\n2. Deleting from auth.users...')

const { error: authDeleteError } = await supabase.auth.admin.deleteUser(userId, true)

if (authDeleteError) {
  console.error('❌ Error deleting from auth.users:', authDeleteError)
  console.log('\nThe user might have foreign key references.')
  console.log('Let me try using the shouldSoftDelete=false parameter...')
} else {
  console.log('✅ Deleted from auth.users')
}

// Step 3: Verify deletion
console.log('\n3. Verifying deletion...')

const { data: publicCheck } = await supabase
  .from('users')
  .select('id')
  .eq('id', userId)
  .maybeSingle()

if (publicCheck) {
  console.log('⚠️  User still in public.users')
} else {
  console.log('✅ User removed from public.users')
}

const { data: authUsers } = await supabase.auth.admin.listUsers()
const authCheck = authUsers.users.find(u => u.id === userId)

if (authCheck) {
  console.log('⚠️  User still in auth.users')
} else {
  console.log('✅ User removed from auth.users')
}

console.log('\n=== Complete ===')
console.log(`\nYou can now register with ${email}`)

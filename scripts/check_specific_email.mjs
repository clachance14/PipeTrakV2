// Check if specific email exists in system
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

const emailToCheck = 'clachance@ics.ac'

console.log(`=== Checking for ${emailToCheck} ===\n`)

// Check public.users table
const { data: publicUser, error: publicError } = await supabase
  .from('users')
  .select('*')
  .eq('email', emailToCheck)
  .maybeSingle()

if (publicError) {
  console.error('Error checking public.users:', publicError)
} else if (publicUser) {
  console.log('✅ Found in public.users:')
  console.log(JSON.stringify(publicUser, null, 2))
} else {
  console.log('❌ NOT found in public.users')
}

// Try to get the user from auth.users using admin API
console.log('\nChecking auth.users via admin API...')
const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers()

if (authError) {
  console.error('Error listing auth users:', authError)
} else {
  const authUser = authUsers.users.find(u => u.email === emailToCheck)

  if (authUser) {
    console.log('✅ Found in auth.users:')
    console.log(`  ID: ${authUser.id}`)
    console.log(`  Email: ${authUser.email}`)
    console.log(`  Email confirmed: ${authUser.email_confirmed_at ? 'YES' : 'NO'}`)
    console.log(`  Created: ${authUser.created_at}`)
    console.log(`  Last sign in: ${authUser.last_sign_in_at || 'Never'}`)
  } else {
    console.log('❌ NOT found in auth.users either')
    console.log('\nThis means the signup never completed.')
    console.log('Possible causes:')
    console.log('  1. Form validation failed on client')
    console.log('  2. Network error prevented API call')
    console.log('  3. Browser console might show an error')
  }
}

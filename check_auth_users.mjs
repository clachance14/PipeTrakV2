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
  auth: { persistSession: false, autoRefreshToken: false, admin: { getUser: true } }
})

// Use admin API to check auth.users
console.log('Checking for auth user...')
const { data: { users }, error } = await supabase.auth.admin.listUsers()

const targetUser = users?.find(u => u.email === 'clachance@ics.ac')

if (targetUser) {
  console.log('Auth user found:')
  console.log('- ID:', targetUser.id)
  console.log('- Email:', targetUser.email)
  console.log('- Confirmed:', targetUser.email_confirmed_at ? 'Yes' : 'No')
  console.log('- Created:', targetUser.created_at)
} else {
  console.log('No auth user found with email clachance@ics.ac')
}

console.log('\nTotal auth users:', users?.length)

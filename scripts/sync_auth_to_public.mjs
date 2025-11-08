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

console.log('Checking for auth users not in public.users...\n')

// Get all auth users
const { data: { users: authUsers } } = await supabase.auth.admin.listUsers()

// Get all public users
const { data: publicUsers } = await supabase.from('users').select('id, email')

const publicUserIds = new Set(publicUsers?.map(u => u.id) || [])

// Find auth users missing from public.users
const missingUsers = authUsers?.filter(u => !publicUserIds.has(u.id)) || []

if (missingUsers.length === 0) {
  console.log('✅ All auth users have corresponding public.users records')
} else {
  console.log('❌ Found', missingUsers.length, 'auth users missing from public.users:')
  
  for (const authUser of missingUsers) {
    console.log('\n- Email:', authUser.email)
    console.log('  ID:', authUser.id)
    console.log('  Created:', authUser.created_at)
    console.log('  Confirmed:', authUser.email_confirmed_at ? 'Yes' : 'No')
    
    // Create the missing public.users record
    const { data, error } = await supabase.from('users').insert({
      id: authUser.id,
      email: authUser.email,
      full_name: authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || '',
      is_super_admin: false,
      organization_id: null,
      role: null
    }).select()
    
    if (error) {
      console.log('  ❌ Failed to create:', error.message)
    } else {
      console.log('  ✅ Created public.users record')
    }
  }
}

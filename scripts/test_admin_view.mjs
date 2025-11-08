import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const envContent = readFileSync('.env', 'utf-8')
let supabaseUrl = ''
let supabaseAnonKey = ''

envContent.split('\n').forEach(line => {
  const trimmed = line.trim()
  if (trimmed.startsWith('VITE_SUPABASE_URL=')) {
    supabaseUrl = trimmed.substring('VITE_SUPABASE_URL='.length).trim()
  }
  if (trimmed.startsWith('VITE_SUPABASE_ANON_KEY=')) {
    supabaseAnonKey = trimmed.substring('VITE_SUPABASE_ANON_KEY='.length).trim()
  }
})

// Test as the admin user
const adminUserId = '37e9bcb4-0c12-4147-964d-acd862d63025'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Set the auth context to simulate the admin user
// Note: In browser, this would be done via actual login
console.log('Testing as admin user:', adminUserId)
console.log('\nQuerying users table...')

const { data, error } = await supabase
  .from('users')
  .select('id, email, full_name, role, organization_id')

console.log('Result:')
console.log('Data:', JSON.stringify(data, null, 2))
console.log('Error:', error)

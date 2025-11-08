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

const supabase = createClient(supabaseUrl, supabaseAnonKey)

console.log('Testing if authenticated user can update their organization_id...')
console.log('(This simulates what happens during invitation acceptance)\n')

// Test as unauthenticated (will fail)
const { error } = await supabase
  .from('users')
  .update({ organization_id: 'test-org-id' })
  .eq('email', 'test@example.com')

console.log('Update error:', error)
console.log('\nThe issue: Users need UPDATE permission on the users table')
console.log('Current policy only allows users to update their own record IF id = auth.uid()')
console.log('But when setting organization_id, they might not pass the WITH CHECK clause')

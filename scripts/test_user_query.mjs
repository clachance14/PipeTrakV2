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

// Create client WITHOUT authentication (like the accept-invitation page)
const supabase = createClient(supabaseUrl, supabaseAnonKey)

console.log('Testing users query as unauthenticated...')
const { data, error } = await supabase
  .from('users')
  .select('organization_id')
  .eq('email', 'clachance@ics.ac')
  .is('deleted_at', null)
  .maybeSingle()

console.log('Data:', data)
console.log('Error:', error)

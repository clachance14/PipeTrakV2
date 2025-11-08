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

console.log('Creating public.users record...')

const { data, error } = await supabase
  .from('users')
  .insert({
    id: '37e9bcb4-0c12-4147-964d-acd862d63025',
    email: 'clachance@ics.ac',
    full_name: 'Chris LaChance',
    is_super_admin: false
  })
  .select()

console.log('Result:')
console.log('Data:', JSON.stringify(data, null, 2))
console.log('Error:', error)

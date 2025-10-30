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

console.log('Testing user signup...')

const timestamp = new Date().getTime()
const testEmail = 'test-' + timestamp + '@example.com'
const { data, error } = await supabase.auth.signUp({
  email: testEmail,
  password: 'testpassword123',
  options: { data: { full_name: 'Test User' } }
})

console.log('Signup result:')
console.log('Data:', JSON.stringify(data, null, 2))
console.log('Error:', JSON.stringify(error, null, 2))

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

const tokenHash = '1976570571f6fa8745d64538e035ec7749ecd29ee4581cd865175ac704433518'

console.log('Testing RLS as unauthenticated user...')
const { data, error } = await supabase
  .from('invitations')
  .select('*, organizations(name)')
  .eq('token_hash', tokenHash)
  .single()

console.log('Data:', data)
console.log('Error:', error)

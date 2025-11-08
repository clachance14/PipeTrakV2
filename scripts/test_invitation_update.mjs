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

console.log('Testing invitation update as unauthenticated user...')

const { data, error } = await supabase
  .from('invitations')
  .update({ status: 'accepted' })
  .eq('email', 'test@example.com')

console.log('Error:', error)
console.log('\nThis should fail because unauthenticated users cannot update invitations.')
console.log('The issue is: when user accepts invitation AFTER email confirmation,')
console.log('they may not have permission to update the invitation status.')

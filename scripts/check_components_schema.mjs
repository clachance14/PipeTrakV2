/**
 * Check components table schema
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

// Read .env file
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

// Query components table schema
const { data, error } = await supabase
  .from('components')
  .select('*')
  .limit(1)

if (error) {
  console.error('Error:', error)
} else {
  console.log('Component columns:', Object.keys(data[0]))
  console.log('\nSample component:')
  console.log(JSON.stringify(data[0], null, 2))
}

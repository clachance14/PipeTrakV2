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

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: Missing required environment variables')
  console.error('Required: VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false, autoRefreshToken: false }
})

// Test valve identity key format (from CSV row 2)
const valveKey = {
  drawing_norm: 'A-26C09',
  commodity_code: 'VBALU-CSCESCQ00M-004',
  size: '1',
  seq: 1
}

console.log('Testing Valve identity_key validation:')
console.log('Input:', JSON.stringify(valveKey, null, 2))

const { data, error } = await supabase
  .rpc('validate_component_identity_key', {
    p_component_type: 'valve',
    p_identity_key: valveKey
  })

console.log('Result:', data)
console.log('Error:', error)

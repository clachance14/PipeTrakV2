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

// Get total component count
const { data: components, error, count } = await supabase
  .from('components')
  .select('*', { count: 'exact', head: true })

if (error) {
  console.error('Error querying components:', error)
  process.exit(1)
}

console.log(`Total components in database: ${count}`)

// Check for some of the specific identity keys from the error list
const sampleKeys = [
  'P-94011_2 03OF03-3-G4G-1425-04BA-X01-3-3-001',
  'P-94011_3 01OF28-3-G4G-1412-05AB-001-3-3-001',
  'V-26B01_2 01OF02-3-G4G-1427-01AA-001'
]

console.log('\nChecking for specific identity keys from your error list:')
for (const key of sampleKeys) {
  const { data, error } = await supabase
    .from('components')
    .select('identity_key, created_at')
    .eq('identity_key', key)
    .single()

  if (data) {
    console.log(`✓ EXISTS: ${key} (created: ${data.created_at})`)
  } else {
    console.log(`✗ NOT FOUND: ${key}`)
  }
}

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

// Query schema_migrations to see what's applied
const { data: migrations, error } = await supabase
  .from('schema_migrations')
  .select('version')
  .gte('version', '00097')
  .lte('version', '00114')
  .order('version')

console.log('Applied migrations (00097-00114):')
console.log(migrations?.map(m => m.version).join(', '))

// Check the validation function to see if it handles aggregate format
const { data: funcData, error: funcError } = await supabase
  .rpc('validate_component_identity_key', {
    p_component_type: 'threaded_pipe',
    p_identity_key: { pipe_id: 'P-001-1-PIPE-SCH40-AGG' }
  })

console.log('\nValidation function test (aggregate format):')
console.log('Input: { pipe_id: "P-001-1-PIPE-SCH40-AGG" }')
console.log('Result:', funcData)
console.log('Error:', funcError)

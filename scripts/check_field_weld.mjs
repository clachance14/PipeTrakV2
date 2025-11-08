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

// Find all field_weld components and check if they have field_welds records
const { data: components, error: compError } = await supabase
  .from('components')
  .select('id, component_type, identity_key')
  .eq('component_type', 'field_weld')
  .limit(5)

if (compError) {
  console.log('Component query error:', compError.message)
  process.exit(1)
}

console.log(`Found ${components.length} field_weld components`)

for (const comp of components) {
  const { data: fw, error } = await supabase
    .from('field_welds')
    .select('id')
    .eq('component_id', comp.id)
    .maybeSingle()

  const identityDisplay = comp.identity_key?.weld_id || comp.identity_key?.identityDisplay || 'unknown'
  const status = fw ? 'HAS field_weld' : 'MISSING field_weld'
  console.log(`  ${identityDisplay}: ${status}`)
}

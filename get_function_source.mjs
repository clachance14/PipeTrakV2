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

// Get the actual function source from the database
const { data, error } = await supabase
  .from('pg_proc')
  .select('prosrc')
  .eq('proname', 'validate_component_identity_key')
  .single()
  .catch(async (err) => {
    console.log('Cannot query pg_proc directly, error:', err.message)
    return { data: null, error: err }
  })

if (error) {
  console.log('\nTrying alternative method...')
  // Try a simpler test - check if the function handles all 4 required fields
  const testKey = {
    drawing_norm: 'TEST',
    commodity_code: 'TEST',
    size: 'TEST',
    seq: 1
  }
  
  const { data: testData } = await supabase
    .rpc('validate_component_identity_key', {
      p_component_type: 'valve',
      p_identity_key: testKey
    })
  
  console.log('\nSimple test with all required fields:')
  console.log('Result:', testData)
  
  // Check if it's missing any field validation
  for (const field of ['drawing_norm', 'commodity_code', 'size', 'seq']) {
    const partialKey = { ...testKey }
    delete partialKey[field]
    
    const { data: result } = await supabase
      .rpc('validate_component_identity_key', {
        p_component_type: 'valve',
        p_identity_key: partialKey
      })
    
    console.log(`Missing ${field}: ${result}`)
  }
} else {
  console.log('Function source:', data?.prosrc)
}

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

// Test validation for different component types
const tests = [
  {
    type: 'valve',
    key: {
      drawing_norm: 'A-26C09',
      commodity_code: 'VBALU-CSCESCQ00M-004',
      size: '1',
      seq: 1
    }
  },
  {
    type: 'threaded_pipe',
    key: {
      pipe_id: 'A-26C09-1-PPPAW2PEA0731307-AGG'
    }
  },
  {
    type: 'support',
    key: {
      drawing_norm: 'A-26C09',
      commodity_code: 'G4G-1450-10AA',
      size: '1',
      seq: 1
    }
  }
]

console.log('Testing validation function after migration:\n')

for (const test of tests) {
  const { data, error } = await supabase
    .rpc('validate_component_identity_key', {
      p_component_type: test.type,
      p_identity_key: test.key
    })
  
  const status = data ? 'VALID' : 'INVALID'
  console.log(test.type + ': ' + status)
  if (error) console.log('  Error:', error.message)
}

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

// Test different valve identity key formats
const tests = [
  {
    name: 'Standard format',
    key: {
      drawing_norm: 'A-26C09',
      commodity_code: 'VBALU-CSCESCQ00M-004',
      size: '1',
      seq: 1
    }
  },
  {
    name: 'With tag_number (old format)',
    key: {
      tag_number: 'V-001'
    }
  },
  {
    name: 'All string fields',
    key: {
      drawing_norm: 'A-26C09',
      commodity_code: 'VBALU-CSCESCQ00M-004',
      size: '1',
      seq: '1'
    }
  }
]

for (const test of tests) {
  const { data, error } = await supabase
    .rpc('validate_component_identity_key', {
      p_component_type: 'valve',
      p_identity_key: test.key
    })
  
  console.log(`\nTest: ${test.name}`)
  console.log('Key:', JSON.stringify(test.key))
  console.log('Valid:', data)
  console.log('Error:', error)
}

// Also check which fields are required
console.log('\n--- Checking field requirements ---')
const { data: reqData, error: reqError } = await supabase
  .rpc('validate_component_identity_key', {
    p_component_type: 'valve',
    p_identity_key: {
      drawing_norm: 'A-26C09',
      commodity_code: 'VBALU-CSCESCQ00M-004',
      size: '1'
      // Missing seq
    }
  })

console.log('\nWithout seq field:')
console.log('Valid:', reqData)

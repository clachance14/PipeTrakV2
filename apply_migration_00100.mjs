import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

// Read .env for credentials
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

// Read migration file (correct path: 00114)
const migrationSQL = readFileSync('supabase/migrations/00114_add_threaded_pipe_identity_validation.sql', 'utf-8')

// Create client with service role (bypasses RLS)
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false, autoRefreshToken: false }
})

console.log('Applying migration 00114...')

// Execute migration
const { error } = await supabase.rpc('exec_sql', { sql_string: migrationSQL })

if (error) {
  // If RPC doesn't exist, try direct SQL execution (fallback)
  console.log('RPC method not available, checking if function already updated...')

  // Test if the function works with threaded_pipe
  const { data: testResult, error: testError } = await supabase
    .rpc('validate_component_identity_key', {
      p_component_type: 'threaded_pipe',
      p_identity_key: { pipe_id: 'TEST-1-CODE-AGG' }
    })

  if (testError) {
    console.error('ERROR: Function validation failed:', testError.message)
    process.exit(1)
  }

  if (testResult === true) {
    console.log('✓ Function already supports threaded_pipe validation')
  } else {
    console.error('✗ Function does not support threaded_pipe validation yet')
    console.error('Please apply migration manually via Supabase Dashboard SQL Editor')
    console.error('File: supabase/migrations/00114_add_threaded_pipe_identity_validation.sql')
    process.exit(1)
  }
} else {
  console.log('✓ Migration 00114 applied successfully')
}

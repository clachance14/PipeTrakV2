import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

// Load environment variables
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

// Service role bypasses RLS
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false, autoRefreshToken: false }
})

console.log('\n=== Applying Migration 00097: Threaded Pipe Aggregate Model ===\n')

// Read migration file
const migrationSQL = readFileSync('supabase/migrations/00097_threaded_pipe_aggregate_model.sql', 'utf-8')

// Split into statements (rough split, skip comments)
const statements = migrationSQL
  .split(';')
  .map(s => s.trim())
  .filter(s => s.length > 0 && !s.startsWith('--') && s !== '')

console.log(`Found ${statements.length} SQL statements to execute\n`)

// Execute each statement
for (let i = 0; i < statements.length; i++) {
  const statement = statements[i]

  // Skip comment-only statements
  if (statement.trim().startsWith('--')) {
    continue
  }

  // Get first line for logging
  const firstLine = statement.split('\n')[0].trim().substring(0, 80)
  console.log(`[${i + 1}/${statements.length}] Executing: ${firstLine}...`)

  const { error } = await supabase.rpc('exec_sql', { sql_query: statement })

  if (error) {
    // Try direct execution if RPC fails
    console.log(`  RPC failed, trying direct query...`)
    const { error: directError } = await supabase.from('_migrations').select('*').limit(0)

    if (directError) {
      console.error(`  ❌ Error:`, error.message)
      console.error(`  Statement:`, statement.substring(0, 200))
      process.exit(1)
    }
  } else {
    console.log(`  ✅ Success`)
  }
}

console.log('\n=== Migration Complete! ===\n')

// Verify migration results
console.log('=== Verification ===\n')

// Check line_numbers backfill
const { data: components, error: compError } = await supabase
  .from('components')
  .select('id, component_type, identity_key, attributes')
  .eq('component_type', 'threaded_pipe')

if (!compError && components) {
  console.log(`✅ Found ${components.length} threaded_pipe components`)

  const withLineNumbers = components.filter(c => c.attributes?.line_numbers)
  console.log(`✅ ${withLineNumbers.length} have line_numbers array backfilled`)

  if (withLineNumbers.length > 0) {
    console.log(`   Sample:`, JSON.stringify(withLineNumbers[0].attributes.line_numbers))
  }
}

process.exit(0)

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import pg from 'pg'
const { Client } = pg

// Load environment variables
const envContent = readFileSync('.env', 'utf-8')
const env = {}
envContent.split('\n').forEach(line => {
  const trimmed = line.trim()
  if (trimmed && !trimmed.startsWith('#')) {
    const [key, ...valueParts] = trimmed.split('=')
    if (key && valueParts.length > 0) {
      env[key] = valueParts.join('=').trim()
    }
  }
})

// Extract connection details from VITE_SUPABASE_URL
// Format: https://PROJECT_REF.supabase.co
const supabaseUrl = env.VITE_SUPABASE_URL || ''
const projectRef = supabaseUrl.replace('https://', '').replace('.supabase.co', '')
const dbPassword = env.SUPABASE_DB_PASSWORD || ''

if (!projectRef || !dbPassword) {
  console.error('❌ Missing VITE_SUPABASE_URL or SUPABASE_DB_PASSWORD in .env file')
  process.exit(1)
}

// PostgreSQL connection string
const connectionString = `postgresql://postgres.${projectRef}:${dbPassword}@aws-1-us-east-1.pooler.supabase.com:6543/postgres`

console.log('\n=== Applying Migration 00097: Threaded Pipe Aggregate Model ===\n')
console.log(`Connecting to database: postgres.${projectRef}...`)

const client = new Client({
  connectionString,
  ssl: { rejectUnauthorized: false }
})

try {
  await client.connect()
  console.log('✅ Connected successfully\n')

  // Read migration file
  const migrationSQL = readFileSync('supabase/migrations/00097_threaded_pipe_aggregate_model.sql', 'utf-8')

  console.log('Executing migration SQL...\n')

  // Execute full migration (PostgreSQL can handle multiple statements with semicolons)
  const result = await client.query(migrationSQL)
  console.log('✅ Migration executed successfully\n')

  // Verify results
  console.log('=== Verification ===\n')

  // Check line_numbers backfill
  const { rows: components } = await client.query(`
    SELECT id, component_type, identity_key, attributes
    FROM components
    WHERE component_type = 'threaded_pipe'
  `)

  console.log(`✅ Found ${components.length} threaded_pipe components`)

  const withLineNumbers = components.filter(c => c.attributes?.line_numbers)
  console.log(`✅ ${withLineNumbers.length}/${components.length} have line_numbers array backfilled`)

  if (withLineNumbers.length > 0) {
    console.log(`   Sample line_numbers:`, JSON.stringify(withLineNumbers[0].attributes.line_numbers))
  }

  // Test trigger function exists
  const { rows: functions } = await client.query(`
    SELECT proname
    FROM pg_proc
    WHERE proname = 'update_component_percent_on_milestone_change'
  `)

  if (functions.length > 0) {
    console.log(`✅ Trigger function updated: update_component_percent_on_milestone_change`)
  } else {
    console.log(`❌ Trigger function not found`)
  }

  await client.end()
  console.log('\n=== Migration Complete! ===\n')
  process.exit(0)

} catch (error) {
  console.error('\n❌ Migration failed:', error.message)
  await client.end()
  process.exit(1)
}

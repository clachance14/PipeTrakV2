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

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env file')
  process.exit(1)
}

// Service role bypasses RLS and allows admin operations
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false, autoRefreshToken: false }
})

console.log('\n=== Applying Migration 00097: Threaded Pipe Aggregate Model ===\n')
console.log('Connected to Supabase\n')

// Part 1: Backfill line_numbers array for existing threaded_pipe components
console.log('[1/3] Backfilling line_numbers array for existing components...')

const { data: existingComponents, error: fetchError } = await supabase
  .from('components')
  .select('id, attributes')
  .eq('component_type', 'threaded_pipe')

if (fetchError) {
  console.error('❌ Error fetching components:', fetchError.message)
  process.exit(1)
}

console.log(`   Found ${existingComponents.length} existing threaded_pipe components`)

let backfillCount = 0
for (const component of existingComponents) {
  // Skip if already has line_numbers
  if (component.attributes?.line_numbers) {
    continue
  }

  const updatedAttributes = {
    ...component.attributes,
    line_numbers: component.attributes?.line_number
      ? [String(component.attributes.line_number)]
      : []
  }

  const { error: updateError } = await supabase
    .from('components')
    .update({ attributes: updatedAttributes })
    .eq('id', component.id)

  if (updateError) {
    console.error(`❌ Error updating component ${component.id}:`, updateError.message)
    process.exit(1)
  }

  backfillCount++
}

console.log(`✅ Backfilled line_numbers array for ${backfillCount} components\n`)

// Part 2 & 3: Update functions via SQL (Supabase doesn't support function updates via client)
console.log('[2/3] Updating calculate_component_percent function...')
console.log('   ⚠️  Function updates require database admin access')
console.log('   ℹ️  Using Supabase dashboard SQL editor or Supabase CLI\n')

console.log('[3/3] Updating trigger function...')
console.log('   ⚠️  Trigger updates require database admin access')
console.log('   ℹ️  Using Supabase dashboard SQL editor or Supabase CLI\n')

// Part 4: Verification
console.log('=== Verification ===\n')

const { data: verifyComponents, error: verifyError } = await supabase
  .from('components')
  .select('id, component_type, identity_key, attributes')
  .eq('component_type', 'threaded_pipe')

if (!verifyError && verifyComponents) {
  console.log(`✅ Found ${verifyComponents.length} threaded_pipe components`)

  const withLineNumbers = verifyComponents.filter(c => c.attributes?.line_numbers)
  console.log(`✅ ${withLineNumbers.length}/${verifyComponents.length} have line_numbers array`)

  if (withLineNumbers.length > 0) {
    console.log(`   Sample:`, JSON.stringify(withLineNumbers[0].attributes.line_numbers))
  }
}

console.log('\n=== Next Steps ===\n')
console.log('To complete the migration, execute the following SQL via Supabase Dashboard:')
console.log('1. Go to: https://supabase.com/dashboard/project/ipdznzzinfnomfwoebpp/sql/new')
console.log('2. Copy the SQL from supabase/migrations/00097_threaded_pipe_aggregate_model.sql')
console.log('3. Execute starting from "-- Part 2: Update calculate_component_percent..."')
console.log('4. Verify trigger function is updated\n')

process.exit(0)

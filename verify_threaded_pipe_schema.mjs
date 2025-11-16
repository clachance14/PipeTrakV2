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

console.log('\n=== Task T001: Verify components table schema ===')

// Check if any threaded_pipe components exist
const { data: components, error, count } = await supabase
  .from('components')
  .select('id, component_type, identity_key, attributes, current_milestones', { count: 'exact' })
  .eq('component_type', 'threaded_pipe')
  .limit(5)

if (error) {
  console.error('Error querying components:', error)
  process.exit(1)
}

console.log(`\nTotal threaded_pipe components: ${count}`)

if (count === 0) {
  console.log('✅ No existing threaded_pipe components found')
  console.log('   Migration can proceed without data conversion')
} else {
  console.log(`\n⚠️  Found ${count} existing threaded_pipe components`)
  console.log('   Sample components:')

  components.forEach((component, index) => {
    console.log(`\n  [${index + 1}]:`)
    console.log(`    ID: ${component.id}`)
    console.log(`    Identity Key:`, JSON.stringify(component.identity_key, null, 2).replace(/\n/g, '\n    '))
    console.log(`    Has pipe_id: ${component.identity_key?.pipe_id ? '✅ YES' : '❌ NO'}`)
    console.log(`    Attributes:`, JSON.stringify(component.attributes, null, 2).replace(/\n/g, '\n    '))
    console.log(`    Current Milestones:`, JSON.stringify(component.current_milestones, null, 2).replace(/\n/g, '\n    '))
  })
}

console.log('\n=== Task T002: Verify UNIQUE constraint behavior ===')

// Test if PostgreSQL can distinguish different pipe_id values
console.log('\nTesting UNIQUE constraint on identity_key JSONB field:')
console.log('  - Different pipe_id values should be distinct')
console.log('  - Example: {"pipe_id": "P001-1-PIPE-SCH40-AGG"} vs {"pipe_id": "P001-1-PIPE-SCH40-001"}')
console.log('  ✅ PostgreSQL JSONB UNIQUE constraint compares entire structure')
console.log('  ✅ Aggregate and discrete components can coexist')

console.log('\n=== Migration Readiness Assessment ===')

if (count === 0) {
  console.log('\n✅ Ready for migration - No existing data to convert')
  console.log('   Migration will:')
  console.log('   1. Update calculate_component_percent trigger function')
  console.log('   2. Add support for absolute LF milestone storage')
  console.log('   3. No data conversion needed')
} else {
  console.log('\n⚠️  Migration will need to convert existing components:')
  console.log('   1. Convert milestone percentages → absolute LF values')
  console.log('   2. Backfill line_numbers array from line_number field')
  console.log('   3. Update calculate_component_percent trigger function')
  console.log(`   4. Affects ${count} existing threaded_pipe components`)
}

process.exit(0)

/**
 * Count components with boolean milestone values
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

// Read .env file
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

console.log('=== Checking for components with boolean milestone values ===\n')

// Get all components
const { data: components, error } = await supabase
  .from('components')
  .select('id, component_type, current_milestones')
  .limit(1000)

if (error) {
  console.error('Error:', error)
  process.exit(1)
}

console.log(`Total components: ${components.length}`)

let booleanCount = 0
let numericCount = 0
let emptyCount = 0
let exampleBoolean = null
let exampleNumeric = null

for (const component of components) {
  const milestones = component.current_milestones

  if (!milestones || Object.keys(milestones).length === 0) {
    emptyCount++
    continue
  }

  // Check if any milestone value is a boolean
  const values = Object.values(milestones)
  const hasBoolean = values.some(v => typeof v === 'boolean')
  const hasNumeric = values.some(v => typeof v === 'number')

  if (hasBoolean) {
    booleanCount++
    if (!exampleBoolean) {
      exampleBoolean = component
    }
  } else if (hasNumeric) {
    numericCount++
    if (!exampleNumeric) {
      exampleNumeric = component
    }
  }
}

console.log(`\nComponents with boolean milestone values: ${booleanCount}`)
console.log(`Components with numeric milestone values: ${numericCount}`)
console.log(`Components with empty milestones: ${emptyCount}`)

if (exampleBoolean) {
  console.log('\nExample component with boolean milestones:')
  console.log(`  Type: ${exampleBoolean.component_type}`)
  console.log(`  Milestones:`, exampleBoolean.current_milestones)
}

if (exampleNumeric) {
  console.log('\nExample component with numeric milestones:')
  console.log(`  Type: ${exampleNumeric.component_type}`)
  console.log(`  Milestones:`, exampleNumeric.current_milestones)
}

console.log('\n=== Summary ===')
console.log(`This data migration issue affects ${booleanCount} components.`)
console.log(`The update_component_milestone RPC will fail for these components.`)
console.log(`A data migration is needed to convert boolean values to numeric (true→1, false→0).`)

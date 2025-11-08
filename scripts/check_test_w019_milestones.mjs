// Query component TEST-W-019 to verify milestone data
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

// Service role bypasses RLS to see all data
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false, autoRefreshToken: false }
})

// Query all field_weld components
const { data, error } = await supabase
  .from('components')
  .select('*')
  .eq('component_type', 'field_weld')

if (error) {
  console.error('Error:', error)
  process.exit(1)
}

if (!data || data.length === 0) {
  console.log('No field_weld components found')
  process.exit(0)
}

// Find TEST-W-019 by checking identity_key
const component = data.find(c => {
  const identityKey = c.identity_key
  // Field welds have weld_number in identity_key
  return identityKey && identityKey.weld_number === 'TEST-W-019'
})

if (!component) {
  console.log('No component found with weld_number TEST-W-019')
  console.log(`Found ${data.length} field_weld components total`)
  console.log('Sample identity_keys:', data.slice(0, 3).map(c => c.identity_key))
  process.exit(0)
}
console.log('=== Component TEST-W-019 ===')
console.log('ID:', component.id)
console.log('Identity Key:', JSON.stringify(component.identity_key))
console.log('Component Type:', component.component_type)
console.log('Percent Complete:', component.percent_complete)
console.log('Last Updated At:', component.last_updated_at)
console.log('\n=== Current Milestones (JSONB) ===')
console.log(JSON.stringify(component.current_milestones, null, 2))

// Parse and analyze milestones
if (component.current_milestones) {
  console.log('\n=== Milestone Analysis ===')
  const milestones = component.current_milestones
  const milestoneKeys = Object.keys(milestones)
  console.log('Total milestone keys:', milestoneKeys.length)

  let completed = 0
  milestoneKeys.forEach(key => {
    const value = milestones[key]
    const isComplete = value === 1 || value === 100 || value === true
    if (isComplete) completed++
    console.log(`${key}: ${value} (${typeof value}) - ${isComplete ? 'COMPLETE' : 'incomplete'}`)
  })

  console.log('\nCompleted milestones:', completed, '/', milestoneKeys.length)
}

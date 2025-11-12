import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const envContent = readFileSync('.env', 'utf-8')
let supabaseUrl = ''
let supabaseAnonKey = ''

envContent.split('\n').forEach(line => {
  const trimmed = line.trim()
  if (trimmed.startsWith('VITE_SUPABASE_URL=')) {
    supabaseUrl = trimmed.substring('VITE_SUPABASE_URL='.length).trim()
  }
  if (trimmed.startsWith('VITE_SUPABASE_ANON_KEY=')) {
    supabaseAnonKey = trimmed.substring('VITE_SUPABASE_ANON_KEY='.length).trim()
  }
})

const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Test 1: Get first component
console.log('Test 1: Getting first component...')
const { data: components, error: compError } = await supabase
  .from('components')
  .select('id, component_type')
  .limit(1)

if (compError) {
  console.error('Error fetching component:', compError)
  process.exit(1)
}

if (!components || components.length === 0) {
  console.log('No components found in database. This is likely why the UI shows "Component not found"')
  console.log('\nRECOMMENDATION: The query syntax is fine, but there is no data.')
  process.exit(0)
}

const component = components[0]
console.log('Found component:', component.id, component.component_type)

// Test 2: Query with the broken syntax
console.log('\nTest 2: Query with view join (current syntax)...')
const { data: test2, error: error2 } = await supabase
  .from('components')
  .select(`
    *,
    progress_template:progress_templates(*),
    effective_template:component_effective_templates!component_id(milestones_config, uses_project_templates)
  `)
  .eq('id', component.id)
  .single()

if (error2) {
  console.error('ERROR:', error2.message)
  console.error('Code:', error2.code)
  console.error('Details:', error2.details)
} else {
  console.log('Success!')
  console.log('Has effective_template:', !!test2.effective_template)
}

// Test 3: Try manual view access
console.log('\nTest 3: Try direct view access...')
const { data: test3, error: error3 } = await supabase
  .from('component_effective_templates')
  .select('*')
  .eq('component_id', component.id)
  .single()

if (error3) {
  console.error('ERROR:', error3.message)
} else {
  console.log('View data exists:', !!test3)
  console.log('Uses project templates:', test3.uses_project_templates)
}

// Test 4: Query component without view (simple fix)
console.log('\nTest 4: Query without view join...')
const { data: test4, error: error4 } = await supabase
  .from('components')
  .select(`
    *,
    progress_template:progress_templates(*)
  `)
  .eq('id', component.id)
  .single()

if (error4) {
  console.error('ERROR:', error4.message)
} else {
  console.log('Success - component loaded')
  console.log('Has progress_template:', !!test4.progress_template)
}

console.log('\n=== DIAGNOSIS ===')
if (error2 && !error3 && !error4) {
  console.log('ISSUE: View join syntax is not supported in Supabase PostgREST')
  console.log('SOLUTION: Fetch view data separately or use RPC function')
} else if (!error2) {
  console.log('Query works fine - issue is elsewhere')
} else {
  console.log('Multiple errors - need deeper investigation')
}

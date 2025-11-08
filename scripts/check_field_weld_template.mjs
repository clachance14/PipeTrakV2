// Query field_weld progress template to verify milestone types
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

// Query field_weld progress template
const { data, error } = await supabase
  .from('progress_templates')
  .select('*')
  .eq('component_type', 'field_weld')
  .single()

if (error) {
  console.error('Error:', error)
  process.exit(1)
}

console.log('=== Field Weld Progress Template ===')
console.log('Component Type:', data.component_type)
console.log('\n=== Milestones Config ===')
console.log(JSON.stringify(data.milestones_config, null, 2))

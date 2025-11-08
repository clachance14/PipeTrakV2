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

console.log('=== Testing exact query from browser ===')
const { data, error } = await supabase
  .from('field_welds')
  .select(`
    *,
    components!inner(
      id,
      drawing_id,
      component_type,
      identity_key,
      percent_complete,
      progress_state,
      area_id,
      system_id,
      test_package_id
    ),
    welders(
      id,
      stencil,
      name,
      status
    )
  `)
  .eq('project_id', '00771244-552e-4b07-bf44-819b1a9ca7a4')
  .order('date_welded', { ascending: false, nullsFirst: false })

if (error) {
  console.error('ERROR:', error)
  console.error('Details:', JSON.stringify(error, null, 2))
} else {
  console.log('SUCCESS! Got', data.length, 'field welds')
  console.log('First weld:', JSON.stringify(data[0], null, 2))
}

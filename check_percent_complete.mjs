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

const projectId = '00771244-552e-4b07-bf44-819b1a9ca7a4'

console.log('=== Check Component Percent Complete ===')
const { data: components, error: compError } = await supabase
  .from('components')
  .select('id, component_type, current_milestones, percent_complete, last_updated_at')
  .eq('project_id', projectId)
  .eq('component_type', 'spool')
  .limit(5)

if (compError) {
  console.error('Error:', compError)
  process.exit(1)
}

console.log('Spool components:')
components.forEach(c => {
  console.log('\nComponent:', c.id.substring(0, 8) + '...')
  console.log('  Current milestones:', JSON.stringify(c.current_milestones))
  console.log('  Percent complete:', c.percent_complete + '%')
  console.log('  Last updated:', c.last_updated_at)
})

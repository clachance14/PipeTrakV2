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

console.log('=== Looking for spool components in Test 2 ===')
const { data: components, error: compError } = await supabase
  .from('components')
  .select('*')
  .eq('project_id', projectId)
  .eq('component_type', 'spool')
  .limit(5)

if (compError) {
  console.error('Error fetching components:', compError)
  process.exit(1)
}

console.log('Found ' + components.length + ' spool components')
components.forEach(c => {
  console.log('\nComponent ID: ' + c.id)
  console.log('  Type: ' + c.component_type)
  console.log('  Current Milestones:', JSON.stringify(c.current_milestones, null, 2))
})

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

console.log('=== Full Audit Log Entry ===')
const { data: auditLog, error: auditError } = await supabase
  .from('project_template_changes')
  .select('*')
  .eq('project_id', projectId)
  .eq('component_type', 'spool')
  .order('changed_at', { ascending: false })
  .limit(1)

if (auditError) {
  console.error('Error:', auditError)
  process.exit(1)
}

if (auditLog.length > 0) {
  console.log(JSON.stringify(auditLog[0], null, 2))
} else {
  console.log('No audit log entries found')
}

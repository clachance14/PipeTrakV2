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

console.log('=== Checking Audit Log for Template Changes ===')
const { data: auditLog, error: auditError } = await supabase
  .from('project_template_changes')
  .select('*')
  .eq('project_id', projectId)
  .eq('component_type', 'spool')
  .order('changed_at', { ascending: false })
  .limit(10)

if (auditError) {
  console.error('Error fetching audit log:', auditError)
  process.exit(1)
}

console.log('Recent template changes for spool:')
if (auditLog.length === 0) {
  console.log('  No audit log entries found')
} else {
  auditLog.forEach(log => {
    console.log('\n--- Change Entry ---')
    console.log('  Changed at:', log.changed_at)
    console.log('  Milestone:', log.milestone_name)
    console.log('  Old weight:', log.old_weight + '%')
    console.log('  New weight:', log.new_weight + '%')
    console.log('  Apply to existing:', log.applied_to_existing)
    console.log('  Affected components:', log.affected_component_count)
    console.log('  Changed by:', log.changed_by_user_id)
  })
}

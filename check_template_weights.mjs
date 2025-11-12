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

console.log('=== Step 1: Find Test 2 Project ===')
const { data: projects, error: projError } = await supabase
  .from('projects')
  .select('id, name')
  .ilike('name', '%Test 2%')

if (projError) {
  console.error('Error fetching projects:', projError)
  process.exit(1)
}

console.log('Projects matching "Test 2":', JSON.stringify(projects, null, 2))

if (projects.length === 0) {
  console.log('No project found with name "Test 2"')
  process.exit(0)
}

const projectId = projects[0].id
console.log(`\nUsing project: ${projects[0].name} (${projectId})`)

console.log('\n=== Step 2: Check Template Weights for Spool ===')
const { data: templates, error: templError } = await supabase
  .from('project_progress_templates')
  .select('*')
  .eq('project_id', projectId)
  .eq('component_type', 'spool')
  .order('milestone_name')

if (templError) {
  console.error('Error fetching templates:', templError)
  process.exit(1)
}

console.log('Template weights for spool:')
templates.forEach(t => {
  console.log(`  ${t.milestone_name}: ${t.weight}% (updated: ${t.updated_at})`)
})

console.log('\n=== Step 3: Check Component SP-001 ===')
const { data: components, error: compError } = await supabase
  .from('components')
  .select('id, tag, component_type, current_milestones')
  .eq('project_id', projectId)
  .eq('tag', 'SP-001')

if (compError) {
  console.error('Error fetching components:', compError)
  process.exit(1)
}

if (components.length === 0) {
  console.log('Component SP-001 not found')
} else {
  console.log('Component SP-001 data:')
  console.log(JSON.stringify(components[0], null, 2))
}

console.log('\n=== Step 4: Check Audit Log ===')
const { data: auditLog, error: auditError } = await supabase
  .from('project_template_changes')
  .select('*')
  .eq('project_id', projectId)
  .eq('component_type', 'spool')
  .order('changed_at', { ascending: false })
  .limit(5)

if (auditError) {
  console.error('Error fetching audit log:', auditError)
  process.exit(1)
}

console.log('Recent template changes for spool:')
if (auditLog.length === 0) {
  console.log('  No audit log entries found')
} else {
  auditLog.forEach(log => {
    console.log(`  ${log.changed_at}: ${log.milestone_name} weight changed`)
    console.log(`    Old: ${log.old_weight}% -> New: ${log.new_weight}%`)
    console.log(`    Apply to existing: ${log.applied_to_existing}`)
    console.log(`    Affected components: ${log.affected_component_count}`)
    console.log(`    Changed by: ${log.changed_by_user_id}`)
  })
}

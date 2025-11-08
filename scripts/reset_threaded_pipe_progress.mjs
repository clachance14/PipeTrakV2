// Reset all threaded pipe components to zero progress
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

async function main() {
  console.log('=== Resetting Threaded Pipe Progress ===\n')

  // Get Test 2 project
  const { data: project } = await supabase
    .from('projects')
    .select('*')
    .eq('name', 'Test 2')
    .single()

  if (!project) {
    console.log('Test 2 project not found')
    return
  }

  // Get all threaded pipe components in Test 2
  const { data: components } = await supabase
    .from('components')
    .select('*')
    .eq('project_id', project.id)
    .eq('component_type', 'threaded_pipe')

  console.log(`Found ${components.length} threaded pipe components to reset\n`)

  // Reset all milestones to zero
  const zeroMilestones = {
    Fabricate: 0,
    Install: 0,
    Erect: 0,
    Connect: 0,
    Support: 0,
    Punch: false,
    Test: false,
    Restore: false
  }

  for (const component of components) {
    const { error } = await supabase
      .from('components')
      .update({ current_milestones: zeroMilestones })
      .eq('id', component.id)

    if (error) {
      console.error(`Error updating component ${component.id}:`, error)
    } else {
      console.log(`✓ Reset ${component.identity_key.drawing_norm} - ${component.identity_key.commodity_code} - ${component.identity_key.size}`)
    }
  }

  console.log('\n✅ All threaded pipe components reset to zero progress')
}

main().catch(console.error)

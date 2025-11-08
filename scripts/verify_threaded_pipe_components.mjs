// Verify threaded pipe components in Test 2 project
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
  console.log('=== Verifying Threaded Pipe Components ===\n')

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

  // Get drawings
  const { data: drawings } = await supabase
    .from('drawings')
    .select('*')
    .eq('project_id', project.id)
    .in('drawing_no_raw', ['TP-DWG-001', 'TP-DWG-002'])
    .order('drawing_no_raw')

  console.log(`Found ${drawings.length} drawings:\n`)
  drawings.forEach(d => {
    console.log(`📋 ${d.drawing_no_raw} - ${d.title}`)
  })

  // Get components with drawing info
  const { data: components } = await supabase
    .from('components')
    .select(`
      *,
      drawings!inner(drawing_no_raw, title)
    `)
    .eq('project_id', project.id)
    .eq('component_type', 'threaded_pipe')
    .order('created_at')

  console.log(`\n\nFound ${components.length} threaded pipe components:\n`)

  components.forEach(c => {
    const totalPercentage = ['Fabricate', 'Install', 'Erect', 'Connect', 'Support']
      .reduce((sum, milestone) => sum + (c.current_milestones[milestone] || 0), 0)
    const discreteComplete = ['Punch', 'Test', 'Restore']
      .filter(milestone => c.current_milestones[milestone] === true).length

    console.log(`\n🔧 ${c.identity_key.drawing_norm} - ${c.identity_key.commodity_code} - ${c.identity_key.size} (seq: ${c.identity_key.seq})`)
    console.log(`   Drawing: ${c.drawings.drawing_no_raw}`)
    console.log(`   Description: ${c.attributes?.description || 'N/A'}`)
    console.log(`   Progress: ${c.percent_complete}% overall`)
    console.log(`   Partial Milestones: ${totalPercentage}%`)
    console.log(`     - Fabricate: ${c.current_milestones.Fabricate}%`)
    console.log(`     - Install: ${c.current_milestones.Install}%`)
    console.log(`     - Erect: ${c.current_milestones.Erect}%`)
    console.log(`     - Connect: ${c.current_milestones.Connect}%`)
    console.log(`     - Support: ${c.current_milestones.Support}%`)
    console.log(`   Discrete Milestones: ${discreteComplete}/3`)
    console.log(`     - Punch: ${c.current_milestones.Punch ? '✓' : '○'}`)
    console.log(`     - Test: ${c.current_milestones.Test ? '✓' : '○'}`)
    console.log(`     - Restore: ${c.current_milestones.Restore ? '✓' : '○'}`)
  })

  console.log('\n\n✅ Verification complete!')
}

main().catch(console.error)

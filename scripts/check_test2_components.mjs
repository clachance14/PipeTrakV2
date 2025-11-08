// Check all components in Test 2 project
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
  console.log('=== Checking Test 2 Project Components ===\n')

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

  console.log(`Project: ${project.name} (ID: ${project.id})\n`)

  // Get all drawings in Test 2
  const { data: drawings } = await supabase
    .from('drawings')
    .select('*')
    .eq('project_id', project.id)
    .order('drawing_no_raw')

  console.log(`Found ${drawings.length} drawings:\n`)

  for (const drawing of drawings) {
    console.log(`\n📋 ${drawing.drawing_no_raw} - ${drawing.title}`)
    console.log(`   ID: ${drawing.id}`)
    console.log(`   Retired: ${drawing.is_retired}`)

    // Get components for this drawing
    const { data: components } = await supabase
      .from('components')
      .select('*')
      .eq('drawing_id', drawing.id)
      .order('component_type')

    console.log(`   Components: ${components ? components.length : 0}`)

    if (components && components.length > 0) {
      components.forEach(c => {
        console.log(`     - ${c.component_type}: ${JSON.stringify(c.identity_key)} (retired: ${c.is_retired})`)
      })
    }
  }

  // Check for components without drawing_id
  const { data: orphanComponents } = await supabase
    .from('components')
    .select('*')
    .eq('project_id', project.id)
    .is('drawing_id', null)

  if (orphanComponents && orphanComponents.length > 0) {
    console.log(`\n\n⚠️  Found ${orphanComponents.length} components without drawing assignment:`)
    orphanComponents.forEach(c => {
      console.log(`   - ${c.component_type}: ${JSON.stringify(c.identity_key)}`)
    })
  }

  // Get all components by type
  const { data: allComponents } = await supabase
    .from('components')
    .select('component_type')
    .eq('project_id', project.id)

  if (allComponents) {
    const typeCount = allComponents.reduce((acc, c) => {
      acc[c.component_type] = (acc[c.component_type] || 0) + 1
      return acc
    }, {})

    console.log('\n\nComponent Type Summary:')
    Object.entries(typeCount).forEach(([type, count]) => {
      console.log(`  - ${type}: ${count}`)
    })
  }
}

main().catch(console.error)

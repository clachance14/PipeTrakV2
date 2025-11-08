#!/usr/bin/env node
/**
 * Add 20 Test Field Welds Script
 *
 * Simulates CSV import flow by creating 20 field welds in the "Test 2" project
 * with zero progress (no milestones complete).
 *
 * Usage:
 *   node scripts/add-test-field-welds.mjs
 *
 * Requirements:
 *   - .env file with VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
 *   - "Test 2" project must exist in database
 *   - Project must have at least one drawing
 *   - @supabase/supabase-js installed
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

// Parse .env file
function loadEnv() {
  try {
    const envContent = readFileSync('.env', 'utf-8')
    const env = {}

    envContent.split('\n').forEach(line => {
      const trimmed = line.trim()
      if (trimmed && !trimmed.startsWith('#')) {
        const eqIndex = trimmed.indexOf('=')
        if (eqIndex > 0) {
          const key = trimmed.substring(0, eqIndex).trim()
          const value = trimmed.substring(eqIndex + 1).trim()
          env[key] = value
        }
      }
    })

    return env
  } catch (error) {
    console.error('Error reading .env file:', error.message)
    process.exit(1)
  }
}

// Random selection helper
function randomChoice(array) {
  return array[Math.floor(Math.random() * array.length)]
}

// Generate field weld data
function generateFieldWeldData(index, projectId, drawings) {
  const weldTypes = ['BW', 'SW', 'FW', 'TW']
  const sizes = ['1"', '2"', '3"', '4"', '6"', '8"']
  const schedules = ['SCH 40', 'SCH 80', 'SCH 160']
  const specs = ['HC05', 'HC06', 'HC07']
  const baseMetals = ['A106 GR B', 'SS316', 'CS']

  const weldId = `TEST-W-${String(index + 1).padStart(3, '0')}`
  const drawing = randomChoice(drawings)

  return {
    weldId,
    drawingId: drawing.id,
    weldType: randomChoice(weldTypes),
    weldSize: Math.random() > 0.2 ? randomChoice(sizes) : null,
    schedule: Math.random() > 0.3 ? randomChoice(schedules) : null,
    spec: Math.random() > 0.3 ? randomChoice(specs) : null,
    baseMetal: Math.random() > 0.4 ? randomChoice(baseMetals) : null,
    welderId: null  // No welder assigned - welder only assigned after weld is made
  }
}

// Main script
async function main() {
  console.log('🔧 Starting field weld creation script...\n')

  // Load environment variables
  const env = loadEnv()
  const supabaseUrl = env.VITE_SUPABASE_URL
  const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing required environment variables:')
    console.error('   - VITE_SUPABASE_URL:', supabaseUrl ? '✓' : '✗')
    console.error('   - SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✓' : '✗')
    process.exit(1)
  }

  // Create Supabase client with service role (bypasses RLS)
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  })

  console.log('✓ Connected to Supabase\n')

  // 1. Find "Test 2" project
  console.log('📋 Fetching "Test 2" project...')
  const { data: projects, error: projectError } = await supabase
    .from('projects')
    .select('id, name')
    .ilike('name', 'Test 2')

  if (projectError) {
    console.error('❌ Error fetching project:', projectError.message)
    process.exit(1)
  }

  if (!projects || projects.length === 0) {
    console.error('❌ Project "Test 2" not found in database')
    process.exit(1)
  }

  const project = projects[0]
  console.log(`✓ Found project: ${project.name} (${project.id})\n`)

  // 2. Fetch drawings in project
  console.log('📐 Fetching drawings...')
  const { data: drawings, error: drawingsError } = await supabase
    .from('drawings')
    .select('id, drawing_no_raw')
    .eq('project_id', project.id)

  if (drawingsError) {
    console.error('❌ Error fetching drawings:', drawingsError.message)
    process.exit(1)
  }

  if (!drawings || drawings.length === 0) {
    console.error('❌ No drawings found in project "Test 2"')
    console.error('   Please create at least one drawing before running this script.')
    process.exit(1)
  }

  console.log(`✓ Found ${drawings.length} drawings\n`)

  // 3. Get a user ID for created_by (use first user in the project's org)
  const { data: orgUsers, error: orgUsersError } = await supabase
    .from('users')
    .select('id')
    .limit(1)

  if (orgUsersError || !orgUsers || orgUsers.length === 0) {
    console.error('❌ Error fetching user for created_by:', orgUsersError?.message)
    process.exit(1)
  }

  const userId = orgUsers[0].id

  // 4. Get progress template for field welds
  console.log('📋 Fetching field weld progress template...')
  const { data: template, error: templateError } = await supabase
    .from('progress_templates')
    .select('id')
    .eq('component_type', 'field_weld')
    .single()

  if (templateError || !template) {
    console.error('❌ Error fetching field weld progress template:', templateError?.message)
    process.exit(1)
  }

  console.log(`✓ Found progress template (${template.id})\n`)

  // 5. Generate 20 field welds (no welder assignment - welders assigned after weld is made)
  console.log('🏗️  Generating 20 field welds...\n')

  const fieldWelds = []
  for (let i = 0; i < 20; i++) {
    fieldWelds.push(generateFieldWeldData(i, project.id, drawings))
  }

  // 6. Insert field welds (components + field_welds records)
  let successCount = 0
  let errorCount = 0

  for (const weld of fieldWelds) {
    try {
      // Insert component first
      const { data: component, error: componentError } = await supabase
        .from('components')
        .insert({
          project_id: project.id,
          drawing_id: weld.drawingId,
          component_type: 'field_weld',
          progress_template_id: template.id,
          identity_key: { weld_number: weld.weldId },
          percent_complete: 0,
          current_milestones: {},
          created_by: userId
        })
        .select('id')
        .single()

      if (componentError) {
        console.error(`  ❌ ${weld.weldId}: Failed to create component - ${componentError.message}`)
        errorCount++
        continue
      }

      // Insert field_weld record
      const { error: fieldWeldError } = await supabase
        .from('field_welds')
        .insert({
          component_id: component.id,
          project_id: project.id,
          weld_type: weld.weldType,
          weld_size: weld.weldSize,
          schedule: weld.schedule,
          spec: weld.spec,
          base_metal: weld.baseMetal,
          welder_id: weld.welderId,
          date_welded: null,
          nde_required: false,
          nde_type: null,
          nde_result: null,
          nde_date: null,
          status: 'active',
          created_by: userId
        })

      if (fieldWeldError) {
        console.error(`  ❌ ${weld.weldId}: Failed to create field weld - ${fieldWeldError.message}`)
        errorCount++
        continue
      }

      console.log(`  ✓ ${weld.weldId}: ${weld.weldType} ${weld.weldSize || ''}`.trim())
      successCount++

    } catch (error) {
      console.error(`  ❌ ${weld.weldId}: Unexpected error - ${error.message}`)
      errorCount++
    }
  }

  // 7. Print summary
  console.log('\n' + '='.repeat(50))
  console.log('📊 Summary:')
  console.log(`   ✓ Successfully created: ${successCount} field welds`)
  if (errorCount > 0) {
    console.log(`   ❌ Failed: ${errorCount} field welds`)
  }
  console.log('='.repeat(50))

  process.exit(errorCount > 0 ? 1 : 0)
}

// Run script
main().catch(error => {
  console.error('💥 Unexpected error:', error)
  process.exit(1)
})

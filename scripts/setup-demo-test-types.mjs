/**
 * Setup Demo Test Types and Workflow Stages
 * Feature: 031-one-click-demo-access
 *
 * Sets test_type on demo test packages:
 * - Air, Nitrogen: "In-service Test" (minimal workflow)
 * - Steam, Process, Condensate: "Hydrostatic Test" (full hydro workflow)
 *
 * Creates workflow stages from templates for each package.
 *
 * Run from project root: node scripts/setup-demo-test-types.mjs
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const DEMO_PROJECT_ID = '313a514b-5c64-4ce9-9471-1fdbf2bd6daa'

// Test type assignments by package name (which matches system name)
const TEST_TYPE_MAP = {
  'Air': 'In-service Test',
  'Nitrogen': 'In-service Test',
  'Steam': 'Hydrostatic Test',
  'Process': 'Hydrostatic Test',
  'Condensate': 'Hydrostatic Test'
}

function loadEnv() {
  const envContent = readFileSync('.env', 'utf-8')
  const env = {}
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim()
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=')
      if (key && valueParts.length > 0) {
        env[key.trim()] = valueParts.join('=').trim()
      }
    }
  })
  return env
}

async function main() {
  console.log('🔧 Setting Up Demo Test Types and Workflow Stages\n')

  const env = loadEnv()
  const supabase = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  // Step 1: Fetch demo test packages
  console.log('1️⃣ Fetching demo test packages...')
  const { data: packages, error: pkgError } = await supabase
    .from('test_packages')
    .select('id, name, test_type')
    .eq('project_id', DEMO_PROJECT_ID)

  if (pkgError || !packages) {
    console.error('❌ Failed to fetch packages:', pkgError?.message)
    process.exit(1)
  }

  console.log(`   Found ${packages.length} test packages`)

  // Step 2: Fetch workflow templates
  console.log('\n2️⃣ Fetching workflow templates...')
  const { data: templates, error: tmpError } = await supabase
    .from('package_workflow_templates')
    .select('*')
    .order('test_type')
    .order('stage_order')

  if (tmpError || !templates) {
    console.error('❌ Failed to fetch templates:', tmpError?.message)
    process.exit(1)
  }

  // Group templates by test_type
  const templatesByType = {}
  for (const t of templates) {
    if (!templatesByType[t.test_type]) {
      templatesByType[t.test_type] = []
    }
    templatesByType[t.test_type].push(t)
  }

  console.log('   Available test types:')
  Object.entries(templatesByType).forEach(([type, stages]) => {
    console.log(`   - ${type}: ${stages.length} stages`)
  })

  // Step 3: Update test_type on each package
  console.log('\n3️⃣ Updating test_type on packages...')

  for (const pkg of packages) {
    const testType = TEST_TYPE_MAP[pkg.name]

    if (!testType) {
      console.log(`   ⚠️ No test type mapping for "${pkg.name}", skipping`)
      continue
    }

    if (pkg.test_type === testType) {
      console.log(`   ✓ "${pkg.name}" already set to "${testType}"`)
      continue
    }

    const { error: updateError } = await supabase
      .from('test_packages')
      .update({ test_type: testType })
      .eq('id', pkg.id)

    if (updateError) {
      console.error(`   ❌ Failed to update "${pkg.name}":`, updateError.message)
    } else {
      console.log(`   ✅ Set "${pkg.name}" → "${testType}"`)
    }
  }

  // Step 4: Create workflow stages for each package
  console.log('\n4️⃣ Creating workflow stages...')

  for (const pkg of packages) {
    const testType = TEST_TYPE_MAP[pkg.name]
    if (!testType) continue

    const stageTemplates = templatesByType[testType]
    if (!stageTemplates || stageTemplates.length === 0) {
      console.log(`   ⚠️ No templates for "${testType}"`)
      continue
    }

    // Check if stages already exist
    const { data: existingStages } = await supabase
      .from('package_workflow_stages')
      .select('id')
      .eq('package_id', pkg.id)

    if (existingStages && existingStages.length > 0) {
      console.log(`   ✓ "${pkg.name}" already has ${existingStages.length} stages`)
      continue
    }

    // Create stages from templates
    const stagesToInsert = stageTemplates.map(t => ({
      package_id: pkg.id,
      stage_name: t.stage_name,
      stage_order: t.stage_order,
      status: 'not_started'
    }))

    const { error: insertError } = await supabase
      .from('package_workflow_stages')
      .insert(stagesToInsert)

    if (insertError) {
      console.error(`   ❌ Failed to create stages for "${pkg.name}":`, insertError.message)
    } else {
      console.log(`   ✅ Created ${stagesToInsert.length} stages for "${pkg.name}"`)
    }
  }

  // Step 5: Verify final state
  console.log('\n5️⃣ Verifying final state...')

  const { data: finalPackages } = await supabase
    .from('test_packages')
    .select(`
      name,
      test_type,
      workflow_stages:package_workflow_stages(stage_name, stage_order, status)
    `)
    .eq('project_id', DEMO_PROJECT_ID)
    .order('name')

  if (finalPackages) {
    console.log('\n   Package Configuration:')
    for (const pkg of finalPackages) {
      const stageCount = pkg.workflow_stages?.length || 0
      console.log(`\n   📦 ${pkg.name}`)
      console.log(`      Test Type: ${pkg.test_type || 'NOT SET'}`)
      console.log(`      Workflow Stages: ${stageCount}`)
      if (pkg.workflow_stages && pkg.workflow_stages.length > 0) {
        pkg.workflow_stages
          .sort((a, b) => a.stage_order - b.stage_order)
          .forEach(s => {
            console.log(`        ${s.stage_order}. ${s.stage_name} (${s.status})`)
          })
      }
    }
  }

  console.log('\n' + '='.repeat(60))
  console.log('✅ TEST TYPE AND WORKFLOW SETUP COMPLETE!')
  console.log('='.repeat(60))
}

main()

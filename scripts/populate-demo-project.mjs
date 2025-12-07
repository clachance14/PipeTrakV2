/**
 * Populate Demo Project Script
 * Feature: 031-one-click-demo-access
 *
 * Populates the shared demo project with realistic data:
 * - 20 drawings (linked to areas and systems)
 * - 200 components (spools, supports, valves, flanges, instruments)
 * - 120 field welds (3 per spool)
 * - Milestone progress states
 * - Welder assignments
 *
 * Components are properly linked to:
 * - Test packages (via test_package_id)
 * - Drawings (via drawing_id)
 * - Areas and Systems
 *
 * Run from project root: node scripts/populate-demo-project.mjs
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

// Demo project IDs (from create-shared-demo-account.mjs output)
const DEMO_PROJECT_ID = '313a514b-5c64-4ce9-9471-1fdbf2bd6daa'
const DEMO_ORG_ID = '5bbb477a-f695-412b-a231-d6b6a3a18ca2'

// Load environment variables from .env file
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
  console.log('🚀 Populating demo project with data...\n')

  // Load environment
  const env = loadEnv()
  const supabaseUrl = env.VITE_SUPABASE_URL
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('❌ Missing required environment variables:')
    if (!supabaseUrl) console.error('  - VITE_SUPABASE_URL')
    if (!serviceRoleKey) console.error('  - SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }

  // Create Supabase client with service role (bypasses RLS)
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  try {
    // Step 1: Verify demo project exists
    console.log('1️⃣ Verifying demo project exists...')
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, name, organization_id')
      .eq('id', DEMO_PROJECT_ID)
      .single()

    if (projectError || !project) {
      throw new Error(`Demo project not found: ${DEMO_PROJECT_ID}`)
    }
    console.log(`   ✅ Found project: ${project.name}`)

    // Step 2: Check current data counts
    console.log('\n2️⃣ Checking current data counts...')

    const { count: drawingCount } = await supabase
      .from('drawings')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', DEMO_PROJECT_ID)

    const { count: componentCount } = await supabase
      .from('components')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', DEMO_PROJECT_ID)

    const { count: weldCount } = await supabase
      .from('field_welds')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', DEMO_PROJECT_ID)

    console.log(`   Current counts:`)
    console.log(`   - Drawings: ${drawingCount || 0}`)
    console.log(`   - Components: ${componentCount || 0}`)
    console.log(`   - Field Welds: ${weldCount || 0}`)

    if ((componentCount || 0) > 0) {
      console.log('\n   ⚠️ Data already exists. Running population will skip duplicates.')
    }

    // Step 3: Call populate-demo-data Edge Function
    console.log('\n3️⃣ Calling populate-demo-data Edge Function...')
    console.log('   This may take 30-60 seconds...\n')

    const startTime = Date.now()

    const { data: result, error: fnError } = await supabase.functions.invoke('populate-demo-data', {
      body: {
        projectId: DEMO_PROJECT_ID,
        organizationId: DEMO_ORG_ID
      }
    })

    if (fnError) {
      throw new Error(`Edge Function error: ${fnError.message}`)
    }

    const duration = Date.now() - startTime
    console.log(`   ✅ Population completed in ${duration}ms`)

    // Step 4: Display results
    console.log('\n' + '='.repeat(60))
    console.log('📊 POPULATION RESULTS')
    console.log('='.repeat(60))

    if (result) {
      console.log(`
Success: ${result.success ? '✅ Yes' : '❌ No'}

Data Created:
  - Drawings:      ${result.drawingsCreated || 0}
  - Components:    ${result.componentsCreated || 0}
  - Field Welds:   ${result.weldsCreated || 0}
  - Milestones:    ${result.milestonesUpdated || 0}
  - Weld Assigns:  ${result.weldersAssigned || 0}

Execution Time: ${result.executionTimeMs || duration}ms
`)

      if (result.errors && result.errors.length > 0) {
        console.log('Errors:')
        result.errors.forEach(e => console.log(`  - ${e}`))
      }
    }

    // Step 5: Verify final counts
    console.log('\n4️⃣ Verifying final data counts...')

    const { count: finalDrawings } = await supabase
      .from('drawings')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', DEMO_PROJECT_ID)

    const { count: finalComponents } = await supabase
      .from('components')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', DEMO_PROJECT_ID)

    const { count: finalWelds } = await supabase
      .from('field_welds')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', DEMO_PROJECT_ID)

    const { count: testPackageLinks } = await supabase
      .from('components')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', DEMO_PROJECT_ID)
      .not('test_package_id', 'is', null)

    console.log(`   Final counts:`)
    console.log(`   - Drawings:                 ${finalDrawings || 0}`)
    console.log(`   - Components:               ${finalComponents || 0}`)
    console.log(`   - Field Welds:              ${finalWelds || 0}`)
    console.log(`   - Components with packages: ${testPackageLinks || 0}`)

    // Step 6: Verify test package relationships
    console.log('\n5️⃣ Verifying test package relationships...')

    const { data: packageStats } = await supabase
      .from('test_packages')
      .select(`
        id,
        name,
        components:components(count)
      `)
      .eq('project_id', DEMO_PROJECT_ID)

    if (packageStats) {
      console.log('\n   Components per Test Package:')
      for (const pkg of packageStats) {
        const count = pkg.components?.[0]?.count || 0
        console.log(`   - ${pkg.name}: ${count} components`)
      }
    }

    console.log('\n' + '='.repeat(60))
    console.log('🎉 DEMO PROJECT POPULATED SUCCESSFULLY!')
    console.log('='.repeat(60))
    console.log(`
You can now:
  1. Login as demo@pipetrak.co / demo123
  2. View the Dashboard with realistic progress data
  3. Browse Components, Drawings, and Weld Log
  4. See milestone progress and welder assignments
`)

  } catch (error) {
    console.error('\n❌ Error:', error.message)
    process.exit(1)
  }
}

main()

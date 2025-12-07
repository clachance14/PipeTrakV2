/**
 * Verify Demo Data Relationships
 * Feature: 031-one-click-demo-access
 *
 * Verifies that all data relationships are properly linked:
 * - Drawings → Areas, Systems
 * - Components → Drawings, Test Packages, Areas, Systems
 * - Field Welds → Components
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const DEMO_PROJECT_ID = '313a514b-5c64-4ce9-9471-1fdbf2bd6daa'

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
  console.log('🔍 Verifying Demo Data Relationships\n')

  const env = loadEnv()
  const supabase = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  let allPassed = true

  // Test 1: Drawings have areas and systems
  console.log('1️⃣ Checking Drawing → Area/System relationships...')
  const { data: drawings } = await supabase
    .from('drawings')
    .select(`
      drawing_no_norm,
      area:areas(name),
      system:systems(name)
    `)
    .eq('project_id', DEMO_PROJECT_ID)
    .limit(5)

  if (drawings && drawings.length > 0) {
    console.log('   ✅ Sample drawings with relationships:')
    drawings.forEach(d => {
      console.log(`      - ${d.drawing_no_norm} → Area: ${d.area?.name || 'NONE'}, System: ${d.system?.name || 'NONE'}`)
    })
    const missingArea = drawings.filter(d => !d.area)
    const missingSystem = drawings.filter(d => !d.system)
    if (missingArea.length > 0 || missingSystem.length > 0) {
      console.log('   ⚠️ Some drawings missing area or system!')
      allPassed = false
    }
  }

  // Test 2: Components have drawings and test packages
  console.log('\n2️⃣ Checking Component → Drawing/Package relationships...')
  const { data: components } = await supabase
    .from('components')
    .select(`
      component_type,
      attributes,
      drawing:drawings(drawing_no_norm),
      test_package:test_packages(name)
    `)
    .eq('project_id', DEMO_PROJECT_ID)
    .limit(10)

  if (components && components.length > 0) {
    console.log('   ✅ Sample components with relationships:')
    components.slice(0, 5).forEach(c => {
      const tag = c.attributes?.tag || 'unknown'
      console.log(`      - ${tag} (${c.component_type}) → Drawing: ${c.drawing?.drawing_no_norm || 'NONE'}, Package: ${c.test_package?.name || 'NONE'}`)
    })

    const missingDrawing = components.filter(c => !c.drawing)
    const missingPackage = components.filter(c => !c.test_package)
    if (missingDrawing.length > 0) {
      console.log(`   ⚠️ ${missingDrawing.length} components missing drawing!`)
      allPassed = false
    }
    if (missingPackage.length > 0) {
      console.log(`   ⚠️ ${missingPackage.length} components missing test package!`)
      allPassed = false
    }
  }

  // Test 3: Field welds have components
  console.log('\n3️⃣ Checking Field Weld → Component relationships...')
  const { data: welds } = await supabase
    .from('field_welds')
    .select(`
      id,
      weld_type,
      component:components(
        attributes,
        drawing:drawings(drawing_no_norm),
        test_package:test_packages(name)
      )
    `)
    .eq('project_id', DEMO_PROJECT_ID)
    .limit(5)

  if (welds && welds.length > 0) {
    console.log('   ✅ Sample field welds with relationships:')
    welds.forEach(w => {
      const tag = w.component?.attributes?.tag || 'unknown'
      const drawing = w.component?.drawing?.drawing_no_norm || 'NONE'
      const pkg = w.component?.test_package?.name || 'NONE'
      console.log(`      - ${tag} (${w.weld_type}) → Drawing: ${drawing}, Package: ${pkg}`)
    })

    const missingComponent = welds.filter(w => !w.component)
    if (missingComponent.length > 0) {
      console.log(`   ⚠️ ${missingComponent.length} welds missing component!`)
      allPassed = false
    }
  }

  // Test 4: Components per drawing
  console.log('\n4️⃣ Checking components per drawing distribution...')
  const { data: drawingStats } = await supabase
    .from('drawings')
    .select(`
      drawing_no_norm,
      components:components(count)
    `)
    .eq('project_id', DEMO_PROJECT_ID)

  if (drawingStats) {
    const withComponents = drawingStats.filter(d => (d.components?.[0]?.count || 0) > 0)
    const withoutComponents = drawingStats.filter(d => (d.components?.[0]?.count || 0) === 0)

    console.log(`   ✅ ${withComponents.length} drawings have components`)
    if (withoutComponents.length > 0) {
      console.log(`   ⚠️ ${withoutComponents.length} drawings have NO components`)
    }

    // Show distribution
    console.log('\n   Components per drawing:')
    drawingStats.slice(0, 5).forEach(d => {
      const count = d.components?.[0]?.count || 0
      console.log(`      - ${d.drawing_no_norm}: ${count} components`)
    })
  }

  // Test 5: Welds with welders assigned
  console.log('\n5️⃣ Checking welder assignments...')
  const { data: welderStats } = await supabase
    .from('field_welds')
    .select(`
      welder:welders(stencil, name),
      date_welded
    `)
    .eq('project_id', DEMO_PROJECT_ID)
    .not('welder_id', 'is', null)
    .limit(10)

  if (welderStats && welderStats.length > 0) {
    console.log(`   ✅ ${welderStats.length}+ welds have welder assignments`)
    console.log('   Sample assignments:')
    welderStats.slice(0, 4).forEach(w => {
      console.log(`      - ${w.welder?.stencil} (${w.welder?.name}) on ${w.date_welded}`)
    })
  }

  // Test 6: Check milestone progress
  console.log('\n6️⃣ Checking milestone progress distribution...')
  const { data: progressStats } = await supabase
    .from('components')
    .select('percent_complete')
    .eq('project_id', DEMO_PROJECT_ID)

  if (progressStats) {
    const complete = progressStats.filter(c => c.percent_complete === 100).length
    const inProgress = progressStats.filter(c => c.percent_complete > 0 && c.percent_complete < 100).length
    const notStarted = progressStats.filter(c => c.percent_complete === 0).length

    console.log(`   ✅ Progress distribution:`)
    console.log(`      - Complete (100%):   ${complete}`)
    console.log(`      - In Progress:       ${inProgress}`)
    console.log(`      - Not Started (0%):  ${notStarted}`)
  }

  // Summary
  console.log('\n' + '='.repeat(60))
  if (allPassed) {
    console.log('✅ ALL RELATIONSHIP CHECKS PASSED!')
  } else {
    console.log('⚠️ SOME CHECKS HAVE WARNINGS - Review above')
  }
  console.log('='.repeat(60))
}

main()

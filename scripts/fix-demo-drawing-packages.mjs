/**
 * Fix Demo Drawing Test Package Assignments
 * Feature: 031-one-click-demo-access
 *
 * Updates drawings to have test_package_id set based on their system.
 * Since test packages now map 1:1 with systems, each drawing's test package
 * should match its system.
 *
 * Run from project root: node scripts/fix-demo-drawing-packages.mjs
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
  console.log('🔧 Fixing Demo Drawing Test Package Assignments\n')

  const env = loadEnv()
  const supabase = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  // Step 1: Build system → test_package map
  console.log('1️⃣ Building system → test package map...')

  const { data: systems } = await supabase
    .from('systems')
    .select('id, name')
    .eq('project_id', DEMO_PROJECT_ID)

  const { data: packages } = await supabase
    .from('test_packages')
    .select('id, name')
    .eq('project_id', DEMO_PROJECT_ID)

  if (!systems || !packages) {
    console.error('❌ Failed to fetch systems or packages')
    process.exit(1)
  }

  // Map system_id → test_package_id (by matching names)
  const systemToPackageMap = new Map()
  for (const system of systems) {
    const matchingPackage = packages.find(p => p.name === system.name)
    if (matchingPackage) {
      systemToPackageMap.set(system.id, matchingPackage.id)
      console.log(`   ${system.name}: system ${system.id.slice(0,8)}... → package ${matchingPackage.id.slice(0,8)}...`)
    }
  }

  // Step 2: Fetch drawings
  console.log('\n2️⃣ Fetching drawings...')
  const { data: drawings, error: drawError } = await supabase
    .from('drawings')
    .select('id, drawing_no_norm, system_id, test_package_id')
    .eq('project_id', DEMO_PROJECT_ID)

  if (drawError || !drawings) {
    console.error('❌ Failed to fetch drawings:', drawError?.message)
    process.exit(1)
  }

  console.log(`   Found ${drawings.length} drawings`)

  // Step 3: Update drawings to set test_package_id based on system
  console.log('\n3️⃣ Updating drawings...')

  let updatedCount = 0
  let skippedCount = 0
  let alreadyCorrect = 0

  for (const drawing of drawings) {
    if (!drawing.system_id) {
      console.log(`   ⚠️ "${drawing.drawing_no_norm}" has no system, skipping`)
      skippedCount++
      continue
    }

    const correctPackageId = systemToPackageMap.get(drawing.system_id)

    if (!correctPackageId) {
      console.log(`   ⚠️ No package found for system ${drawing.system_id}`)
      skippedCount++
      continue
    }

    if (drawing.test_package_id === correctPackageId) {
      alreadyCorrect++
      continue
    }

    const { error: updateError } = await supabase
      .from('drawings')
      .update({ test_package_id: correctPackageId })
      .eq('id', drawing.id)

    if (updateError) {
      console.error(`   ❌ Failed to update "${drawing.drawing_no_norm}":`, updateError.message)
    } else {
      updatedCount++
    }
  }

  console.log(`\n   ✅ Updated: ${updatedCount}`)
  console.log(`   ✓ Already correct: ${alreadyCorrect}`)
  console.log(`   ⏭️ Skipped: ${skippedCount}`)

  // Step 4: Refresh materialized views
  console.log('\n4️⃣ Refreshing materialized views...')
  try {
    await supabase.rpc('refresh_materialized_views')
    console.log('   ✅ Views refreshed')
  } catch (e) {
    console.log('   ⚠️ Could not refresh views:', e.message)
  }

  // Step 5: Verify
  console.log('\n5️⃣ Verifying drawing test package assignments...')

  const { data: verifyDrawings } = await supabase
    .from('drawings')
    .select(`
      drawing_no_norm,
      system:systems(name),
      test_package:test_packages(name)
    `)
    .eq('project_id', DEMO_PROJECT_ID)
    .limit(10)

  if (verifyDrawings) {
    console.log('\n   Sample drawings:')
    verifyDrawings.forEach(d => {
      const match = d.system?.name === d.test_package?.name ? '✅' : '❌'
      console.log(`   ${match} ${d.drawing_no_norm}: System="${d.system?.name || '—'}", Package="${d.test_package?.name || '—'}"`)
    })
  }

  // Count mismatches
  const { data: allDrawings } = await supabase
    .from('drawings')
    .select(`
      system:systems(name),
      test_package:test_packages(name)
    `)
    .eq('project_id', DEMO_PROJECT_ID)

  if (allDrawings) {
    const mismatched = allDrawings.filter(d => d.system?.name !== d.test_package?.name)
    if (mismatched.length === 0) {
      console.log('\n   ✅ All drawings have matching system and test package!')
    } else {
      console.log(`\n   ⚠️ ${mismatched.length} drawings have mismatched system/package`)
    }
  }

  console.log('\n' + '='.repeat(60))
  console.log('✅ DRAWING TEST PACKAGE ASSIGNMENT COMPLETE!')
  console.log('='.repeat(60))
}

main()

/**
 * Fix Demo Test Packages
 * Feature: 031-one-click-demo-access
 *
 * Updates test packages to be organized by system:
 * - Renames test packages to match system names
 * - Reassigns all components to the test package matching their system
 * - Removes unused test packages
 *
 * Run from project root: node scripts/fix-demo-test-packages.mjs
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
  console.log('🔧 Fixing Demo Test Packages (Organizing by System)\n')

  const env = loadEnv()
  const supabase = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  // Step 1: Get current systems
  console.log('1️⃣ Fetching systems...')
  const { data: systems, error: sysError } = await supabase
    .from('systems')
    .select('id, name')
    .eq('project_id', DEMO_PROJECT_ID)

  if (sysError || !systems) {
    console.error('❌ Failed to fetch systems:', sysError?.message)
    process.exit(1)
  }

  console.log(`   Found ${systems.length} systems:`)
  systems.forEach(s => console.log(`   - ${s.name} (${s.id})`))

  // Step 2: Get current test packages
  console.log('\n2️⃣ Fetching test packages...')
  const { data: packages, error: pkgError } = await supabase
    .from('test_packages')
    .select('id, name')
    .eq('project_id', DEMO_PROJECT_ID)

  if (pkgError || !packages) {
    console.error('❌ Failed to fetch packages:', pkgError?.message)
    process.exit(1)
  }

  console.log(`   Found ${packages.length} test packages`)

  // Step 3: Create a test package for each system (or rename existing)
  console.log('\n3️⃣ Creating/updating test packages to match systems...')

  const systemToPackageMap = new Map() // system_id -> test_package_id

  for (const system of systems) {
    // Check if a package with this system name already exists
    let pkg = packages.find(p => p.name === system.name)

    if (pkg) {
      console.log(`   ✓ Package "${system.name}" already exists`)
      systemToPackageMap.set(system.id, pkg.id)
    } else {
      // Find an unused package to rename, or create new
      const usedNames = systems.map(s => s.name)
      const unusedPkg = packages.find(p => !usedNames.includes(p.name) && !systemToPackageMap.has(p.id))

      if (unusedPkg) {
        // Rename this package
        const { error: renameError } = await supabase
          .from('test_packages')
          .update({ name: system.name })
          .eq('id', unusedPkg.id)

        if (renameError) {
          console.error(`   ❌ Failed to rename package to "${system.name}":`, renameError.message)
        } else {
          console.log(`   ✓ Renamed "${unusedPkg.name}" → "${system.name}"`)
          systemToPackageMap.set(system.id, unusedPkg.id)
          unusedPkg.name = system.name // Update local reference
        }
      } else {
        // Create new package
        const { data: newPkg, error: createError } = await supabase
          .from('test_packages')
          .insert({ project_id: DEMO_PROJECT_ID, name: system.name })
          .select()
          .single()

        if (createError) {
          console.error(`   ❌ Failed to create package "${system.name}":`, createError.message)
        } else {
          console.log(`   ✓ Created new package "${system.name}"`)
          systemToPackageMap.set(system.id, newPkg.id)
        }
      }
    }
  }

  // Step 4: Reassign all components to match their system's test package
  console.log('\n4️⃣ Reassigning components to system-based test packages...')

  const { data: components, error: compError } = await supabase
    .from('components')
    .select('id, system_id, test_package_id')
    .eq('project_id', DEMO_PROJECT_ID)

  if (compError || !components) {
    console.error('❌ Failed to fetch components:', compError?.message)
    process.exit(1)
  }

  let updatedCount = 0
  let skippedCount = 0

  for (const component of components) {
    if (!component.system_id) {
      skippedCount++
      continue
    }

    const correctPackageId = systemToPackageMap.get(component.system_id)

    if (!correctPackageId) {
      console.log(`   ⚠️ No package found for system ${component.system_id}`)
      skippedCount++
      continue
    }

    // Only update if different
    if (component.test_package_id !== correctPackageId) {
      const { error: updateError } = await supabase
        .from('components')
        .update({ test_package_id: correctPackageId })
        .eq('id', component.id)

      if (updateError) {
        console.error(`   ❌ Failed to update component ${component.id}:`, updateError.message)
      } else {
        updatedCount++
      }
    } else {
      skippedCount++
    }
  }

  console.log(`   ✅ Updated ${updatedCount} components`)
  console.log(`   ⏭️ Skipped ${skippedCount} (already correct or no system)`)

  // Step 5: Delete unused test packages (ones not in systemToPackageMap values)
  console.log('\n5️⃣ Removing unused test packages...')

  const usedPackageIds = new Set(systemToPackageMap.values())
  const unusedPackages = packages.filter(p => !usedPackageIds.has(p.id))

  if (unusedPackages.length > 0) {
    for (const pkg of unusedPackages) {
      // Check if any components still reference this package
      const { count } = await supabase
        .from('components')
        .select('*', { count: 'exact', head: true })
        .eq('test_package_id', pkg.id)

      if (count === 0) {
        const { error: deleteError } = await supabase
          .from('test_packages')
          .delete()
          .eq('id', pkg.id)

        if (deleteError) {
          console.log(`   ⚠️ Could not delete "${pkg.name}": ${deleteError.message}`)
        } else {
          console.log(`   🗑️ Deleted unused package "${pkg.name}"`)
        }
      } else {
        console.log(`   ⚠️ Package "${pkg.name}" still has ${count} components, skipping delete`)
      }
    }
  } else {
    console.log('   No unused packages to delete')
  }

  // Step 6: Refresh materialized views
  console.log('\n6️⃣ Refreshing materialized views...')
  try {
    await supabase.rpc('refresh_materialized_views')
    console.log('   ✅ Views refreshed')
  } catch (e) {
    console.log('   ⚠️ Could not refresh views:', e.message)
  }

  // Step 7: Verify final state
  console.log('\n7️⃣ Verifying final test package distribution...')

  const { data: finalPackages } = await supabase
    .from('test_packages')
    .select(`
      id,
      name,
      components:components(count)
    `)
    .eq('project_id', DEMO_PROJECT_ID)

  if (finalPackages) {
    console.log('\n   Test Package → Component Count:')
    for (const pkg of finalPackages) {
      const count = pkg.components?.[0]?.count || 0
      console.log(`   - ${pkg.name}: ${count} components`)
    }
  }

  // Verify system alignment
  console.log('\n   Verifying system alignment...')
  const { data: misaligned } = await supabase
    .from('components')
    .select(`
      id,
      system:systems(name),
      test_package:test_packages(name)
    `)
    .eq('project_id', DEMO_PROJECT_ID)
    .limit(500)

  if (misaligned) {
    const wrongCount = misaligned.filter(c => c.system?.name !== c.test_package?.name).length
    if (wrongCount === 0) {
      console.log('   ✅ All components have matching system and test package!')
    } else {
      console.log(`   ⚠️ ${wrongCount} components have mismatched system/package`)
    }
  }

  console.log('\n' + '='.repeat(60))
  console.log('✅ TEST PACKAGE REORGANIZATION COMPLETE!')
  console.log('='.repeat(60))
}

main()

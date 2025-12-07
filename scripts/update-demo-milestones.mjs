/**
 * Update Demo Milestones Script
 * Feature: 031-one-click-demo-access
 *
 * Updates component milestones to show realistic progress distribution.
 * Milestones are stored in the current_milestones JSONB column with values 0-100.
 *
 * Distribution:
 * - 30% components: 100% complete (all milestones at 100)
 * - 40% components: In progress (partial milestones)
 * - 30% components: Not started (all milestones at 0)
 *
 * Run from project root: node scripts/update-demo-milestones.mjs
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const DEMO_PROJECT_ID = '313a514b-5c64-4ce9-9471-1fdbf2bd6daa'
const DEMO_USER_ID = 'f6cb5c35-15c4-4831-9da7-c3130f136b35'

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

// Milestone definitions per component type (must match progress_templates exactly)
const MILESTONES_BY_TYPE = {
  spool: ['Receive', 'Erect', 'Connect', 'Punch', 'Test', 'Restore'],
  support: ['Receive', 'Install', 'Punch', 'Test', 'Restore'],
  valve: ['Receive', 'Install', 'Punch', 'Test', 'Restore'],
  flange: ['Receive', 'Install', 'Punch', 'Test', 'Restore'],
  instrument: ['Receive', 'Install', 'Punch', 'Test', 'Restore'],
  field_weld: ['Fit-Up', 'Weld Made', 'Punch', 'Test', 'Restore']  // Note: Fit-Up with hyphen
}

// Generate milestone state based on progress level
function generateMilestones(componentType, progressLevel) {
  const milestones = MILESTONES_BY_TYPE[componentType] || ['Receive', 'Install', 'Punch']
  const result = {}

  if (progressLevel === 'complete') {
    // All milestones at 100
    milestones.forEach(m => result[m] = 100)
  } else if (progressLevel === 'in_progress') {
    // Random partial progress
    const completedCount = Math.floor(Math.random() * milestones.length)
    milestones.forEach((m, i) => {
      if (i < completedCount) {
        result[m] = 100
      } else if (i === completedCount) {
        // Partial progress on current milestone
        result[m] = Math.floor(Math.random() * 100)
      } else {
        result[m] = 0
      }
    })
  } else {
    // Not started - all at 0
    milestones.forEach(m => result[m] = 0)
  }

  return result
}

// Calculate percent complete from milestones (simplified - equal weights)
function calculatePercent(milestones) {
  const values = Object.values(milestones)
  if (values.length === 0) return 0
  const sum = values.reduce((a, b) => a + b, 0)
  return Math.round(sum / values.length)
}

async function main() {
  console.log('🔧 Updating Demo Component Milestones\n')

  const env = loadEnv()
  const supabase = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  // Fetch all demo components
  console.log('1️⃣ Fetching demo components...')
  const { data: components, error } = await supabase
    .from('components')
    .select('id, component_type, current_milestones')
    .eq('project_id', DEMO_PROJECT_ID)

  if (error) {
    console.error('❌ Failed to fetch components:', error.message)
    process.exit(1)
  }

  console.log(`   Found ${components.length} components`)

  // Distribute progress levels: 30% complete, 40% in progress, 30% not started
  const total = components.length
  const completeCount = Math.floor(total * 0.30)
  const inProgressCount = Math.floor(total * 0.40)
  // remaining are not started

  // Shuffle components to randomize distribution
  const shuffled = [...components].sort(() => Math.random() - 0.5)

  console.log('\n2️⃣ Generating milestone data...')
  console.log(`   - Complete (30%): ${completeCount}`)
  console.log(`   - In Progress (40%): ${inProgressCount}`)
  console.log(`   - Not Started (30%): ${total - completeCount - inProgressCount}`)

  // Prepare updates
  const updates = shuffled.map((component, index) => {
    let progressLevel
    if (index < completeCount) {
      progressLevel = 'complete'
    } else if (index < completeCount + inProgressCount) {
      progressLevel = 'in_progress'
    } else {
      progressLevel = 'not_started'
    }

    const milestones = generateMilestones(component.component_type, progressLevel)
    const percentComplete = calculatePercent(milestones)

    return {
      id: component.id,
      current_milestones: milestones,
      percent_complete: percentComplete,
      last_updated_at: new Date().toISOString(),
      last_updated_by: DEMO_USER_ID
    }
  })

  // Batch update components
  console.log('\n3️⃣ Updating components...')
  let updatedCount = 0
  const batchSize = 50

  for (let i = 0; i < updates.length; i += batchSize) {
    const batch = updates.slice(i, i + batchSize)

    // Update each component in batch
    for (const update of batch) {
      const { error: updateError } = await supabase
        .from('components')
        .update({
          current_milestones: update.current_milestones,
          percent_complete: update.percent_complete,
          last_updated_at: update.last_updated_at,
          last_updated_by: update.last_updated_by
        })
        .eq('id', update.id)

      if (updateError) {
        console.error(`   ⚠️ Failed to update ${update.id}:`, updateError.message)
      } else {
        updatedCount++
      }
    }

    process.stdout.write(`   Progress: ${Math.min(i + batchSize, updates.length)}/${updates.length}\r`)
  }

  console.log(`\n   ✅ Updated ${updatedCount} components`)

  // Update field welds milestones too
  console.log('\n4️⃣ Updating field weld milestones...')
  const { data: welds, error: weldsError } = await supabase
    .from('field_welds')
    .select('id')
    .eq('project_id', DEMO_PROJECT_ID)

  if (weldsError) {
    console.error('   ⚠️ Failed to fetch welds:', weldsError.message)
  } else if (welds) {
    // Distribute weld progress: 40% complete, 35% fit up only, 25% not started
    const weldTotal = welds.length
    const weldComplete = Math.floor(weldTotal * 0.40)
    const weldFitUp = Math.floor(weldTotal * 0.35)

    const shuffledWelds = [...welds].sort(() => Math.random() - 0.5)
    let weldUpdated = 0

    for (let i = 0; i < shuffledWelds.length; i++) {
      const weld = shuffledWelds[i]
      let fitUp = false
      let weldMade = false
      let punch = false

      if (i < weldComplete) {
        // Complete - all milestones true
        fitUp = true
        weldMade = true
        punch = true
      } else if (i < weldComplete + weldFitUp) {
        // Fit up complete, maybe weld made
        fitUp = true
        weldMade = Math.random() > 0.5
      }
      // else: not started

      const { error: weldUpdateError } = await supabase
        .from('field_welds')
        .update({
          fit_up: fitUp,
          weld_made: weldMade,
          punch: punch
        })
        .eq('id', weld.id)

      if (!weldUpdateError) {
        weldUpdated++
      }
    }

    console.log(`   ✅ Updated ${weldUpdated} field welds`)
  }

  // Refresh materialized views
  console.log('\n5️⃣ Refreshing materialized views...')
  try {
    await supabase.rpc('refresh_materialized_views')
    console.log('   ✅ Views refreshed')
  } catch (e) {
    console.log('   ⚠️ Could not refresh views:', e.message)
  }

  // Verify final distribution
  console.log('\n6️⃣ Verifying milestone distribution...')
  const { data: finalComponents } = await supabase
    .from('components')
    .select('percent_complete')
    .eq('project_id', DEMO_PROJECT_ID)

  if (finalComponents) {
    const complete = finalComponents.filter(c => c.percent_complete === 100).length
    const inProgress = finalComponents.filter(c => c.percent_complete > 0 && c.percent_complete < 100).length
    const notStarted = finalComponents.filter(c => c.percent_complete === 0).length

    console.log(`   Final distribution:`)
    console.log(`   - Complete (100%):   ${complete} (${Math.round(complete/finalComponents.length*100)}%)`)
    console.log(`   - In Progress:       ${inProgress} (${Math.round(inProgress/finalComponents.length*100)}%)`)
    console.log(`   - Not Started (0%):  ${notStarted} (${Math.round(notStarted/finalComponents.length*100)}%)`)
  }

  console.log('\n' + '='.repeat(60))
  console.log('✅ MILESTONE UPDATE COMPLETE!')
  console.log('='.repeat(60))
}

main()

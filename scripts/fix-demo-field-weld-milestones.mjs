/**
 * Fix Demo Field Weld Milestones
 * Feature: 031-one-click-demo-access
 *
 * The field weld progress views expect specific milestone key names:
 * - "Fit-up" (lowercase u) - not "Fit-Up"
 * - "Weld Complete" - not "Weld Made"
 *
 * This script updates the demo field weld components to use the correct keys
 * so they appear correctly in reports.
 *
 * Run from project root: node scripts/fix-demo-field-weld-milestones.mjs
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

async function main() {
  console.log('🔧 Fixing Demo Field Weld Milestones\n')

  const env = loadEnv()
  const supabase = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  // Fetch all field weld components
  console.log('1️⃣ Fetching field weld components...')
  const { data: components, error } = await supabase
    .from('components')
    .select('id, current_milestones, percent_complete')
    .eq('project_id', DEMO_PROJECT_ID)
    .eq('component_type', 'field_weld')

  if (error || !components) {
    console.error('❌ Failed to fetch components:', error?.message)
    process.exit(1)
  }

  console.log(`   Found ${components.length} field weld components`)

  // Transform milestone keys to match what views expect
  // Old keys: Fit-Up, Weld Made, Punch, Test, Restore
  // New keys: Fit-up, Weld Complete, Punch, Test, Restore
  console.log('\n2️⃣ Transforming milestone keys...')

  let updatedCount = 0
  let unchangedCount = 0

  for (const component of components) {
    const oldMilestones = component.current_milestones || {}
    const newMilestones = {}

    // Map old keys to new keys
    for (const [key, value] of Object.entries(oldMilestones)) {
      if (key === 'Fit-Up') {
        newMilestones['Fit-up'] = value
      } else if (key === 'Weld Made') {
        newMilestones['Weld Complete'] = value
      } else {
        newMilestones[key] = value
      }
    }

    // Check if anything changed
    const oldJson = JSON.stringify(oldMilestones)
    const newJson = JSON.stringify(newMilestones)

    if (oldJson === newJson) {
      unchangedCount++
      continue
    }

    // Update the component
    const { error: updateError } = await supabase
      .from('components')
      .update({
        current_milestones: newMilestones,
        last_updated_at: new Date().toISOString(),
        last_updated_by: DEMO_USER_ID
      })
      .eq('id', component.id)

    if (updateError) {
      console.error(`   ❌ Failed to update ${component.id}:`, updateError.message)
    } else {
      updatedCount++
    }
  }

  console.log(`   ✅ Updated: ${updatedCount}`)
  console.log(`   ⏭️ Unchanged: ${unchangedCount}`)

  // Now set realistic progress distribution
  console.log('\n3️⃣ Setting realistic progress distribution...')

  // Refetch components with new milestones
  const { data: refreshedComponents } = await supabase
    .from('components')
    .select('id, current_milestones')
    .eq('project_id', DEMO_PROJECT_ID)
    .eq('component_type', 'field_weld')

  if (!refreshedComponents) {
    console.error('❌ Failed to refetch components')
    process.exit(1)
  }

  // Distribute: 40% complete, 35% fit-up done, 25% not started
  const total = refreshedComponents.length
  const completeCount = Math.floor(total * 0.40)
  const fitupCount = Math.floor(total * 0.35)

  const shuffled = [...refreshedComponents].sort(() => Math.random() - 0.5)

  let progressUpdated = 0

  for (let i = 0; i < shuffled.length; i++) {
    const component = shuffled[i]
    let milestones = {}

    if (i < completeCount) {
      // Complete: all milestones at 100
      milestones = {
        'Fit-up': 100,
        'Weld Complete': 100,
        'Punch': 100,
        'Test': 100,
        'Restore': 100
      }
    } else if (i < completeCount + fitupCount) {
      // Fit-up complete, maybe weld complete
      const hasWeldComplete = Math.random() > 0.5
      milestones = {
        'Fit-up': 100,
        'Weld Complete': hasWeldComplete ? 100 : 0,
        'Punch': 0,
        'Test': 0,
        'Restore': 0
      }
    } else {
      // Not started
      milestones = {
        'Fit-up': 0,
        'Weld Complete': 0,
        'Punch': 0,
        'Test': 0,
        'Restore': 0
      }
    }

    const { error: updateError } = await supabase
      .from('components')
      .update({
        current_milestones: milestones,
        last_updated_at: new Date().toISOString()
      })
      .eq('id', component.id)

    if (!updateError) {
      progressUpdated++
    }
  }

  console.log(`   ✅ Updated progress for ${progressUpdated} components`)

  // Refresh materialized views
  console.log('\n4️⃣ Refreshing materialized views...')
  try {
    await supabase.rpc('refresh_materialized_views')
    console.log('   ✅ Views refreshed')
  } catch (e) {
    console.log('   ⚠️ Could not refresh views:', e.message)
  }

  // Verify by checking one of the views
  console.log('\n5️⃣ Verifying field weld report data...')

  const { data: reportData } = await supabase
    .from('vw_field_weld_progress_by_system')
    .select('*')
    .eq('project_id', DEMO_PROJECT_ID)

  if (reportData && reportData.length > 0) {
    console.log('\n   Field Weld Progress by System:')
    reportData.forEach(r => {
      console.log(`   - ${r.system_name}: ${r.total_welds} welds, ${r.pct_fitup}% fit-up, ${r.pct_weld_complete}% weld complete`)
    })
  }

  // Also check sample data
  const { data: sampleData } = await supabase
    .from('components')
    .select('current_milestones, percent_complete')
    .eq('project_id', DEMO_PROJECT_ID)
    .eq('component_type', 'field_weld')
    .limit(3)

  if (sampleData) {
    console.log('\n   Sample field weld milestones:')
    sampleData.forEach(c => {
      console.log(`   ${JSON.stringify(c.current_milestones)} → ${c.percent_complete}%`)
    })
  }

  console.log('\n' + '='.repeat(60))
  console.log('✅ FIELD WELD MILESTONES FIXED!')
  console.log('='.repeat(60))
}

main()

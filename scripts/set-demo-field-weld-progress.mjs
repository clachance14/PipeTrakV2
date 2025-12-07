/**
 * Set demo field weld progress using numeric 0/1 (matching real projects)
 * Distribution: 40% complete, 35% fitup only, 25% not started
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
  const env = loadEnv()
  const supabase = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  // Fetch field weld components
  const { data: components } = await supabase
    .from('components')
    .select('id')
    .eq('project_id', DEMO_PROJECT_ID)
    .eq('component_type', 'field_weld')

  console.log(`Setting progress for ${components.length} field weld components...`)

  // Distribution: 40% complete, 35% fitup+weld, 25% not started
  const total = components.length
  const completeCount = Math.floor(total * 0.40)
  const fitupCount = Math.floor(total * 0.35)

  // Shuffle for random distribution
  const shuffled = [...components].sort(() => Math.random() - 0.5)

  let updated = 0
  for (let i = 0; i < shuffled.length; i++) {
    const component = shuffled[i]
    let milestones = {}

    if (i < completeCount) {
      // Complete: all milestones = 1
      milestones = {
        'Fit-up': 1,
        'Weld Complete': 1,
        'Punch': 1,
        'Test': 1,
        'Restore': 1
      }
    } else if (i < completeCount + fitupCount) {
      // Fitup complete, maybe weld complete
      const hasWeldComplete = Math.random() > 0.5
      milestones = {
        'Fit-up': 1,
        'Weld Complete': hasWeldComplete ? 1 : 0,
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

    const { error } = await supabase
      .from('components')
      .update({ current_milestones: milestones })
      .eq('id', component.id)

    if (!error) updated++
  }

  console.log(`Updated ${updated} components`)

  // Verify sample
  const { data: sample } = await supabase
    .from('components')
    .select('current_milestones')
    .eq('project_id', DEMO_PROJECT_ID)
    .eq('component_type', 'field_weld')
    .limit(5)

  console.log('\nSample milestones:')
  sample.forEach(c => console.log(JSON.stringify(c.current_milestones)))

  // Check all views
  console.log('\n--- Checking Views ---')

  const { data: systemView } = await supabase
    .from('vw_field_weld_progress_by_system')
    .select('*')
    .eq('project_id', DEMO_PROJECT_ID)

  console.log('\nSystem view:')
  if (systemView) {
    systemView.forEach(r => console.log(`  ${r.system_name}: ${r.pct_fitup}% fitup, ${r.pct_weld_complete}% weld complete`))
  }

  const { data: welderView } = await supabase
    .from('vw_field_weld_progress_by_welder')
    .select('*')
    .eq('project_id', DEMO_PROJECT_ID)

  console.log('\nWelder view:')
  if (welderView) {
    welderView.forEach(r => console.log(`  ${r.welder_stencil}: ${r.pct_fitup}% fitup, ${r.pct_weld_complete}% weld complete`))
  }
}

main()

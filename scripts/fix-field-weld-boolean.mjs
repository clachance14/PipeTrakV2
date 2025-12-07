/**
 * Fix field weld milestones to use boolean true/false
 * The welder view checks for = 'true' string, not numeric 1
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
    .select('id, current_milestones')
    .eq('project_id', DEMO_PROJECT_ID)
    .eq('component_type', 'field_weld')

  console.log(`Updating ${components.length} field weld components to use boolean values...`)

  let updated = 0
  for (const c of components) {
    const oldMs = c.current_milestones || {}
    const newMs = {}

    // Convert numeric 1 -> boolean true, 0 -> boolean false
    for (const [key, value] of Object.entries(oldMs)) {
      newMs[key] = value >= 1 ? true : false
    }

    const { error } = await supabase
      .from('components')
      .update({ current_milestones: newMs })
      .eq('id', c.id)

    if (!error) updated++
  }

  console.log(`Updated ${updated} components`)

  // Verify
  const { data: sample } = await supabase
    .from('components')
    .select('current_milestones')
    .eq('project_id', DEMO_PROJECT_ID)
    .eq('component_type', 'field_weld')
    .limit(3)

  console.log('\nSample after update:')
  sample.forEach(c => console.log(JSON.stringify(c.current_milestones)))

  // Check welder view now
  const { data: welderData } = await supabase
    .from('vw_field_weld_progress_by_welder')
    .select('*')
    .eq('project_id', DEMO_PROJECT_ID)

  console.log('\nWelder view data after update:')
  welderData.forEach(r => {
    console.log(`${r.welder_stencil} (${r.welder_name}): ${r.total_welds} welds, ${r.pct_fitup}% fitup, ${r.pct_weld_complete}% weld complete`)
  })

  // Also check the other views still work
  const { data: systemData } = await supabase
    .from('vw_field_weld_progress_by_system')
    .select('*')
    .eq('project_id', DEMO_PROJECT_ID)

  console.log('\nSystem view data (should still work):')
  systemData.forEach(r => {
    console.log(`${r.system_name}: ${r.pct_fitup}% fitup, ${r.pct_weld_complete}% weld complete`)
  })
}

main()

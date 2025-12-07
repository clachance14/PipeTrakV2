/**
 * Populate Demo Field Weld Details
 * Feature: 031-one-click-demo-access
 *
 * Sets date_welded, xray_percentage, and welder assignments for demo field welds
 * so the welder summary report shows realistic data.
 *
 * Run from project root: node scripts/populate-demo-field-weld-details.mjs
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

// Generate a random date in the past N days
function randomPastDate(daysBack) {
  const now = new Date()
  const daysAgo = Math.floor(Math.random() * daysBack)
  const pastDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000)
  return pastDate.toISOString().split('T')[0]
}

async function main() {
  console.log('📊 Populating Demo Field Weld Details\n')

  const env = loadEnv()
  const supabase = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  // Step 1: Get all demo welders
  console.log('1️⃣ Fetching demo welders...')
  const { data: welders } = await supabase
    .from('welders')
    .select('id, stencil')
    .eq('project_id', DEMO_PROJECT_ID)

  if (!welders || welders.length === 0) {
    console.error('❌ No welders found')
    return
  }

  console.log(`   Found ${welders.length} welders: ${welders.map(w => w.stencil).join(', ')}`)

  // Step 2: Get all demo field welds with their milestones
  console.log('\n2️⃣ Fetching demo field welds...')
  const { data: fieldWelds, error } = await supabase
    .from('field_welds')
    .select(`
      id,
      weld_type,
      date_welded,
      xray_percentage,
      welder_id,
      component:components!inner(
        id,
        project_id,
        current_milestones
      )
    `)
    .eq('component.project_id', DEMO_PROJECT_ID)

  if (error) {
    console.error('❌ Error:', error.message)
    return
  }

  console.log(`   Found ${fieldWelds?.length || 0} field welds`)

  // Step 3: Update each field weld based on its milestone progress
  console.log('\n3️⃣ Updating field weld details...')

  let updated = 0
  let skipped = 0

  for (const fw of fieldWelds || []) {
    const milestones = fw.component?.current_milestones || {}
    const fitupComplete = milestones['Fit-up'] === 1
    const weldComplete = milestones['Weld Complete'] === 1

    const updates = {}

    // Assign welder to all field welds (round-robin)
    if (!fw.welder_id) {
      const welderIndex = updated % welders.length
      updates.welder_id = welders[welderIndex].id
    }

    // Set xray_percentage if not set (distribution: 60% @10%, 30% @5%, 10% @100%)
    if (fw.xray_percentage === null) {
      const rand = Math.random()
      if (rand < 0.1) {
        updates.xray_percentage = 100
      } else if (rand < 0.4) {
        updates.xray_percentage = 5
      } else {
        updates.xray_percentage = 10
      }
    }

    // Set date_welded if weld is complete and date not set
    if (weldComplete && !fw.date_welded) {
      updates.date_welded = randomPastDate(60) // Random date in past 60 days
    }

    // If nothing to update, skip
    if (Object.keys(updates).length === 0) {
      skipped++
      continue
    }

    const { error: updateError } = await supabase
      .from('field_welds')
      .update(updates)
      .eq('id', fw.id)

    if (updateError) {
      console.error(`   ❌ Failed to update ${fw.id}: ${updateError.message}`)
    } else {
      updated++
    }
  }

  console.log(`   ✅ Updated: ${updated}`)
  console.log(`   ⏭️ Skipped: ${skipped}`)

  // Step 4: Verify results
  console.log('\n4️⃣ Verifying results...')

  // Check welder assignment counts
  const { data: welderCounts } = await supabase
    .from('field_welds')
    .select(`
      welder_id,
      welder:welders(stencil)
    `)
    .eq('component.project_id', DEMO_PROJECT_ID)
    .not('welder_id', 'is', null)

  // This query doesn't work well, let's use the RPC
  const { data: rpcResult } = await supabase.rpc('get_weld_summary_by_welder', {
    p_project_id: DEMO_PROJECT_ID,
    p_start_date: null,
    p_end_date: null,
    p_welder_ids: null,
    p_area_ids: null,
    p_system_ids: null,
    p_package_ids: null
  })

  if (rpcResult && rpcResult.length > 0) {
    console.log('\n   Welder Summary Report Results:')
    rpcResult.forEach(row => {
      console.log(`   ${row.welder_stencil} (${row.welder_name}):`)
      console.log(`     Total: ${row.welds_total}, BW 5%: ${row.bw_welds_5pct}, BW 10%: ${row.bw_welds_10pct}, BW 100%: ${row.bw_welds_100pct}`)
      console.log(`     SW 5%: ${row.sw_welds_5pct}, SW 10%: ${row.sw_welds_10pct}, SW 100%: ${row.sw_welds_100pct}`)
    })
  }

  // Also check field weld progress by system view
  const { data: systemView } = await supabase
    .from('vw_field_weld_progress_by_system')
    .select('*')
    .eq('project_id', DEMO_PROJECT_ID)

  if (systemView && systemView.length > 0) {
    console.log('\n   Field Weld Progress by System:')
    systemView.forEach(r => {
      console.log(`   ${r.system_name}: ${r.total_welds} welds, ${r.pct_fitup}% fitup, ${r.pct_weld_complete}% weld complete`)
    })
  }

  console.log('\n' + '='.repeat(60))
  console.log('✅ DEMO FIELD WELD DETAILS POPULATED!')
  console.log('='.repeat(60))
}

main()

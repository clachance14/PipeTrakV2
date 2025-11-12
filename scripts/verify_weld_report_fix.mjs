#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

// Parse .env file
const envContent = readFileSync('.env', 'utf-8')
let supabaseUrl = ''
let supabaseServiceKey = ''

envContent.split('\n').forEach(line => {
  const trimmed = line.trim()
  if (trimmed.startsWith('VITE_SUPABASE_URL=')) {
    supabaseUrl = trimmed.substring('VITE_SUPABASE_URL='.length).trim()
  }
  if (trimmed.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) {
    supabaseServiceKey = trimmed.substring('SUPABASE_SERVICE_ROLE_KEY='.length).trim()
  }
})

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables')
  process.exit(1)
}

// Service role bypasses RLS
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false, autoRefreshToken: false }
})

console.log('=== Field Weld Progress Report - Area View ===\n')

// Query the view
const { data: areaData, error: areaError } = await supabase
  .from('vw_field_weld_progress_by_area')
  .select('*')
  .order('area_name')

if (areaError) {
  console.error('Error querying view:', areaError)
} else {
  console.log('Area Data from View:')
  areaData.forEach(row => {
    console.log(`\n${row.area_name}:`)
    console.log(`  Total Welds: ${row.total_welds}`)
    console.log(`  Fit-up %: ${row.pct_fitup}%`)
    console.log(`  Weld Complete %: ${row.pct_weld_complete}%`)
    console.log(`  Accepted %: ${row.pct_accepted}%`)
    console.log(`  NDE Pass Rate: ${row.nde_pass_rate}%`)
    console.log(`  Repair Rate: ${row.repair_rate}%`)
    console.log(`  Total Complete %: ${row.pct_total}%`)
  })
}

console.log('\n\n=== Raw Component Milestone Data (for comparison) ===\n')

// Query raw component data to verify
const { data: components, error: compError } = await supabase
  .from('components')
  .select('id, current_milestones, percent_complete, area_id, areas(name)')
  .eq('component_type', 'field_weld')
  .order('area_id')

if (compError) {
  console.error('Error querying components:', compError)
} else {
  // Group by area
  const byArea = {}
  components.forEach(comp => {
    const areaName = comp.areas?.name || 'Unassigned'
    if (!byArea[areaName]) {
      byArea[areaName] = []
    }
    byArea[areaName].push(comp)
  })

  Object.keys(byArea).sort().forEach(areaName => {
    console.log(`\n${areaName}:`)
    const comps = byArea[areaName]

    // Calculate manual stats
    const totalComps = comps.length
    const fitupComplete = comps.filter(c => c.current_milestones?.['Fit-up'] === 1).length
    const weldComplete = comps.filter(c => c.current_milestones?.['Weld Complete'] === 1).length
    const accepted = comps.filter(c => c.current_milestones?.['Accepted'] === 1).length
    const avgPercent = comps.reduce((sum, c) => sum + (parseFloat(c.percent_complete) || 0), 0) / totalComps

    console.log(`  Total Components: ${totalComps}`)
    console.log(`  Fit-up Complete: ${fitupComplete}/${totalComps} (${Math.round(fitupComplete/totalComps * 100)}%)`)
    console.log(`  Weld Complete: ${weldComplete}/${totalComps} (${Math.round(weldComplete/totalComps * 100)}%)`)
    console.log(`  Accepted: ${accepted}/${totalComps} (${Math.round(accepted/totalComps * 100)}%)`)
    console.log(`  Avg % Complete: ${Math.round(avgPercent)}%`)

    // Show sample milestone data
    console.log(`\n  Sample Milestones (first 2 components):`)
    comps.slice(0, 2).forEach(c => {
      console.log(`    ${c.id.substring(0, 8)}: ${JSON.stringify(c.current_milestones)}`)
    })
  })
}

console.log('\n\n=== Verification Summary ===\n')
console.log('If the view percentages match the manual calculations above,')
console.log('the migration was successful!\n')

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const envContent = readFileSync('/home/clachance14/projects/PipeTrak_V2/.env', 'utf-8')
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

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false, autoRefreshToken: false }
})

console.log('=== FIELD WELD DATA INVESTIGATION ===\n')

// 1. Get all field welds with component data
console.log('1. Field Welds with Component Milestones:')
const { data: fieldWelds, error: fwError } = await supabase
  .from('field_welds')
  .select('id, component_id, weld_type, date_welded, nde_result, status, is_repair')
  .order('component_id')

if (fwError) {
  console.error('Error fetching field welds:', fwError)
  process.exit(1)
}

console.log('Total field welds:', fieldWelds.length, '\n')

// 2. Get components with area info
const { data: components, error: compError } = await supabase
  .from('components')
  .select('id, component_type, area_id, current_milestones, percent_complete')
  .eq('component_type', 'field_weld')

if (compError) {
  console.error('Error fetching components:', compError)
  process.exit(1)
}

// 3. Get areas
const { data: areas, error: areaError } = await supabase
  .from('areas')
  .select('id, name')

if (areaError) {
  console.error('Error fetching areas:', areaError)
  process.exit(1)
}

const areaMap = {}
for (const area of areas) {
  areaMap[area.id] = area.name
}

const compMap = {}
for (const comp of components) {
  compMap[comp.id] = comp
}

// Group field welds by area
const byArea = {}
for (const fw of fieldWelds) {
  const comp = compMap[fw.component_id]
  if (!comp) continue
  
  const areaName = comp.area_id ? areaMap[comp.area_id] : 'NO AREA'
  if (!byArea[areaName]) {
    byArea[areaName] = []
  }
  byArea[areaName].push({ ...fw, component: comp })
}

console.log('Field Welds by Area:')
for (const [area, welds] of Object.entries(byArea).sort()) {
  console.log('\n' + area + ':', welds.length, 'welds')
  for (const weld of welds) {
    const milestones = weld.component.current_milestones || {}
    const compId = weld.component_id.substring(0,8)
    console.log('  - Component', compId + '...')
    console.log('    Status:', weld.status + ', NDE:', weld.nde_result || 'none', ', Is Repair:', weld.is_repair)
    console.log('    Percent Complete:', weld.component.percent_complete + '%')
    console.log('    Milestones:', JSON.stringify(milestones))
  }
}

// 4. Query the view directly
console.log('\n\n2. Direct Query of vw_field_weld_progress_by_area:')
const { data: viewData, error: viewError } = await supabase
  .from('vw_field_weld_progress_by_area')
  .select('*')
  .order('area_name')

if (viewError) {
  console.error('Error fetching view data:', viewError)
  process.exit(1)
}

console.log('\nView returned', viewData.length, 'rows:')
for (const row of viewData) {
  console.log('\n' + row.area_name + ':')
  console.log('  Total Welds:', row.total_welds)
  console.log('  Active:', row.active_count + ', Accepted:', row.accepted_count + ', Rejected:', row.rejected_count)
  console.log('  Fit-up %:', row.pct_fitup)
  console.log('  Weld Complete %:', row.pct_weld_complete)
  console.log('  Accepted %:', row.pct_accepted)
  console.log('  NDE Pass Rate:', row.nde_pass_rate)
  console.log('  Repair Rate:', row.repair_rate)
  console.log('  Total %:', row.pct_total)
}

// 5. Check milestone value types
console.log('\n\n3. Milestone Value Types in Components:')
for (const comp of components.slice(0, 3)) {
  const compId = comp.id.substring(0,8)
  console.log('\nComponent', compId + '...:')
  const milestones = comp.current_milestones || {}
  for (const [key, value] of Object.entries(milestones)) {
    console.log('  ' + key + ':', value, '(type:', typeof value + ')')
  }
}

console.log('\n=== END INVESTIGATION ===')

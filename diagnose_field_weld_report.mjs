import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

// Load environment variables
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

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false, autoRefreshToken: false }
})

console.log('=== Field Weld Report Diagnostic ===\n')

// Step 1: Find the Dark Knight project
console.log('Step 1: Finding Dark Knight Rail Car Loading project...')
const { data: projects, error: projectError } = await supabase
  .from('projects')
  .select('id, name')
  .ilike('name', '%Dark Knight Rail Car Loading%')

if (projectError) {
  console.error('Error finding project:', projectError)
  process.exit(1)
}

if (!projects || projects.length === 0) {
  console.log('No project found matching "Dark Knight"')
  console.log('\nListing all projects:')
  const { data: allProjects } = await supabase
    .from('projects')
    .select('id, name')
    .order('name')

  allProjects?.forEach(p => {
    console.log(`  - ${p.name} (ID: ${p.id})`)
  })
  process.exit(0)
}

const project = projects[0]
console.log(`✓ Found project: ${project.name}`)
console.log(`  Project ID: ${project.id}\n`)

// Step 2: Check if field weld components exist
console.log('Step 2: Checking for field weld components...')
const { data: components, error: componentError } = await supabase
  .from('components')
  .select('id, identity_key, area_id, system_id, test_package_id')
  .eq('project_id', project.id)
  .eq('component_type', 'field_weld')

if (componentError) {
  console.error('Error fetching components:', componentError)
  process.exit(1)
}

if (!components || components.length === 0) {
  console.log('✗ No field weld components found for this project')
  process.exit(0)
}

console.log(`✓ Found ${components.length} field weld components`)

// Step 3: Check metadata assignments
console.log('\nStep 3: Analyzing metadata assignments...')
const withArea = components.filter(c => c.area_id !== null).length
const withSystem = components.filter(c => c.system_id !== null).length
const withPackage = components.filter(c => c.test_package_id !== null).length

console.log(`  Components with area_id:         ${withArea} / ${components.length}`)
console.log(`  Components with system_id:       ${withSystem} / ${components.length}`)
console.log(`  Components with test_package_id: ${withPackage} / ${components.length}`)

if (withArea === 0 && withSystem === 0 && withPackage === 0) {
  console.log('\n⚠️  WARNING: ALL field weld components have NULL metadata assignments!')
} else if (withArea < components.length || withSystem < components.length || withPackage < components.length) {
  console.log('\n⚠️  WARNING: Some field weld components have NULL metadata assignments')
}

// Step 4: Check field_welds records
console.log('\nStep 4: Checking field_welds records...')
const { data: fieldWelds, error: weldsError } = await supabase
  .from('field_welds')
  .select('id, component_id')
  .eq('project_id', project.id)

if (weldsError) {
  console.error('Error fetching field_welds:', weldsError)
  process.exit(1)
}

console.log(`✓ Found ${fieldWelds?.length || 0} field_welds records`)

// Step 5: Check what the views return
console.log('\nStep 5: Checking field weld progress views...')

const { data: areaData, error: areaError } = await supabase
  .from('vw_field_weld_progress_by_area')
  .select('*')
  .eq('project_id', project.id)

const { data: systemData, error: systemError } = await supabase
  .from('vw_field_weld_progress_by_system')
  .select('*')
  .eq('project_id', project.id)

const { data: packageData, error: packageError } = await supabase
  .from('vw_field_weld_progress_by_test_package')
  .select('*')
  .eq('project_id', project.id)

console.log(`  vw_field_weld_progress_by_area:         ${areaData?.length || 0} rows`)
console.log(`  vw_field_weld_progress_by_system:       ${systemData?.length || 0} rows`)
console.log(`  vw_field_weld_progress_by_test_package: ${packageData?.length || 0} rows`)

if (areaError) console.error('  Area view error:', areaError)
if (systemError) console.error('  System view error:', systemError)
if (packageError) console.error('  Package view error:', packageError)

// Step 6: Summary
console.log('\n=== DIAGNOSIS SUMMARY ===')
if (components.length > 0 && (areaData?.length === 0 || systemData?.length === 0 || packageData?.length === 0)) {
  console.log('✗ PROBLEM CONFIRMED: Field weld components exist but views return no data')
  console.log('')
  console.log('Root Cause: Field weld components have NULL metadata assignments,')
  console.log('           and the views use LEFT JOIN from metadata tables which')
  console.log('           excludes unassigned components.')
  console.log('')
  console.log('Solution: Apply UNION pattern from migration 00117 to field weld views')
} else if (components.length === 0) {
  console.log('ℹ️  No field weld components found - this may be expected')
} else {
  console.log('✓ Views are returning data - issue may be resolved or different')
}

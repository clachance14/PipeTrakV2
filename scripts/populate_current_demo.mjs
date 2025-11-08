import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

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

const projectId = '44ddddc4-5cf6-48c0-b199-9d49f2e4a1a2'

console.log('Fetching project and organization details...\n')

const { data: project, error: projectError } = await supabase
  .from('projects')
  .select('id, name, organization_id, organizations(id, name)')
  .eq('id', projectId)
  .single()

if (projectError) {
  console.error('Error fetching project:', projectError.message)
  process.exit(1)
}

console.log(`Project: ${project.name}`)
console.log(`Project ID: ${project.id}`)
console.log(`Organization ID: ${project.organization_id}`)
console.log(`Organization: ${project.organizations.name}\n`)

const { data: users } = await supabase
  .from('users')
  .select('id')
  .eq('organization_id', project.organization_id)
  .limit(1)

const userId = users && users.length > 0 ? users[0].id : '00000000-0000-0000-0000-000000000000'

console.log('Step 1: Creating skeleton data...\n')

const { data: skeletonData, error: skeletonError } = await supabase.rpc('create_demo_skeleton', {
  p_user_id: userId,
  p_org_id: project.organization_id,
  p_project_id: project.id
})

if (skeletonError) {
  console.error('Skeleton creation failed:', skeletonError.message)
  process.exit(1)
}

console.log('Skeleton creation completed successfully!')

const [areas, systems, packages, welders] = await Promise.all([
  supabase.from('areas').select('name', { count: 'exact' }).eq('project_id', project.id),
  supabase.from('systems').select('name', { count: 'exact' }).eq('project_id', project.id),
  supabase.from('test_packages').select('name', { count: 'exact' }).eq('project_id', project.id),
  supabase.from('welders').select('stencil, stencil_norm, name', { count: 'exact' }).eq('project_id', project.id)
])

console.log('\nSkeleton verification:')
console.log(`  Areas: ${areas.count}`)
console.log(`  Systems: ${systems.count}`)
console.log(`  Test Packages: ${packages.count}`)
console.log(`  Welders: ${welders.count}`)

console.log('\n\nStep 2: Invoking bulk population Edge Function...\n')

const { data: populateData, error: populateError } = await supabase.functions.invoke('populate-demo-data', {
  body: {
    projectId: project.id,
    organizationId: project.organization_id
  }
})

if (populateError) {
  console.error('Edge Function invocation failed:', populateError.message)
  console.error('Error details:', JSON.stringify(populateError, null, 2))
  console.log('\nNote: The Edge Function may not be deployed yet.')
  console.log('You can deploy it with: supabase functions deploy populate-demo-data')
  process.exit(1)
}

console.log('Edge Function invoked successfully!')
console.log('\nResponse:', JSON.stringify(populateData, null, 2))

console.log('\n\nStep 3: Verifying bulk data (waiting 5 seconds for population to complete)...\n')

await new Promise(resolve => setTimeout(resolve, 5000))

const [drawings, components, welds] = await Promise.all([
  supabase.from('drawings').select('id', { count: 'exact' }).eq('project_id', project.id),
  supabase.from('components').select('id, component_type', { count: 'exact' }).eq('project_id', project.id),
  supabase.from('field_welds').select('id, welder_id', { count: 'exact' }).eq('project_id', project.id)
])

console.log('Bulk data verification:')
console.log(`  Drawings: ${drawings.count} / 20 expected`)
console.log(`  Components: ${components.count} / 320 expected (200 standard + 120 field welds)`)
console.log(`  Field Welds (table): ${welds.count} / 120 expected`)

if (components.count > 0) {
  const spools = components.data.filter(c => c.component_type === 'spool').length
  const supports = components.data.filter(c => c.component_type === 'support').length
  const valves = components.data.filter(c => c.component_type === 'valve').length
  const flanges = components.data.filter(c => c.component_type === 'flange').length
  const instruments = components.data.filter(c => c.component_type === 'instrument').length
  const fieldWelds = components.data.filter(c => c.component_type === 'field_weld').length

  console.log('\n  Component Distribution:')
  console.log(`    Spools:      ${spools} / 40 expected`)
  console.log(`    Supports:    ${supports} / 80 expected`)
  console.log(`    Valves:      ${valves} / 50 expected`)
  console.log(`    Flanges:     ${flanges} / 20 expected`)
  console.log(`    Instruments: ${instruments} / 10 expected`)
  console.log(`    Field Welds: ${fieldWelds} / 120 expected`)
}

const fullyPopulated = drawings.count === 20 && components.count === 320 && welds.count === 120

if (fullyPopulated) {
  console.log('\n\nSUCCESS: Demo project is fully populated!')
} else if (components.count > 0) {
  console.log('\n\nIN PROGRESS: Population started, may need more time to complete.')
} else {
  console.log('\n\nWARNING: No bulk data found. Edge Function may have failed or not be deployed.')
}

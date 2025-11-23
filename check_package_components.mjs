import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const envContent = readFileSync('.env', 'utf-8')
let supabaseUrl = ''
let supabaseAnonKey = ''

envContent.split('\n').forEach(line => {
  const trimmed = line.trim()
  if (trimmed.startsWith('VITE_SUPABASE_URL=')) {
    supabaseUrl = trimmed.substring('VITE_SUPABASE_URL='.length).trim()
  }
  if (trimmed.startsWith('VITE_SUPABASE_ANON_KEY=')) {
    supabaseAnonKey = trimmed.substring('VITE_SUPABASE_ANON_KEY='.length).trim()
  }
})

const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Check test packages and their component assignments
console.log('=== Test Packages ===')
const { data: packages } = await supabase
  .from('test_packages')
  .select('id, name')
  .order('name')

console.log('Found ' + packages.length + ' packages:')
packages.forEach(p => console.log('  ' + p.name + ' (' + p.id + ')'))

// Check components assigned to packages
console.log('\n=== Component Assignments (via components.test_package_id) ===')
for (const pkg of packages) {
  const { data: components } = await supabase
    .from('components')
    .select('id')
    .eq('test_package_id', pkg.id)
  
  console.log(pkg.name + ': ' + components.length + ' components')
}

// Check mv_package_readiness
console.log('\n=== Materialized View Data ===')
const { data: mvData } = await supabase
  .from('mv_package_readiness')
  .select('package_name, total_components, avg_percent_complete')
  .order('package_name')

mvData.forEach(row => {
  console.log(row.package_name + ': ' + row.total_components + ' components, ' + row.avg_percent_complete + '% complete')
})

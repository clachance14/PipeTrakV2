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

// Check test packages
console.log('=== Test Packages ===')
const { data: packages, error: packagesError } = await supabase
  .from('test_packages')
  .select('id, name')
  .order('name')

if (packagesError) {
  console.error('Error fetching packages:', packagesError)
} else {
  console.log('Found ' + packages.length + ' test packages')
  packages.forEach(pkg => console.log('- ' + pkg.name + ' (' + pkg.id + ')'))
}

// Check certificates
console.log('\n=== Package Certificates ===')
const { data: certificates, error: certificatesError } = await supabase
  .from('package_certificates')
  .select('package_id, certificate_number')

if (certificatesError) {
  console.error('Error fetching certificates:', certificatesError)
} else {
  console.log('Found ' + certificates.length + ' certificates')
}

// Check workflow stages
console.log('\n=== Workflow Stages ===')
const { data: stages, error: stagesError } = await supabase
  .from('package_workflow_stages')
  .select('package_id, stage_name, status')

if (stagesError) {
  console.error('Error fetching stages:', stagesError)
} else {
  console.log('Found ' + stages.length + ' workflow stages total')
}

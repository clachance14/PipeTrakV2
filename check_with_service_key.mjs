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

// Check test packages
console.log('=== Test Packages (Service Key) ===')
const { data: packages } = await supabase
  .from('test_packages')
  .select('id, name, project_id')
  .order('name')

console.log('Found ' + packages.length + ' packages')
packages.slice(0, 5).forEach(p => {
  console.log('  ' + p.name + ' (project: ' + p.project_id + ')')
})

// Check if packages have components assigned
if (packages.length > 0) {
  const pkg = packages.find(p => p.name === 'TP-5')
  if (pkg) {
    const { data: components } = await supabase
      .from('components')
      .select('id, line_number, test_package_id')
      .eq('test_package_id', pkg.id)
      .limit(3)
    
    console.log('\nTP-5 components sample:')
    components.forEach(c => console.log('  Line: ' + c.line_number))
  }
}

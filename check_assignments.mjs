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

// Find TP-5
const { data: packages } = await supabase
  .from('test_packages')
  .select('id, name')
  .eq('name', 'TP-5')
  .single()

if (!packages) {
  console.log('TP-5 not found')
  process.exit(0)
}

console.log('Found TP-5: ' + packages.id)

// Check package_drawing_assignments
console.log('\n=== Drawing Assignments ===')
const { data: drawingAssignments } = await supabase
  .from('package_drawing_assignments')
  .select('drawing_id')
  .eq('package_id', packages.id)

console.log('Drawings assigned: ' + (drawingAssignments ? drawingAssignments.length : 0))

// Check components table with test_package_id
console.log('\n=== Components (via test_package_id column) ===')
const { data: components1 } = await supabase
  .from('components')
  .select('id')
  .eq('test_package_id', packages.id)

console.log('Components assigned via test_package_id: ' + (components1 ? components1.length : 0))

// Check if there's a drawings table with test_package_id
console.log('\n=== Drawings (via drawings.test_package_id column) ===')
const { data: drawings } = await supabase
  .from('drawings')
  .select('id, number, test_package_id')
  .eq('test_package_id', packages.id)
  .limit(5)

console.log('Drawings with test_package_id: ' + (drawings ? drawings.length : 0))
if (drawings && drawings.length > 0) {
  drawings.forEach(d => console.log('  ' + d.number))
}

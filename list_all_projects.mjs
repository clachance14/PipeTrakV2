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

console.log('=== All Projects ===\n')

const { data: projects, error } = await supabase
  .from('projects')
  .select('id, name')
  .order('name')

if (error) {
  console.error('Error:', error)
  process.exit(1)
}

if (!projects || projects.length === 0) {
  console.log('No projects found')
  process.exit(0)
}

projects.forEach((p, index) => {
  console.log(`${index + 1}. ${p.name}`)
  console.log(`   ID: ${p.id}`)
  console.log('')
})

console.log(`Total: ${projects.length} projects`)

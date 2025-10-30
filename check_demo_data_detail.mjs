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

// Get most recent demo user's project
const { data: demoUser } = await supabase
  .from('users')
  .select('id, email, organization_id')
  .eq('is_demo_user', true)
  .order('created_at', { ascending: false })
  .limit(1)
  .single()

const { data: project } = await supabase
  .from('projects')
  .select('id, name')
  .eq('organization_id', demoUser.organization_id)
  .single()

console.log(`📊 Checking data for project: ${project.name}\n`)

// Check components by project_id
const { data: components, count: compCount } = await supabase
  .from('components')
  .select('*', { count: 'exact' })
  .eq('project_id', project.id)

console.log(`Components (by project_id): ${compCount}`)
if (compCount > 0) {
  console.log(`  Sample: ${components.slice(0, 3).map(c => c.identity).join(', ')}`)
}

// Check drawings
const { data: drawings, count: drawCount } = await supabase
  .from('drawings')
  .select('*', { count: 'exact' })
  .eq('project_id', project.id)

console.log(`Drawings (by project_id): ${drawCount}`)
if (drawCount > 0) {
  console.log(`  Sample: ${drawings.slice(0, 3).map(d => d.number).join(', ')}`)
}

// Check packages
const { data: packages, count: pkgCount } = await supabase
  .from('packages')
  .select('*', { count: 'exact' })
  .eq('project_id', project.id)

console.log(`Packages (by project_id): ${pkgCount}`)
if (pkgCount > 0) {
  console.log(`  Sample: ${packages.slice(0, 3).map(p => p.name).join(', ')}`)
}

console.log(`\n📈 Total Demo Data: ${compCount} components, ${drawCount} drawings, ${pkgCount} packages`)
console.log(`Expected: 200 components, 20 drawings, 10 packages`)

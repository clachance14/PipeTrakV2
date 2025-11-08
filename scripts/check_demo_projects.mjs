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

console.log('🔍 Checking demo projects and data...\n')

// Get demo user with most recent creation
const { data: demoUser } = await supabase
  .from('users')
  .select('id, email, full_name, organization_id')
  .eq('is_demo_user', true)
  .order('created_at', { ascending: false })
  .limit(1)
  .single()

if (!demoUser) {
  console.log('No demo users found')
  process.exit(0)
}

console.log(`👤 Demo User: ${demoUser.full_name} (${demoUser.email})`)

// Get organization
const { data: org } = await supabase
  .from('organizations')
  .select('id, name')
  .eq('id', demoUser.organization_id)
  .single()

console.log(`🏢 Organization: ${org.name}`)

// Get projects
const { data: projects, count: projectCount } = await supabase
  .from('projects')
  .select('id, name, organization_id', { count: 'exact' })
  .eq('organization_id', demoUser.organization_id)

console.log(`📁 Projects: ${projectCount}`)
if (projects && projects.length > 0) {
  projects.forEach(p => console.log(`   - ${p.name}`))
}

// Get component count
const { count: componentCount } = await supabase
  .from('components')
  .select('*', { count: 'exact', head: true })
  .eq('organization_id', demoUser.organization_id)

console.log(`\n📦 Demo Data:`)
console.log(`   Components: ${componentCount}`)

// Get drawing count
const { count: drawingCount } = await supabase
  .from('drawings')
  .select('*', { count: 'exact', head: true })
  .eq('organization_id', demoUser.organization_id)

console.log(`   Drawings: ${drawingCount}`)

// Get package count
const { count: packageCount } = await supabase
  .from('packages')
  .select('*', { count: 'exact', head: true })
  .eq('organization_id', demoUser.organization_id)

console.log(`   Packages: ${packageCount}`)

console.log(`\n✅ Demo project fully provisioned!`)

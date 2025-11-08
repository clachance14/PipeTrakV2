// Check if newest demo user has data in the materialized view
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

// Get most recent demo user
const { data: demoUsers } = await supabase
  .from('users')
  .select('id, email, created_at, organization_id')
  .eq('is_demo_user', true)
  .order('created_at', { ascending: false })
  .limit(1)

if (!demoUsers || demoUsers.length === 0) {
  console.log('No demo users found')
  process.exit(0)
}

const user = demoUsers[0]
console.log(`Newest Demo User: ${user.email}`)
console.log(`Created: ${user.created_at}`)
console.log(`Org ID: ${user.organization_id}`)

// Get project
const { data: projects } = await supabase
  .from('projects')
  .select('id, name')
  .eq('organization_id', user.organization_id)

if (!projects || projects.length === 0) {
  console.log('No project found')
  process.exit(0)
}

const projectId = projects[0].id
console.log(`Project ID: ${projectId}`)

// Check materialized view for this project
console.log('\n=== Materialized View Data ===')
const { data: viewData, error: viewError } = await supabase
  .from('mv_drawing_progress')
  .select('*')
  .eq('project_id', projectId)

if (viewError) {
  console.error('Error:', viewError.message)
  process.exit(1)
}

if (!viewData || viewData.length === 0) {
  console.log('❌ NO DATA in mv_drawing_progress for this project!')
  console.log('\nThis is the issue - the view is empty after population.')
} else {
  console.log(`✅ Found ${viewData.length} rows in mv_drawing_progress`)
  console.log('\nSample rows:')
  viewData.slice(0, 3).forEach(row => {
    console.log(`  Drawing ${row.drawing_no_norm}: ${row.total_components} components, ${row.completed_components} completed`)
  })
}

// Also directly count components per drawing
console.log('\n=== Direct Component Count (bypassing view) ===')
const { data: drawings } = await supabase
  .from('drawings')
  .select('id, drawing_no_norm')
  .eq('project_id', projectId)
  .limit(5)

if (drawings) {
  for (const drawing of drawings) {
    const { count } = await supabase
      .from('components')
      .select('*', { count: 'exact', head: true })
      .eq('drawing_id', drawing.id)

    console.log(`  Drawing ${drawing.drawing_no_norm}: ${count} components (direct count)`)
  }
}

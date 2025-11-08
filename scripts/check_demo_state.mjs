// Check demo user state and database functions
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

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false, autoRefreshToken: false }
})

console.log('=== Checking Database Functions ===')

// Check if refresh_materialized_views function exists
const { data: functions, error: funcError } = await supabase
  .rpc('refresh_materialized_views')
  .then(
    () => ({ data: 'Function exists and executed', error: null }),
    (err) => ({ data: null, error: err })
  )

if (funcError) {
  console.error('❌ refresh_materialized_views function ERROR:', funcError.message)
} else {
  console.log('✅ refresh_materialized_views function exists and works')
}

console.log('\n=== Checking Recent Demo Users ===')

// Get most recent demo user
const { data: demoUsers, error: usersError } = await supabase
  .from('users')
  .select('id, email, created_at, organization_id, is_demo_user, demo_expires_at')
  .eq('is_demo_user', true)
  .order('created_at', { ascending: false })
  .limit(3)

if (usersError) {
  console.error('Error fetching demo users:', usersError)
  process.exit(1)
}

if (!demoUsers || demoUsers.length === 0) {
  console.log('No demo users found')
  process.exit(0)
}

console.log(`\nFound ${demoUsers.length} recent demo users:`)
demoUsers.forEach((user, i) => {
  console.log(`\n${i + 1}. ${user.email}`)
  console.log(`   Created: ${user.created_at}`)
  console.log(`   User ID: ${user.id}`)
  console.log(`   Org ID: ${user.organization_id}`)
})

// Check the most recent demo user's data
const mostRecentUser = demoUsers[0]
console.log(`\n=== Checking Data for Most Recent Demo User: ${mostRecentUser.email} ===`)

// Get project for this user's org
const { data: projects, error: projError } = await supabase
  .from('projects')
  .select('id, name')
  .eq('organization_id', mostRecentUser.organization_id)

if (projError) {
  console.error('Error fetching projects:', projError)
} else {
  console.log(`\nProjects: ${projects?.length || 0}`)
  if (projects && projects.length > 0) {
    const projectId = projects[0].id
    console.log(`Project ID: ${projectId}`)
    console.log(`Project Name: ${projects[0].name}`)

    // Check skeleton data
    const { data: areas } = await supabase.from('areas').select('id').eq('project_id', projectId)
    const { data: systems } = await supabase.from('systems').select('id').eq('project_id', projectId)
    const { data: packages } = await supabase.from('test_packages').select('id').eq('project_id', projectId)
    const { data: welders } = await supabase.from('welders').select('id').eq('project_id', projectId)

    console.log(`\nSkeleton Data:`)
    console.log(`  Areas: ${areas?.length || 0}`)
    console.log(`  Systems: ${systems?.length || 0}`)
    console.log(`  Test Packages: ${packages?.length || 0}`)
    console.log(`  Welders: ${welders?.length || 0}`)

    // Check populated data
    const { data: drawings } = await supabase.from('drawings').select('id').eq('project_id', projectId)
    const { data: components } = await supabase.from('components').select('id').eq('project_id', projectId)
    const { data: welds } = await supabase.from('field_welds').select('id').eq('project_id', projectId)

    console.log(`\nPopulated Data:`)
    console.log(`  Drawings: ${drawings?.length || 0}`)
    console.log(`  Components: ${components?.length || 0}`)
    console.log(`  Field Welds: ${welds?.length || 0}`)

    // Check materialized view
    const { data: viewData, error: viewError } = await supabase
      .from('mv_drawing_progress')
      .select('drawing_id, total_count')
      .eq('project_id', projectId)
      .limit(5)

    if (viewError) {
      console.error(`\n❌ Error querying mv_drawing_progress:`, viewError.message)
    } else {
      console.log(`\nMaterialized View (mv_drawing_progress): ${viewData?.length || 0} rows`)
      if (viewData && viewData.length > 0) {
        viewData.forEach(row => {
          console.log(`  Drawing ${row.drawing_id}: ${row.total_count} components`)
        })
      } else {
        console.log('  ⚠️  No rows in materialized view for this project!')
      }
    }
  }
}

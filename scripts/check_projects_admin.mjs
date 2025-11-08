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

// Service role bypasses RLS
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false, autoRefreshToken: false }
})

const { data, error } = await supabase
  .from('projects')
  .select('id, name')
  .limit(5)

if (error) {
  console.error('Error fetching projects:', error)
} else {
  console.log('Available projects (admin view):')
  console.log(data)
  if (data.length === 0) {
    console.log('\nNo projects in database. Creating test project...')

    // First get an organization
    const { data: orgs, error: orgError } = await supabase
      .from('organizations')
      .select('id, name')
      .limit(1)

    if (orgError) {
      console.error('Error fetching organizations:', orgError)
    } else if (orgs.length > 0) {
      console.log('Using organization:', orgs[0])

      // Create a test project
      const { data: newProject, error: createError } = await supabase
        .from('projects')
        .insert({
          name: 'Performance Test Project',
          organization_id: orgs[0].id
        })
        .select()
        .single()

      if (createError) {
        console.error('Error creating project:', createError)
      } else {
        console.log('Created test project:', newProject)
      }
    } else {
      console.log('No organizations found either.')
    }
  }
}
